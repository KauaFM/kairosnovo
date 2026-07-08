// =============================================================
// ORVAX — barcodeService v2
// Lookup de código de barras → foods_v2.
// Cache local + fallback OpenFoodFacts (auto-import via importExternalFood).
// =============================================================
import { supabase } from '../../../lib/supabase';
import { importExternalFood } from './foodServiceV2';

export async function lookupBarcode(barcode) {
  if (!barcode) throw new Error('Código de barras vazio');

  // 1. Tenta no catálogo v2
  const { data: local } = await supabase
    .from('foods_v2')
    .select(`
      id, name, brand, barcode, kind, verified,
      food_nutrients(nutrient, amount, unit),
      food_portions(label, grams, is_default)
    `)
    .eq('barcode', barcode)
    .maybeSingle();

  if (local) {
    // Achata o shape para algo simples como o usado em search
    const n = Object.fromEntries((local.food_nutrients || []).map(r => [r.nutrient, r.amount]));
    const def = (local.food_portions || []).find(p => p.is_default) || (local.food_portions || [])[0];
    return {
      id: local.id,
      name: local.name,
      brand: local.brand,
      barcode: local.barcode,
      kind: local.kind,
      verified: local.verified,
      calories_100g: n.calories ?? 0,
      protein_100g: n.protein_g ?? 0,
      carbs_100g: n.carbs_g ?? 0,
      fat_100g: n.fat_g ?? 0,
      default_portion_label: def?.label || '100g',
      default_portion_grams: def?.grams || 100,
    };
  }

  // 2. Fallback OpenFoodFacts
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
  );
  const json = await res.json();
  if (json.status !== 1) throw new Error('Produto não encontrado');

  const p = json.product;
  const nm = p.nutriments || {};
  const ext = {
    name: p.product_name || 'Produto desconhecido',
    brand: p.brands || null,
    barcode,
    external_source: 'openfoodfacts',
    external_id: p.code,
    kind: p.brands ? 'branded' : 'generic',
    calories_100g: Math.round(nm['energy-kcal_100g'] ?? 0),
    protein_100g: +(nm['proteins_100g'] ?? 0).toFixed(1),
    carbs_100g: +(nm['carbohydrates_100g'] ?? 0).toFixed(1),
    fat_100g: +(nm['fat_100g'] ?? 0).toFixed(1),
    default_portion_label: p.serving_size || '100g',
    default_portion_grams: p.serving_quantity ?? 100,
  };

  // 3. Importa no catálogo (cria foods_v2 + nutrients + portion)
  const newId = await importExternalFood(ext);
  return { ...ext, id: newId };
}
