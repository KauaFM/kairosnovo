// ============================================================
// ORVAX FitCal — VITALIS client (agente nutricional · v3)
//
// v2 era um chat: ele sugeria, você tocava pra registrar.
// v3 é um agente com ferramentas: ele MONTA o plano, REGISTRA
// o que você comeu, TROCA refeição e AJUSTA metas. O front só
// manda o comando e redesenha o estado que o servidor devolve.
// O front nunca fala com o LLM — tudo pela Edge Function.
// ============================================================
import { supabase } from '../../../lib/supabase';
import { functionErrorMessage } from '../../../lib/fnError';
import { logFromAI } from './foodServiceV2';

/** Ações de 1 toque (o momento de decisão é sob pressão, não se digita). */
export const QUICK_ACTIONS = [
  { key: 'plan',   icon: '📋', label: 'Montar meu dia', command: 'Monta meu plano alimentar de hoje.', tool: 'montar_plano_do_dia' },
  { key: 'street', icon: '🚶', label: 'Tô na rua',      command: 'Estou na rua e preciso comer algo agora. Quais as melhores opções em padaria, lanchonete ou mercado?' },
  { key: 'dinner', icon: '🌙', label: 'O que jantar?',  command: 'O que eu faço de janta que encaixe no que ainda falta hoje?' },
  { key: 'market', icon: '🛒', label: 'Lista de compras', command: 'Monta minha lista de compras da semana.', tool: 'montar_lista_compras' },
];

export const SLOT_LABEL = {
  breakfast: 'Café da manhã',
  lunch: 'Almoço',
  snack: 'Lanche',
  dinner: 'Jantar',
};
export const SLOT_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];

async function unwrap(error, data) {
  if (error) {
    // Erros de negócio (ex.: 429 do rate limit) vêm no CORPO da resposta —
    // `error.message` é sempre o texto genérico do supabase-js.
    throw new Error(await functionErrorMessage(error, 'Falha ao falar com o VITALIS.'));
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Estado do painel: metas, consumo, plano de hoje e o que o agente fez. */
export async function getVitalisState() {
  const { data, error } = await supabase.functions.invoke('nutri-coach', { body: { mode: 'state' } });
  return unwrap(error, data);
}

/**
 * Manda um comando pro VITALIS. Ele decide a ferramenta e o SERVIDOR executa.
 * @param {string} command texto livre ("comi um x-tudo", "troca a janta")
 * @param {string|null} forceTool força uma ferramenta (usado pelos botões)
 * @returns {Promise<{reply:string, executed:Array, state:object}>}
 */
export async function sendCommand(command, forceTool = null) {
  const { data, error } = await supabase.functions.invoke('nutri-coach', {
    body: { command, force_tool: forceTool || undefined },
  });
  return unwrap(error, data);
}

// A RPC log_food_from_ai rejeita grams <= 0 ("grams must be > 0"). O plano e
// as favoritas guardam medida caseira, não peso — então entra um valor de
// referência. Passar 0 aqui fazia o registro de 1 toque falhar silenciosamente.
const FALLBACK_GRAMS = 100;

/** Marca um item do plano como comido e joga no diário (1 toque). */
export async function eatPlanItem(item) {
  await logFromAI({
    name: item.portion ? `${item.name} (${item.portion})` : item.name,
    mealType: item.slot,
    grams: FALLBACK_GRAMS,
    calories: item.kcal,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    confidence: 0.8,
  });
  const { error } = await supabase.from('meal_plan_items')
    .update({ status: 'eaten', eaten_at: new Date().toISOString() })
    .eq('id', item.id);
  if (error) throw error;
}

/** Descarta um item planejado (não vou comer isso). */
export async function skipPlanItem(itemId) {
  const { error } = await supabase.from('meal_plan_items')
    .update({ status: 'skipped' }).eq('id', itemId);
  if (error) throw error;
}

/** Refeição provável pelo horário (pré-seleciona ao registrar). */
export function guessMealType(date = new Date()) {
  const h = date.getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}

/* ── N3 · Biblioteca de refeições que funcionam ───────────── */

/** Salva uma refeição para reusar depois (do VITALIS ou manual). */
export async function saveFavorite(opt, source = 'vitalis') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão expirada.');
  const { error } = await supabase.from('favorite_meals').insert({
    user_id: session.user.id,
    name: opt.name,
    portion: opt.portion || null,
    kcal: opt.kcal || 0,
    protein_g: opt.protein_g || 0,
    carbs_g: opt.carbs_g || 0,
    fat_g: opt.fat_g || 0,
    meal_type: opt.slot || opt.meal_type || guessMealType(),
    source,
  });
  if (error) throw error;
}

/** As refeições mais usadas primeiro (é o que a pessoa repete). */
export async function listFavorites(limit = 12) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data } = await supabase
    .from('favorite_meals')
    .select('*')
    .eq('user_id', session.user.id)
    .order('times_used', { ascending: false })
    .order('last_used_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  return data || [];
}

/** Registra uma favorita no diário (1 toque) e conta o uso. */
export async function logFavorite(fav, mealType = null) {
  await logFromAI({
    name: fav.name,
    mealType: mealType || fav.meal_type || guessMealType(),
    grams: FALLBACK_GRAMS,
    calories: fav.kcal,
    protein_g: fav.protein_g,
    carbs_g: fav.carbs_g,
    fat_g: fav.fat_g,
    confidence: 0.8,
  });
  await supabase.from('favorite_meals')
    .update({ times_used: (fav.times_used || 0) + 1, last_used_at: new Date().toISOString() })
    .eq('id', fav.id);
}

export async function deleteFavorite(id) {
  await supabase.from('favorite_meals').delete().eq('id', id);
}

/* ── N4 · Fechar o dia (XP validado no servidor) ──────────── */

/**
 * Fecha o dia nutricional. O SERVIDOR recalcula tudo de food_logs vs
 * metas — o cliente não envia números. 1×/dia.
 * @returns { xp, onTarget, proteinHit, kcal, protein, meals, goal, already }
 */
export async function closeNutritionDay() {
  const { data, error } = await supabase.functions.invoke('xp-engine', {
    body: { source_type: 'nutrition_day' },
  });
  if (error) {
    throw new Error(await functionErrorMessage(error, 'Falha ao fechar o dia.'));
  }
  if (data?.error) throw new Error(data.error);
  if (data?.xp > 0) {
    window.dispatchEvent(new CustomEvent('orvax:xp-gain', {
      detail: { amount: data.xp, reason: 'nutrition_day', total: data.total },
    }));
  }
  return data;
}
