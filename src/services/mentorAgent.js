// ============================================================
// ORVAX — mentorAgent (cliente do assistente de IA nativo)
//
// Caminho principal: Edge Function `mentor-chat` (memória + 7 ações +
// persona, chave OpenAI no servidor). Fallback: modo conversa direto
// no navegador (persona + memória, sem ações de escrita no banco) —
// garante que o chat funcione mesmo antes do deploy da função.
//
// A persona segue o mentor selecionado no Dossier (profiles.selected_mentor
// → mentor_personas), exatamente como o antigo agente do WhatsApp.
// ============================================================

import { supabase } from '../lib/supabase';
import { getSelectedMentor } from './db';
import { getMentorPersona } from './mentor';

const APP_CHANNEL = 'app';

// ─── HISTÓRICO (compartilhado app ↔ WhatsApp, por user_id) ──────
export async function getMentorHistory(limit = 50) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data, error } = await supabase
    .from('conversation_history')
    .select('role, content, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.warn('[mentorAgent] histórico falhou:', error.message); return []; }
  return (data || []).reverse().map(m => ({ role: m.role, content: m.content }));
}

async function saveTurn(userId, role, content) {
  try {
    await supabase.from('conversation_history').insert({
      user_id: userId, user_phone: APP_CHANNEL, role, content, message_type: 'text',
    });
  } catch (e) { console.warn('[mentorAgent] saveTurn falhou:', e?.message); }
}

// ─── FALLBACK: conversa direto na OpenAI (sem ações) ────────────
async function chatClientSide(text, history, mentorId, userId) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Assistente indisponível: publique a Edge Function "mentor-chat" ou defina VITE_OPENAI_API_KEY.');
  }

  const persona = await getMentorPersona(mentorId);
  const basePrompt = persona?.system_prompt
    || 'Você é o Mentor Interior do sistema ORVAX. Tom direto, em português BR, conciso. NUNCA quebre o personagem.';

  // Contexto leve do usuário (best-effort) pra IA "conhecer" o progresso
  let ctx = '';
  try {
    const today = new Date().toISOString().split('T')[0];
    const [{ data: profile }, { data: tasks }] = await Promise.all([
      supabase.from('profiles').select('xp, streak_days').eq('id', userId).maybeSingle(),
      supabase.from('tasks').select('state').eq('user_id', userId).eq('scheduled_date', today),
    ]);
    const pending = (tasks || []).filter(t => t.state === 'pending' || t.state === 'active').length;
    ctx = `\n\nCONTEXTO: XP ${profile?.xp ?? 0}, streak ${profile?.streak_days ?? 0} dias, ${pending} tarefa(s) pendente(s) hoje (${today}).`;
  } catch (_) { /* opcional */ }

  const now = new Date();
  const dateCtx = `\n\nAgora: ${now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
  const systemPrompt = basePrompt + dateCtx + ctx
    + '\n\n(Modo conversa: você ainda não consegue gravar tarefas/XP automaticamente — oriente o usuário a registrar pelo app quando fizer sentido.)';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-20),
    { role: 'user', content: text },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 900, temperature: 0.7 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI ${res.status}`);
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error('A IA retornou resposta vazia.');
  return reply;
}

/**
 * Envia uma mensagem ao mentor e devolve { reply, mode }.
 * `history` = mensagens já exibidas no chat ([{role, content}]).
 */
export async function sendMentorMessage(text, history = []) {
  const clean = (text || '').trim();
  if (!clean) throw new Error('Mensagem vazia.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão expirada. Faça login novamente.');
  const userId = session.user.id;

  // 1. Caminho principal: Edge Function (faz memória + ações no servidor)
  try {
    const { data, error } = await supabase.functions.invoke('mentor-chat', { body: { message: clean } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (data?.reply) return { reply: data.reply, mode: 'agent' };
    throw new Error('Resposta vazia da função.');
  } catch (edgeErr) {
    console.info('[mentorAgent] Edge mentor-chat indisponível, usando modo conversa:', edgeErr?.message || edgeErr);
  }

  // 2. Fallback client-side (persiste o histórico aqui, pois o servidor não rodou)
  const mentorId = await getSelectedMentor();
  const reply = await chatClientSide(clean, history, mentorId, userId);
  await saveTurn(userId, 'user', clean);
  await saveTurn(userId, 'assistant', reply);
  return { reply, mode: 'chat' };
}
