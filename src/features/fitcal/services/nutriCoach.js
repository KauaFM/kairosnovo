// ============================================================
// ORVAX FitCal — VITALIS client (copiloto nutricional · N2)
// O front nunca fala com o LLM: tudo pela Edge Function nutri-coach.
// ============================================================
import { supabase } from '../../../lib/supabase';
import { logFromAI } from './foodServiceV2';

/** Atalhos sem digitação (o momento de decisão é sob pressão). */
export const QUICK_PROMPTS = [
  { key: 'hungry', icon: '🍽', label: 'Estou com fome', text: 'Estou com fome agora. O que eu como?', context: 'fome' },
  { key: 'street', icon: '🚶', label: 'Estou na rua', text: 'Estou na rua e preciso comer algo. Quais as melhores opções perto (padaria, lanchonete, mercado)?', context: 'na_rua' },
  { key: 'offplan', icon: '🍕', label: 'Comi fora do plano', text: 'Comi além do que planejei hoje. Como sigo o resto do dia?', context: 'fora_do_plano' },
  { key: 'status', icon: '📊', label: 'Como tô hoje?', text: 'Como está meu dia até agora? O que ainda falta bater?', context: 'status' },
  { key: 'dinner', icon: '🌙', label: 'O que jantar?', text: 'O que eu faço de janta que encaixe no que falta hoje?', context: 'jantar' },
  { key: 'market', icon: '🛒', label: 'Lista de compras', text: 'Me dá uma lista curta de compras que facilite bater minhas metas nessa semana.', context: 'compras' },
];

/** Pergunta ao VITALIS. @returns { reply, options[], avoid, suggestion_ids[], remaining } */
export async function askVitalis(message, context = null) {
  const { data, error } = await supabase.functions.invoke('nutri-coach', {
    body: { message, context },
  });
  if (error) {
    // Erros de negócio vêm no corpo (ex.: 429 do rate limit)
    const msg = error?.context?.body?.error || error.message || 'Falha ao falar com o VITALIS.';
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Histórico da conversa (últimas mensagens). */
export async function getVitalisHistory(limit = 20) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data } = await supabase
    .from('nutri_messages')
    .select('role, content, payload, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []).reverse();
}

/**
 * Registra uma sugestão do VITALIS no diário (1 toque) e marca
 * a sugestão como aceita — é isso que mede a aderência real.
 */
export async function acceptSuggestion(option, mealType = 'snack', suggestionId = null) {
  await logFromAI({
    name: option.name,
    mealType,
    grams: 0,                    // sugestão vem em medida caseira, não em gramas
    calories: option.kcal,
    protein_g: option.protein_g,
    carbs_g: option.carbs_g,
    fat_g: option.fat_g,
    confidence: 0.7,             // estimativa da IA
  });
  if (suggestionId) {
    await supabase.from('meal_suggestions')
      .update({ accepted: true, accepted_at: new Date().toISOString() })
      .eq('id', suggestionId)
      .catch(() => { /* métrica é best-effort */ });
  }
}

/** Refeição provável pelo horário (pré-seleciona ao registrar). */
export function guessMealType(date = new Date()) {
  const h = date.getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}
