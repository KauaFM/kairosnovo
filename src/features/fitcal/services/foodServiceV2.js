// =============================================================
// ORVAX — FitCal foodService v2
// Aponta para foods_v2 + food_nutrients + food_portions + food_logs.
// Usa RPCs search_foods_v2, log_food, log_food_from_ai, get_fitcal_daily,
// get_execution_map, get_intake_output, get_food_detail.
// =============================================================
import { supabase } from '../../../lib/supabase';
import { toLocalDateStr } from '../../../utils/dateUtils';

// ─── BUSCA ─────────────────────────────────────────────────────
// Catálogo global (fuzzy) → fallback OpenFoodFacts → cria no catálogo
export async function searchFoods(query, limit = 20) {
  if (!query || query.trim().length < 2) return [];

  // 1. Catálogo local (RPC fuzzy com ranking)
  const { data: local, error } = await supabase.rpc('search_foods_v2', {
    q: query.trim(),
    p_limit: limit,
  });

  if (error) console.warn('search_foods_v2 erro:', error);
  if (local && local.length > 0) return local;

  // 2. Fallback OpenFoodFacts (PT-BR)
  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      fields: 'code,product_name,brands,nutriments',
      lc: 'pt',
      cc: 'br',
      page_size: String(limit),
    });
    const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`);
    const json = await res.json();
    return (json.products || [])
      .filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'] != null)
      .slice(0, limit)
      .map(p => ({
        id: null, // sinal que é externo — importado on-demand
        external_source: 'openfoodfacts',
        external_id: p.code,
        name: p.product_name,
        brand: p.brands || null,
        kind: p.brands ? 'branded' : 'generic',
        verified: false,
        calories_100g: Math.round(p.nutriments['energy-kcal_100g'] ?? 0),
        protein_100g: +(p.nutriments['proteins_100g'] ?? 0).toFixed(1),
        carbs_100g: +(p.nutriments['carbohydrates_100g'] ?? 0).toFixed(1),
        fat_100g: +(p.nutriments['fat_100g'] ?? 0).toFixed(1),
        default_portion_label: '100 g',
        default_portion_grams: 100,
      }));
  } catch {
    return [];
  }
}

export async function getFoodDetail(foodId) {
  const { data, error } = await supabase.rpc('get_food_detail', { p_food_id: foodId });
  if (error) throw error;
  return data;
}

// Importa food externo para o catálogo (usado ao logar OFF)
export async function importExternalFood(ext) {
  const { data: food, error } = await supabase
    .from('foods_v2')
    .insert({
      name: ext.name,
      brand: ext.brand,
      kind: ext.kind || 'branded',
      source: ext.external_source || 'openfoodfacts',
      source_id: ext.external_id,
      barcode: ext.barcode || null,
      locale: 'pt-BR',
      verified: false,
    })
    .select()
    .single();
  if (error) throw error;

  const nutrientRows = [
    { food_id: food.id, nutrient: 'calories',  amount: ext.calories_100g ?? 0, unit: 'kcal' },
    { food_id: food.id, nutrient: 'protein_g', amount: ext.protein_100g  ?? 0, unit: 'g' },
    { food_id: food.id, nutrient: 'carbs_g',   amount: ext.carbs_100g    ?? 0, unit: 'g' },
    { food_id: food.id, nutrient: 'fat_g',     amount: ext.fat_100g      ?? 0, unit: 'g' },
  ];
  await supabase.from('food_nutrients').insert(nutrientRows);
  await supabase.from('food_portions').insert({
    food_id: food.id, label: ext.default_portion_label || '100g',
    grams: ext.default_portion_grams || 100, is_default: true,
  });
  return food.id;
}

// ─── LOG ───────────────────────────────────────────────────────
export async function logFood({ foodId, mealType, grams, portionId, quantity, date, source = 'search', notes }) {
  const { data, error } = await supabase.rpc('log_food', {
    p_food_id: foodId,
    p_meal_type: mealType,
    p_grams: grams,
    p_log_date: date ? (typeof date === 'string' ? date : toLocalDateStr(date)) : null,
    p_portion_id: portionId || null,
    p_quantity: quantity || null,
    p_source: source,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data; // log id
}

// Loga um externo em 1 passo: importa catálogo se precisar, depois log
export async function logExternalFood({ ext, mealType, grams, date, source = 'search' }) {
  let foodId = ext.id;
  if (!foodId) foodId = await importExternalFood(ext);
  return logFood({ foodId, mealType, grams, date, source });
}

export async function logFromAI({ name, mealType, grams, calories, protein_g, carbs_g, fat_g, confidence, photoUrl, date }) {
  const { data, error } = await supabase.rpc('log_food_from_ai', {
    p_name: name,
    p_meal_type: mealType,
    p_grams: grams,
    p_calories: calories,
    p_protein: protein_g,
    p_carbs: carbs_g,
    p_fat: fat_g,
    p_confidence: confidence ?? null,
    p_photo_url: photoUrl ?? null,
    p_log_date: date ? (typeof date === 'string' ? date : toLocalDateStr(date)) : null,
  });
  if (error) throw error;
  return data;
}

export async function deleteLog(logId) {
  const { error } = await supabase.from('food_logs').delete().eq('id', logId);
  if (error) throw error;
}

// ─── LEITURA ───────────────────────────────────────────────────
export async function getDailyFitcal(date) {
  const dateStr = date ? (typeof date === 'string' ? date : toLocalDateStr(date)) : null;
  const { data, error } = await supabase.rpc('get_fitcal_daily', { p_date: dateStr });
  if (error) throw error;
  return data || { date: dateStr, metrics: {}, entries: {} };
}

export async function getExecutionMap(weeks = 12) {
  const { data, error } = await supabase.rpc('get_execution_map', { p_weeks: weeks });
  if (error) throw error;
  return data || [];
}

export async function getIntakeOutput(period = 'week') {
  const { data, error } = await supabase.rpc('get_intake_output', { p_period: period });
  if (error) throw error;
  return data || [];
}
