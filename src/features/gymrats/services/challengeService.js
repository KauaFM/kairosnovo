import { supabase } from '../../../lib/supabase';
import { generateCode } from '../utils/formatters';

export async function createChallenge(data, userId) {
  const code = generateCode();
  const { data: challenge, error } = await supabase
    .from('challenges')
    .insert({ ...data, owner_id: userId, code })
    .select()
    .single();
  if (error) throw error;

  await supabase.from('challenge_members').insert({
    challenge_id: challenge.id,
    user_id: userId,
    role: 'admin',
  });
  return challenge;
}

export async function joinChallenge(code, userId) {
  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, max_participants')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (!challenge) throw new Error('Desafio nao encontrado');

  if (challenge.max_participants) {
    const { count } = await supabase
      .from('challenge_members')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', challenge.id);
    if (count >= challenge.max_participants) throw new Error('Desafio lotado');
  }

  const { error } = await supabase.from('challenge_members').insert({
    challenge_id: challenge.id,
    user_id: userId,
  });
  if (error?.code === '23505') throw new Error('Voce ja esta neste desafio');
  if (error) throw error;
  return challenge;
}

export async function getMyChallenges(userId) {
  const { data } = await supabase
    .from('challenge_members')
    .select(`
      role,
      challenges (
        id, name, description, code, starts_at, ends_at,
        is_active, scoring_type, allow_teams, owner_id,
        challenge_members(count)
      )
    `)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });
  return data?.map((m) => ({ ...m.challenges, myRole: m.role })) ?? [];
}

export async function getChallengeDetail(challengeId) {
  const { data } = await supabase
    .from('challenges')
    .select(`
      *,
      challenge_members(count)
    `)
    .eq('id', challengeId)
    .single();
  return data;
}

export async function getChallengeMembers(challengeId) {
  const { data } = await supabase
    .from('challenge_members')
    .select(`
      *,
      profiles(id, username, avatar_url)
    `)
    .eq('challenge_id', challengeId);
  return data ?? [];
}

export async function createTeam(challengeId, name, color, userId) {
  const { data } = await supabase
    .from('teams')
    .insert({ challenge_id: challengeId, name, color, created_by: userId })
    .select()
    .single();
  return data;
}

export async function joinTeam(challengeId, teamId, userId) {
  await supabase
    .from('challenge_members')
    .update({ team_id: teamId })
    .eq('challenge_id', challengeId)
    .eq('user_id', userId);
}

export async function getTeams(challengeId) {
  const { data } = await supabase
    .from('teams')
    .select('*')
    .eq('challenge_id', challengeId);
  return data ?? [];
}
