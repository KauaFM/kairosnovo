// ============================================================
// ORVAX — Ritual "Registrar Dia" client (Protocolo VERITAS · F3)
//
// A nota do dia é CALCULADA pela RPC veritas_submit_review
// (server-side, a partir do ledger xp_events). O XP do ritual
// sai do xp-engine (source_type='ritual'), 1×/dia.
// Docs: docs/GDD_SISTEMA_EVOLUCAO.md §4.
// ============================================================
import { supabase } from '../lib/supabase';

/** Dia VERITAS no cliente (vira às 03:00 — espelha veritas_today()). */
export function veritasDayStr() {
  const d = new Date(Date.now() - 3 * 3600_000); // 3h de "tolerância de madrugada"
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Review de hoje (se existir) — para saber se o ritual já foi feito. */
export async function getTodayReview() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('daily_reviews')
    .select('day, computed_score, ritual_streak, xp_awarded, completed, tomorrow_intent')
    .eq('user_id', user.id).eq('day', veritasDayStr()).maybeSingle();
  return data || null;
}

/** Dados da Retrospectiva (Ato I) — tudo de fontes só-servidor. */
export async function getRetroData() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { actions: 0, xpToday: 0, focusMin: 0, streak: 0 };
  const dayStart = new Date();
  dayStart.setHours(3, 0, 0, 0); // dia VERITAS começa às 03:00 locais (SP)
  if (Date.now() < dayStart.getTime()) dayStart.setDate(dayStart.getDate() - 1);
  const iso = dayStart.toISOString();

  const [ev, foc, prof] = await Promise.all([
    supabase.from('xp_events').select('xp_final, source_type')
      .eq('user_id', user.id).gte('created_at', iso),
    supabase.from('veritas_focus').select('seconds')
      .eq('user_id', user.id).eq('status', 'ended').gte('created_at', iso),
    supabase.from('profiles').select('streak_days').eq('id', user.id).maybeSingle(),
  ]);
  const events = ev.data || [];
  const doneKinds = new Set(['task', 'habit', 'event', 'meeting', 'reminder', 'payment']);
  return {
    actions: events.filter((e) => doneKinds.has(e.source_type)).length,
    xpToday: events.reduce((s, e) => s + (e.xp_final || 0), 0),
    focusMin: Math.round((foc.data || []).reduce((s, f) => s + (f.seconds || 0), 0) / 60),
    streak: prof.data?.streak_days || 0,
  };
}

/**
 * Ato V — envia os atos e recebe a nota calculada no servidor.
 * @returns {Promise<{day:string,score:number,streak:number,actions:number,dims:number,parts:Object}|null>}
 */
export async function submitReview({
  energy, emotions, sleepH, sleepQ,
  victory, challenge, learning, gratitude,
  selfScore, acts, reconciled,
}) {
  const { data, error } = await supabase.rpc('veritas_submit_review', {
    p_energy: energy ?? null,
    p_emotions: emotions?.length ? emotions : null,
    p_sleep_h: sleepH ?? null,
    p_sleep_q: sleepQ ?? null,
    p_victory: victory || null,
    p_challenge: challenge || null,
    p_learning: learning || null,
    p_gratitude: gratitude || null,
    p_self_score: selfScore ?? null,
    p_acts: acts ?? 0,
    p_reconciled: reconciled ?? null,
  });
  if (error) throw error;
  return data;
}

/** Ato VI — intenção de implementação pra amanhã. */
export async function setTomorrowIntent(text) {
  const { error } = await supabase.rpc('veritas_set_tomorrow', { p_intent: text || '' });
  if (error) throw error;
}
