import { supabase } from '../../../lib/supabase';

import { toLocalDateStr } from '../../../utils/dateUtils';

export async function logWeight(userId, weightKg) {
  const today = toLocalDateStr();
  const { data, error } = await supabase.from('weight_logs').upsert(
    { user_id: userId, weight_kg: weightKg, log_date: today },
    { onConflict: 'user_id,log_date' }
  ).select().single();
  if (error) throw error;
  return data;
}

export async function getWeightHistory(userId, days = 30) {
  const since = toLocalDateStr(new Date(Date.now() - days * 86400000));
  const { data } = await supabase
    .from('weight_logs')
    .select('weight_kg, log_date')
    .eq('user_id', userId)
    .gte('log_date', since)
    .order('log_date', { ascending: true });
  return data ?? [];
}

export async function getLatestWeight(userId) {
  const { data } = await supabase
    .from('weight_logs')
    .select('weight_kg, log_date')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// --- WATER ---
export async function addWater(userId, amountMl = 250) {
  const today = toLocalDateStr();
  const { error } = await supabase.from('water_logs').insert({
    user_id: userId,
    amount_ml: amountMl,
    log_date: today,
  });
  if (error) throw error;
}

export async function getDailyWater(userId) {
  const today = toLocalDateStr();
  const { data } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('user_id', userId)
    .eq('log_date', today);
  return data?.reduce((sum, w) => sum + w.amount_ml, 0) ?? 0;
}

export async function deleteLastWater(userId) {
  const today = toLocalDateStr();
  const { data } = await supabase
    .from('water_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('log_date', today)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return;
  await supabase.from('water_logs').delete().eq('id', data.id);
}

// --- ACTIVITY ---
export async function logActivity(userId, activityData) {
  const { data, error } = await supabase.from('activity_logs').insert({
    user_id: userId,
    log_date: toLocalDateStr(),
    ...activityData,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getDailyActivities(userId) {
  const today = toLocalDateStr();
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', today);
  return data ?? [];
}
