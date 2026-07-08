// =============================================================
// ORVAX — Life OS service
// Camada de acesso à tabela unificada de aspectos da vida.
// =============================================================
import { supabase } from '../lib/supabase';
import { toLocalDateStr } from '../utils/dateUtils';

/** Lista aspectos do usuário (com contagens). */
export async function listLifeAspects() {
  const { data, error } = await supabase.rpc('get_user_life_aspects');
  if (error) throw error;
  return data || [];
}

/** Visão geral consolidada: aspectos + sparkline + heatmap + KPIs. */
export async function getLifeOverview() {
  const { data, error } = await supabase.rpc('get_life_overview');
  if (error) throw error;
  return data || { aspects: [], exec_map: [], totals: { today: 0, week: 0, month: 0 } };
}

/** Todas as tarefas/habitos/eventos devidos em `date`. */
export async function getTodayPending(date = new Date()) {
  const d = typeof date === 'string' ? date : toLocalDateStr(date);
  const { data, error } = await supabase.rpc('get_today_pending', { p_date: d });
  if (error) throw error;
  return data || [];
}

/** Dashboard agregado de um aspecto. */
export async function getAspectDashboard(aspectKey, days = 30) {
  const { data, error } = await supabase.rpc('get_aspect_dashboard', {
    p_aspect: aspectKey,
    p_days: days,
  });
  if (error) throw error;
  return data || {};
}

/** Cria um evento universal (reunião, consulta, lembrete, pagamento, etc.). */
export async function createUniversalEvent(payload) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const row = {
    user_id: user.id,
    title: payload.title,
    description: payload.description || null,
    aspect_key: payload.aspect_key || 'productivity',
    event_type: payload.event_type || 'event',
    location: payload.location || null,
    starts_at: payload.starts_at,
    ends_at: payload.ends_at || null,
    all_day: !!payload.all_day,
    recurrence: payload.recurrence || null,
    rrule_until: payload.rrule_until || null,
    remind_before_min: payload.remind_before_min ?? null,
    color: payload.color || null,
    metadata: payload.metadata || {},
  };
  const { data, error } = await supabase
    .from('universal_events')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Marca evento como done/cancelado. */
export async function updateEventStatus(id, status) {
  const { error } = await supabase
    .from('universal_events')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Cria aspecto customizado. */
export async function createCustomAspect({ key, label, icon, color, description }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { data, error } = await supabase
    .from('life_aspects')
    .insert({
      user_id: user.id,
      key, label, icon, color, description,
      is_system: false, is_active: true, sort_order: 200,
    })
    .select().single();
  if (error) throw error;
  return data;
}

/** Atalhos de criação — delegam pras tabelas existentes. */
export async function createTask({ title, description, scheduled_date, pillar, category }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title,
      category: category || description || null,
      scheduled_date: scheduled_date || toLocalDateStr(new Date()),
      pillar: pillar || null,
      state: 'pending',
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function createHabit({ title, pillar, xp_reward = 10 }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: user.id,
      title,
      pillar: pillar || null,
      xp_reward,
      active: true,
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function createGoal({ title, description, deadline }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');
  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: user.id,
      title,
      description: description || null,
      deadline: deadline || null,
      progress: 0,
      // 'ativo' = default do banco e valor filtrado por getUserGoals()
      status: 'ativo',
    })
    .select().single();
  if (error) throw error;
  return data;
}

/** Mapa aspecto → pillar antigo (pra criar task/habit a partir de um aspecto). */
export const ASPECT_TO_PILLAR = {
  finance: 'financas',
  career: 'profissao',
  health: 'saude',
  body: 'corpo',
  nutrition: 'nutricao',
  relationships: 'relacionamento',
  studies: 'estudos',
  mental: 'mental',
  spiritual: 'espiritual',
  productivity: 'disciplina',
  hobbies: 'hobby',
  social: 'social',
  home: 'casa',
  sustainability: 'evolucao',
};
