import { supabase } from '../../../lib/supabase';

export async function sendMessage(challengeId, userId, body) {
  const { error } = await supabase
    .from('messages')
    .insert({ challenge_id: challengeId, user_id: userId, body });
  if (error) throw error;
}

export async function getMessages(challengeId, limit = 50) {
  const { data } = await supabase
    .from('messages')
    .select('*, profiles(username, avatar_url)')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data?.reverse() ?? [];
}

export function subscribeToChat(challengeId, onMessage) {
  return supabase
    .channel(`chat:${challengeId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `challenge_id=eq.${challengeId}`,
      },
      async (payload) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', payload.new.user_id)
          .single();
        onMessage({ ...payload.new, profiles: profile });
      }
    )
    .subscribe();
}
