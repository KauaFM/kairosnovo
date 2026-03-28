import { supabase } from '../../../lib/supabase';

import { toLocalDateStr } from '../../../utils/dateUtils';

export async function updateStreak(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_days, last_log_date, total_points')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return null;

  const today = toLocalDateStr();
  const yesterday = toLocalDateStr(new Date(Date.now() - 86400000));

  if (profile.last_log_date === today) return { newStreak: profile.streak_days, pointsEarned: 0 };

  const isConsecutive = profile.last_log_date === yesterday;
  const newStreak = isConsecutive ? profile.streak_days + 1 : 1;
  const pointsEarned = newStreak >= 7 ? 20 : 10;

  await supabase.from('profiles').update({
    streak_days: newStreak,
    last_log_date: today,
    total_points: (profile.total_points || 0) + pointsEarned,
  }).eq('id', userId);

  return { newStreak, pointsEarned };
}

export async function getStreakInfo(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('streak_days, last_log_date, total_points')
    .eq('id', userId)
    .maybeSingle();
  return data;
}
