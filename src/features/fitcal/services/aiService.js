import { supabase } from '../../../lib/supabase';

import { toLocalDateStr } from '../../../utils/dateUtils';

export async function analyzeFoodPhoto(file, userId) {
  // 1. Upload da foto
  const ext = file.name?.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('food-photos')
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (uploadErr) throw uploadErr;

  const { data: urlData } = supabase.storage
    .from('food-photos')
    .getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  // 2. Chamar Edge Function
  const { data, error } = await supabase.functions
    .invoke('analyze-food', { body: { imageUrl: publicUrl } });
  if (error) throw error;

  return { items: data.items, photoUrl: publicUrl };
}

export async function analyzeFoodText(description) {
  const { data, error } = await supabase.functions
    .invoke('analyze-food-text', { body: { description } });
  if (error) throw error;
  return data.items;
}

export async function saveAIResults(userId, items, mealType, photoUrl = null) {
  const entries = items.map((item) => ({
    user_id: userId,
    meal_type: mealType,
    log_date: toLocalDateStr(),
    quantity_g: item.quantity_g || 100,
    calories: item.calories || 0,
    protein_g: item.protein_g || 0,
    carbs_g: item.carbs_g || 0,
    fat_g: item.fat_g || 0,
    photo_url: photoUrl,
    ai_confidence: item.confidence || null,
    source: photoUrl ? 'ai_photo' : 'ai_voice',
    notes: item.name,
  }));

  const { data, error } = await supabase
    .from('meal_entries')
    .insert(entries)
    .select();
  if (error) throw error;
  return data;
}
