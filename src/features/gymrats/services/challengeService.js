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

  // O erro deste insert era IGNORADO — e é o insert mais importante
  // dos dois. As políticas de workouts e messages exigem ser membro
  // do desafio; se o dono não entrar na lista, ele cria a sala, abre
  // a sala, e encontra feed e chat vazios para sempre, sem nenhum
  // aviso de que algo falhou.
  const { error: erroMembro } = await supabase.from('challenge_members').insert({
    challenge_id: challenge.id,
    user_id: userId,
    role: 'admin',
  });

  if (erroMembro) {
    // Desafio sem dono é lixo: ninguém consegue usar e ele fica
    // ocupando o código. Desfaz para não deixar rastro quebrado.
    await supabase.from('challenges').delete().eq('id', challenge.id).eq('owner_id', userId);
    throw new Error(
      erroMembro.code === '23503'
        ? 'Seu perfil ainda não está pronto. Recarregue o app e tente de novo.'
        : `Criei o desafio mas não consegui te adicionar nele (${erroMembro.message}). Nada foi salvo.`
    );
  }

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
  // O erro era descartado aqui, e `?? []` transformava qualquer falha
  // em "0 membros" — exatamente o sintoma que ninguém conseguia
  // diagnosticar: a lista dizia 2, a sala dizia 0, e nada no console.
  const { data, error } = await supabase
    .from('challenge_members')
    .select(`
      *,
      profiles(id, username:full_name, avatar_url)
    `)
    .eq('challenge_id', challengeId);

  if (error) {
    console.error('[arena] membros falhou:', error.message);
    return [];
  }
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
