import { supabase } from '../../../lib/supabase';
import { generatePlan } from '../utils/tdeeCalc';

import { toLocalDateStr } from '../../../utils/dateUtils';

// --- NUTRITION PLAN ---
export async function saveOnboarding(userId, data) {
  await supabase.from('profiles').update({
    height_cm: data.height_cm,
    birth_date: data.birth_date,
    gender: data.gender,
    goal: data.goal,
    activity_level: data.activity_level,
  }).eq('id', userId);

  const plan = generatePlan(data);

  await supabase.from('nutrition_plans').upsert({
    user_id: userId,
    ...plan,
    is_active: true,
  }, { onConflict: 'user_id,is_active' });

  return plan;
}

export async function updateWaterGoal(userId, water_ml) {
  const { data } = await supabase
    .from('nutrition_plans')
    .update({ water_ml })
    .eq('user_id', userId)
    .eq('is_active', true)
    .select('id');

  if (!data || data.length === 0) {
    await supabase.from('nutrition_plans').insert({ user_id: userId, water_ml, is_active: true });
  }
}

export async function updateCalorieGoal(userId, daily_calories) {
  const { data } = await supabase
    .from('nutrition_plans')
    .update({ daily_calories })
    .eq('user_id', userId)
    .eq('is_active', true)
    .select('id');

  // Se não havia plano ativo, cria um novo
  if (!data || data.length === 0) {
    await supabase.from('nutrition_plans').insert({ user_id: userId, daily_calories, is_active: true });
  }
}

export async function getActivePlan(userId) {
  const { data } = await supabase
    .from('nutrition_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

// --- FOOD SEARCH ---
export async function searchFoods(query, limit = 20) {
  // 1. Busca local primeiro
  const { data: local } = await supabase
    .from('foods')
    .select('id, name, brand, calories, protein_g, carbs_g, fat_g, serving_size_g, serving_unit')
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (local && local.length > 0) return local;

  // 2. Fallback: Open Food Facts (sem chave, gratuita)
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&fields=code,product_name,brands,nutriments&lc=pt&cc=br&page_size=${limit}`
    );
    const json = await res.json();
    return (json.products || [])
      .filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'] != null)
      .slice(0, limit)
      .map(p => ({
        id: null, // será salvo no momento de adicionar
        name: p.product_name,
        brand: p.brands || null,
        calories: Math.round(p.nutriments['energy-kcal_100g'] ?? 0),
        protein_g: +(p.nutriments['proteins_100g'] ?? 0).toFixed(1),
        carbs_g: +(p.nutriments['carbohydrates_100g'] ?? 0).toFixed(1),
        fat_g: +(p.nutriments['fat_100g'] ?? 0).toFixed(1),
        serving_size_g: 100,
        serving_unit: 'g',
      }));
  } catch {
    return [];
  }
}

export async function getFoodById(foodId) {
  const { data } = await supabase
    .from('foods')
    .select('*')
    .eq('id', foodId)
    .maybeSingle();
  return data;
}

export async function createFood(food) {
  const { data } = await supabase
    .from('foods')
    .insert(food)
    .select()
    .single();
  return data;
}

// --- MEAL ENTRIES ---
export async function getDailyLog(userId, date = new Date()) {
  const dateStr = typeof date === 'string' ? date : toLocalDateStr(date);
  const { data } = await supabase
    .from('meal_entries')
    .select('*, foods(name, brand, serving_unit)')
    .eq('user_id', userId)
    .eq('log_date', dateStr)
    .order('created_at', { ascending: true });

  const groups = { breakfast: [], lunch: [], dinner: [], snack: [] };
  data?.forEach((e) => groups[e.meal_type]?.push(e));
  return groups;
}

export async function addMealEntry(userId, foodId, mealType, quantityG, logDate) {
  const { data: { user } } = await supabase.auth.getUser();
  await ensureProfile(userId, user?.email);

  const { data: food } = await supabase
    .from('foods')
    .select('*')
    .eq('id', foodId)
    .maybeSingle();
  if (!food) throw new Error('Alimento nao encontrado');

  const ratio = quantityG / (food.serving_size_g || 100);

  const { data, error } = await supabase.from('meal_entries').insert({
    user_id: userId,
    food_id: foodId,
    meal_type: mealType,
    log_date: logDate || toLocalDateStr(),
    quantity_g: quantityG,
    calories: +(food.calories * ratio).toFixed(2),
    protein_g: +(food.protein_g * ratio).toFixed(2),
    carbs_g: +(food.carbs_g * ratio).toFixed(2),
    fat_g: +(food.fat_g * ratio).toFixed(2),
    source: 'manual',
  }).select().single();
  if (error) throw error;
  return data;
}

async function ensureProfile(userId, email) {
  await supabase.from('profiles').upsert({ id: userId, email }, { onConflict: 'id', ignoreDuplicates: true });
}

export async function addMealEntryDirect(userId, mealType, foodData, quantityG) {
  const { data: { user } } = await supabase.auth.getUser();
  await ensureProfile(userId, user?.email);

  const ratio = quantityG / (foodData.serving_size_g || 100);
  const { data, error } = await supabase.from('meal_entries').insert({
    user_id: userId,
    meal_type: mealType,
    log_date: toLocalDateStr(),
    quantity_g: quantityG,
    calories: +(foodData.calories * ratio).toFixed(2),
    protein_g: +(foodData.protein_g * ratio).toFixed(2),
    carbs_g: +(foodData.carbs_g * ratio).toFixed(2),
    fat_g: +(foodData.fat_g * ratio).toFixed(2),
    notes: foodData.brand ? `${foodData.name} (${foodData.brand})` : foodData.name,
    source: 'external',
  }).select().single();
  if (error) throw error;
  return data;
}

export async function addQuickEntry(userId, mealType, entryData) {
  const { data, error } = await supabase.from('meal_entries').insert({
    user_id: userId,
    meal_type: mealType,
    log_date: toLocalDateStr(),
    ...entryData,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMealEntry(entryId) {
  const { error } = await supabase.from('meal_entries').delete().eq('id', entryId);
  if (error) throw error;
}

// --- CUSTOM MEALS ---
export async function saveCustomMeal(userId, name, items) {
  const { data: meal } = await supabase
    .from('custom_meals')
    .insert({ user_id: userId, name })
    .select()
    .single();

  await supabase.from('custom_meal_items').insert(
    items.map((i) => ({ meal_id: meal.id, ...i }))
  );
  return meal;
}

export async function getCustomMeals(userId) {
  const { data } = await supabase
    .from('custom_meals')
    .select('*, custom_meal_items(*, foods(name, calories, protein_g, carbs_g, fat_g))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

// --- WEEKLY SUMMARY ---
export async function getWeeklySummary(userId) {
  const since = toLocalDateStr(new Date(Date.now() - 7 * 86400000));
  const { data } = await supabase
    .from('meal_entries')
    .select('log_date, calories, protein_g, carbs_g, fat_g')
    .eq('user_id', userId)
    .gte('log_date', since);

  const byDay = {};
  data?.forEach((e) => {
    if (!byDay[e.log_date])
      byDay[e.log_date] = { date: e.log_date, calories: 0, protein: 0, carbs: 0, fat: 0 };
    byDay[e.log_date].calories += e.calories;
    byDay[e.log_date].protein += e.protein_g;
    byDay[e.log_date].carbs += e.carbs_g;
    byDay[e.log_date].fat += e.fat_g;
  });

  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
}
