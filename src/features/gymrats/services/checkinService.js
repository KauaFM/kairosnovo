import { supabase } from '../../../lib/supabase';
import { calculatePoints } from '../utils/scoring';

export async function uploadWorkoutPhoto(file, userId) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('workout-media')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('workout-media').getPublicUrl(path);
  return data.publicUrl;
}

export async function checkIn(challengeId, userId, workoutData, scoringType, scoringConfig, file) {
  let photo_url = null;
  if (file) photo_url = await uploadWorkoutPhoto(file, userId);

  const points = calculatePoints(workoutData, scoringType, scoringConfig);

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      challenge_id: challengeId,
      user_id: userId,
      photo_url,
      points,
      ...workoutData,
    })
    .select(`*, profiles(username, avatar_url)`)
    .single();
  if (error) throw error;
  return data;
}

export async function getWorkouts(challengeId, limit = 30) {
  const { data } = await supabase
    .from('workouts')
    .select(`*, profiles(username, avatar_url)`)
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function deleteWorkout(workoutId) {
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
  if (error) throw error;
}

export function subscribeToFeed(challengeId, onInsert) {
  return supabase
    .channel(`feed:${challengeId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'workouts',
        filter: `challenge_id=eq.${challengeId}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
}

export async function toggleReaction(workoutId, userId, emoji = '👍') {
  const { data: existing } = await supabase
    .from('workout_reactions')
    .select('id')
    .eq('workout_id', workoutId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('workout_reactions').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('workout_reactions').insert({ workout_id: workoutId, user_id: userId, emoji });
    return true;
  }
}

export async function getReactions(workoutId) {
  const { data } = await supabase
    .from('workout_reactions')
    .select('*, profiles(username)')
    .eq('workout_id', workoutId);
  return data ?? [];
}

export async function addComment(workoutId, userId, body) {
  const { data } = await supabase
    .from('workout_comments')
    .insert({ workout_id: workoutId, user_id: userId, body })
    .select('*, profiles(username, avatar_url)')
    .single();
  return data;
}

export async function getComments(workoutId) {
  const { data } = await supabase
    .from('workout_comments')
    .select('*, profiles(username, avatar_url)')
    .eq('workout_id', workoutId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function getLeaderboard(challengeId) {
  const { data } = await supabase
    .from('workouts')
    .select(`user_id, points, profiles!inner(username, avatar_url)`)
    .eq('challenge_id', challengeId);

  const leaderboard = {};
  data?.forEach((w) => {
    if (!leaderboard[w.user_id]) {
      leaderboard[w.user_id] = {
        userId: w.user_id,
        username: w.profiles.username,
        avatar: w.profiles.avatar_url,
        points: 0,
        workouts: 0,
      };
    }
    leaderboard[w.user_id].points += Number(w.points);
    leaderboard[w.user_id].workouts += 1;
  });

  return Object.values(leaderboard)
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function getWorkoutHistory(userId, limit = 20, offset = 0) {
  const { data } = await supabase
    .from('workouts')
    .select('*, challenges(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  return data ?? [];
}
