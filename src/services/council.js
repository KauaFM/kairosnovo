// ============================================================
// ORVAX — Conselho de IAs client (Protocolo VERITAS · F5)
//
// Lê os insights da semana em ai_insights; se ainda não existem,
// pede à Edge Function dimension-coach pra gerar (1 lote/semana,
// idempotente no servidor). O front nunca fala com o LLM direto.
// ============================================================
import { supabase } from '../lib/supabase';

/** Segunda-feira da semana corrente (mesma âncora do servidor). */
export function weekStartStr() {
  const now = new Date(Date.now() - 3 * 3600_000);
  const dow = (now.getDay() + 6) % 7; // 0 = segunda
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
  const y = monday.getFullYear(), m = String(monday.getMonth() + 1).padStart(2, '0'), d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Insights da semana (gera se necessário).
 * @returns {Promise<Array<{dimension,specialist,kind,title,body,data_ref}>>}
 */
export async function getWeeklyCouncil() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const week = weekStartStr();

  const { data: existing } = await supabase.from('ai_insights')
    .select('dimension, specialist, kind, title, body, data_ref')
    .eq('user_id', user.id).eq('week', week).order('id');
  if (existing && existing.length) return existing;

  try {
    const { data, error } = await supabase.functions.invoke('dimension-coach', { body: {} });
    if (error) throw error;
    return data?.items || [];
  } catch (e) {
    console.warn('[council] dimension-coach falhou:', e?.message || e);
    return [];
  }
}
