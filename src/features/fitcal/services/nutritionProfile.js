// ============================================================
// ORVAX FitCal — Perfil nutricional (VITALIS · N1)
//
// Une o que estava solto: dados do profiles + peso (weight_logs) +
// preferências → gera e SALVA o nutrition_plans real. Antes o motor
// de TDEE existia mas nunca rodava (0 planos no banco) e a meta era
// digitada na mão.
// ============================================================
import { supabase } from '../../../lib/supabase';
import { generatePlan } from '../utils/tdeeCalc';
import { getLatestWeight } from './weightService';
import { getActivePlan } from './foodService';

export const DIET_TYPES = [
  { value: 'onivoro', label: 'Onívoro' },
  { value: 'vegetariano', label: 'Vegetariano' },
  { value: 'vegano', label: 'Vegano' },
  { value: 'low_carb', label: 'Low carb' },
  { value: 'mediterranea', label: 'Mediterrânea' },
];

export const COMMON_ALLERGIES = ['Lactose', 'Glúten', 'Amendoim', 'Frutos do mar', 'Ovo', 'Soja', 'Castanhas'];
export const COMMON_DISLIKES = ['Peixe', 'Fígado', 'Jiló', 'Berinjela', 'Brócolis', 'Coentro', 'Pimenta'];

/** Preferências alimentares do usuário (ou defaults). */
export async function getPreferences() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase
    .from('nutrition_preferences')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();
  return data;
}

/** Estado completo: perfil + peso + preferências + plano ativo. */
export async function getNutritionSetup() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const uid = session.user.id;

  const [{ data: profile }, weight, prefs, plan] = await Promise.all([
    supabase.from('profiles')
      .select('height_cm, birth_date, gender, goal, activity_level')
      .eq('id', uid).maybeSingle(),
    getLatestWeight(uid).catch(() => null),
    getPreferences().catch(() => null),
    getActivePlan(uid).catch(() => null),
  ]);

  const weightKg = weight?.weight_kg ?? plan?.weight_kg ?? null;
  // Só dá pra calcular a meta com estes 5 dados
  const complete = !!(profile?.height_cm && profile?.birth_date && profile?.gender
    && profile?.activity_level && weightKg);

  return {
    userId: uid,
    profile: profile || {},
    weightKg,
    preferences: prefs,
    plan,
    needsOnboarding: !plan || !complete,
    complete,
  };
}

/**
 * Salva o setup completo e GERA o plano (metas reais).
 * @param {object} data { weight_kg, height_cm, birth_date, gender, goal,
 *   activity_level, diet_type, allergies[], dislikes[], meals_per_day,
 *   cooks_at_home, eats_out_freq, budget_level, notes }
 * @returns {Promise<object>} o plano gerado
 */
export async function saveNutritionSetup(data) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão expirada.');
  const uid = session.user.id;

  // 1) dados antropométricos no profile
  const { error: profErr } = await supabase.from('profiles').update({
    height_cm: data.height_cm,
    birth_date: data.birth_date,
    gender: data.gender,
    goal: data.goal,
    activity_level: data.activity_level,
  }).eq('id', uid);
  if (profErr) throw profErr;

  // 2) peso vira um registro no histórico (alimenta o gráfico também)
  if (data.weight_kg) {
    await supabase.from('weight_logs').upsert(
      { user_id: uid, weight_kg: data.weight_kg, log_date: new Date().toISOString().slice(0, 10) },
      { onConflict: 'user_id,log_date' },
    ).catch(() => { /* histórico é best-effort */ });
  }

  // 3) preferências (contexto do VITALIS)
  const { error: prefErr } = await supabase.from('nutrition_preferences').upsert({
    user_id: uid,
    diet_type: data.diet_type || 'onivoro',
    allergies: data.allergies || [],
    dislikes: data.dislikes || [],
    meals_per_day: data.meals_per_day ?? 4,
    cooks_at_home: data.cooks_at_home || 'as_vezes',
    eats_out_freq: data.eats_out_freq || 'as_vezes',
    budget_level: data.budget_level || 'medio',
    notes: data.notes || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (prefErr) throw prefErr;

  // 4) o plano (aqui o motor finalmente roda)
  const plan = generatePlan(data);
  await activatePlan(uid, plan);
  return plan;
}

/**
 * Arquiva o plano ativo e insere o novo. (O índice único de
 * nutrition_plans é PARCIAL — `WHERE is_active` — então upsert por
 * onConflict não funciona. Isso também preserva o histórico de metas.)
 */
async function activatePlan(uid, plan) {
  await supabase.from('nutrition_plans')
    .update({ is_active: false })
    .eq('user_id', uid).eq('is_active', true);

  const { error } = await supabase.from('nutrition_plans').insert({
    user_id: uid, ...plan, is_active: true, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Recalcula o plano com o peso mais recente (chamar ao pesar). */
export async function refreshPlanFromWeight() {
  const setup = await getNutritionSetup();
  if (!setup?.complete) return null;
  const { profile, weightKg, userId } = setup;
  const plan = generatePlan({
    weight_kg: weightKg,
    height_cm: profile.height_cm,
    birth_date: profile.birth_date,
    gender: profile.gender,
    goal: profile.goal,
    activity_level: profile.activity_level,
  });
  await supabase.from('nutrition_plans').upsert(
    { user_id: userId, ...plan, is_active: true, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
  return plan;
}
