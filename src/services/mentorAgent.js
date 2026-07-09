// ============================================================
// ORVAX — mentorAgent (cliente do assistente de IA nativo)
//
// Caminho principal: Edge Function `mentor-chat` (memória + 7 ações +
// persona, chave OpenAI no servidor). Fallback: modo client-side que
// TAMBÉM executa ações — registra transações, tarefas e notas direto
// pelo navegador (via os helpers do db.js, que respeitam o RLS do
// usuário logado e emitem os eventos que atualizam o Cofre/Agenda ao
// vivo). Assim o mentor "faz coisas" mesmo antes do deploy da função.
//
// A persona segue o mentor selecionado no Dossier (profiles.selected_mentor
// → mentor_personas), exatamente como o antigo agente do WhatsApp.
// ============================================================

import { supabase } from '../lib/supabase';
import {
  getSelectedMentor,
  createTask,
  createTransaction,
  createNote,
} from './db';
import { getMentorPersona } from './mentor';
import { llmChat, llmAvailable } from './llm';
import { toDbTxType } from '../lib/txType';
import { toLocalDateStr } from '../utils/dateUtils';

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

// ─── FERRAMENTAS (client-side) ──────────────────────────────────
// Espelham as ações da Edge Function que dependem apenas de tabelas
// com RLS de usuário (o cliente escreve com o próprio JWT). XP e
// telemetria ficam para o caminho servidor (service role) pra não
// depender de RPCs que podem não estar acessíveis pelo anon.
const CLIENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'add_transaction',
      description: 'Registrar uma transação financeira no Cofre/Capital (receita ou despesa). Use quando o usuário mencionar que ganhou, recebeu, gastou, pagou ou comprou algo — incluindo salário.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Descrição curta (ex: Salário, Mercado, Uber)' },
          amount: { type: 'number', description: 'Valor positivo em reais' },
          type: { type: 'string', enum: ['in', 'out'], description: "'in' para receita/ganho, 'out' para despesa/gasto" },
          category: { type: 'string', description: 'Moradia, Alimentação, Transporte, Lazer, Receita, Salário, Assinaturas, Saúde ou Outros' },
          date: { type: 'string', description: 'Data YYYY-MM-DD. Se o usuário não disser, use a data de hoje.' },
        },
        required: ['name', 'amount', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Criar uma tarefa/compromisso na Agenda. Use quando o usuário pedir para agendar, marcar ou lembrar de algo.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título da tarefa' },
          scheduled_date: { type: 'string', description: 'Data YYYY-MM-DD. Se não dito, use hoje.' },
          time_start: { type: 'string', description: 'Horário HH:MM (24h). Se não dito, use 09:00.' },
          category: { type: 'string', enum: ['FOCO', 'TREINO', 'ESTUDO', 'TRABALHO', 'PESSOAL', 'SAÚDE', 'SOCIAL'] },
          duration: { type: 'string', description: 'Duração (ex: 1h, 30min)' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_note',
      description: 'Salvar uma anotação nas Notas do Cofre. Use quando o usuário pedir para anotar, guardar ou registrar uma ideia/informação.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Conteúdo da nota' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_today_summary',
      description: 'Buscar o resumo do dia do usuário: XP, streak e tarefas de hoje. Use quando ele perguntar sobre o progresso/status/dia.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

async function buildTodaySummary(userId) {
  const today = toLocalDateStr();
  const [{ data: profile }, { data: tasks }] = await Promise.all([
    supabase.from('profiles').select('xp, streak_days').eq('id', userId).maybeSingle(),
    supabase.from('tasks').select('title, time_start, state, category').eq('user_id', userId).eq('scheduled_date', today),
  ]);
  const all = tasks || [];
  const pending = all.filter(t => t.state === 'pending' || t.state === 'active');
  const done = all.filter(t => t.state === 'completed' || t.state === 'done');
  let s = `RESUMO DE HOJE (${today}): XP ${profile?.xp ?? 0}, streak ${profile?.streak_days ?? 0} dias, ${done.length} feita(s) / ${pending.length} pendente(s).`;
  if (pending.length) s += ' Pendentes: ' + pending.map(t => `${t.time_start || ''} ${t.title}`).join('; ') + '.';
  return s;
}

async function executeClientTool(name, args, userId) {
  try {
    switch (name) {
      case 'add_transaction': {
        const res = await createTransaction({
          description: args.name,
          amount: Math.abs(Number(args.amount)) || 0,
          type: toDbTxType(args.type),
          category: args.category || (toDbTxType(args.type) === 'in' ? 'Receita' : 'Outros'),
          date: args.date || toLocalDateStr(),
        });
        if (res?.error) throw res.error;
        return `Transação "${args.name}" de R$${Math.abs(Number(args.amount))} registrada como ${toDbTxType(args.type) === 'in' ? 'receita' : 'despesa'}.`;
      }
      case 'create_task': {
        // Normaliza data/hora: o modelo às vezes devolve texto livre
        // ("11 horas", "amanhã") em vez de YYYY-MM-DD / HH:MM.
        const dateMatch = String(args.scheduled_date || '').match(/\d{4}-\d{2}-\d{2}/);
        const scheduled_date = dateMatch ? dateMatch[0] : toLocalDateStr();
        const timeMatch = String(args.time_start || '').match(/(\d{1,2}):(\d{2})/);
        const time_start = timeMatch
          ? `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`
          : '09:00';
        const res = await createTask({
          title: args.title,
          scheduled_date,
          time_start,
          category: args.category || 'PESSOAL',
          duration: args.duration || '1h',
          state: 'pending',
        });
        if (res?.error) throw res.error;
        return `Tarefa "${args.title}" criada para ${scheduled_date} às ${time_start}.`;
      }
      case 'add_note': {
        const res = await createNote({ content: args.text });
        if (res?.error) throw res.error;
        return 'Nota salva no Cofre.';
      }
      case 'get_today_summary':
        return await buildTodaySummary(userId);
      default:
        return `Ação desconhecida: ${name}`;
    }
  } catch (error) {
    console.error(`[mentorAgent] tool ${name} falhou:`, error);
    return `Não consegui executar "${name}": ${error?.message || 'erro desconhecido'}.`;
  }
}

// ─── FALLBACK: conversa + ações direto na IA (Gemini/OpenAI) ────
async function chatClientSide(text, history, mentorId, userId) {
  if (!llmAvailable()) {
    throw new Error('Assistente indisponível: defina VITE_GEMINI_API_KEY no .env (grátis em aistudio.google.com) ou publique a Edge Function "mentor-chat".');
  }

  const persona = await getMentorPersona(mentorId);
  const basePrompt = persona?.system_prompt
    || 'Você é o Mentor Interior do sistema ORVAX. Tom direto, em português BR, conciso. NUNCA quebre o personagem.';

  // Contexto do usuário (best-effort) pra IA "conhecer" o progresso
  let ctx = '';
  try { ctx = `\n\n${await buildTodaySummary(userId)}`; } catch (_) { /* opcional */ }

  const now = new Date();
  const dateCtx = `\n\nAgora: ${now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Data de hoje (use quando não for informada): ${toLocalDateStr()}.`;

  const systemPrompt = basePrompt + dateCtx + ctx +
    '\n\nVocê PODE agir no aplicativo através das ferramentas disponíveis: registrar transações no Cofre (receitas e despesas, inclusive salário), criar tarefas na Agenda e salvar notas. ' +
    'Sempre que o usuário pedir ou relatar algo registrável (ex: "meu salário entrou", "gastei 50 no mercado", "marca academia amanhã 7h", "anota tal ideia"), CHAME a ferramenta apropriada em vez de dizer que não consegue. ' +
    'Se faltar um dado obrigatório e você conseguir inferir com segurança, infira (data → hoje; tipo → receita/despesa pelo contexto); só pergunte se for realmente ambíguo. ' +
    'Depois de executar, confirme de forma curta e natural, no seu tom.';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-20),
    { role: 'user', content: text },
  ];

  // 1º passo: deixa o modelo decidir se usa ferramenta
  const first = await llmChat({
    messages, tools: CLIENT_TOOLS, tool_choice: 'auto',
    max_tokens: 900, temperature: 0.7,
  });
  const choice = first?.choices?.[0]?.message;
  if (!choice) throw new Error('A IA retornou resposta vazia.');

  // Sem ferramenta → resposta direta
  if (!choice.tool_calls?.length) {
    const reply = choice.content;
    if (!reply) throw new Error('A IA retornou resposta vazia.');
    return { reply, acted: false };
  }

  // 2º passo: executa as ferramentas e pede a resposta final
  const toolResults = [];
  for (const tc of choice.tool_calls) {
    let fnArgs = {};
    try { fnArgs = JSON.parse(tc.function.arguments || '{}'); } catch (_) { /* args vazios */ }
    const result = await executeClientTool(tc.function.name, fnArgs, userId);
    toolResults.push({ role: 'tool', tool_call_id: tc.id, content: result });
  }

  const followUp = await llmChat({
    messages: [...messages, choice, ...toolResults],
    max_tokens: 900, temperature: 0.7,
  });
  const reply = followUp?.choices?.[0]?.message?.content || 'Feito.';
  return { reply, acted: true };
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

  // 1. Caminho principal: Edge Function (memória + ações no servidor)
  try {
    const { data, error } = await supabase.functions.invoke('mentor-chat', { body: { message: clean } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (data?.reply) return { reply: data.reply, mode: 'agent' };
    throw new Error('Resposta vazia da função.');
  } catch (edgeErr) {
    console.info('[mentorAgent] Edge mentor-chat indisponível, usando modo client-side:', edgeErr?.message || edgeErr);
  }

  // 2. Fallback client-side (também age; persiste o histórico aqui pois o servidor não rodou)
  const mentorId = await getSelectedMentor();
  const { reply, acted } = await chatClientSide(clean, history, mentorId, userId);
  await saveTurn(userId, 'user', clean);
  await saveTurn(userId, 'assistant', reply);
  return { reply, mode: acted ? 'client-action' : 'client-chat' };
}
