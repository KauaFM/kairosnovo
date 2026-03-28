import { supabase } from '../../../lib/supabase';

export async function lookupBarcode(barcode) {
  // 1. Buscar no banco local
  const { data: local } = await supabase
    .from('foods')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle();
  if (local) return local;

  // 2. Buscar na Open Food Facts
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
  );
  const json = await res.json();
  if (json.status !== 1) throw new Error('Produto nao encontrado');

  const p = json.product.nutriments;
  const food = {
    name: json.product.product_name || 'Produto desconhecido',
    brand: json.product.brands || null,
    barcode,
    serving_size_g: json.product.serving_quantity ?? 100,
    calories: p['energy-kcal_100g'] ?? 0,
    protein_g: p['proteins_100g'] ?? 0,
    carbs_g: p['carbohydrates_100g'] ?? 0,
    fat_g: p['fat_100g'] ?? 0,
    fiber_g: p['fiber_100g'] ?? 0,
    source: 'openfoodfacts',
  };

  // 3. Salvar no banco local como cache
  const { data: saved } = await supabase
    .from('foods')
    .insert(food)
    .select()
    .single();
  return saved || food;
}
