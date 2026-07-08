// =============================================================
// ORVAX — useFoodDiary v2
// Lê food_logs (novo schema) via RPC get_fitcal_daily.
// Mantém o mesmo formato de retorno do hook antigo para
// não quebrar componentes consumidores (FitCalHome, DiarySection).
// =============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getDailyFitcal } from '../services/foodServiceV2';
import { toLocalDateStr } from '../../../utils/dateUtils';

const EMPTY = { breakfast: [], lunch: [], dinner: [], snack: [] };
const ZERO_TOTALS = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

export function useFoodDiary(date) {
  const dateStr = date instanceof Date
    ? toLocalDateStr(date)
    : (date || toLocalDateStr());

  const [entries, setEntries] = useState(EMPTY);
  const [totals, setTotals] = useState(ZERO_TOTALS);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const result = await getDailyFitcal(dateStr);
      const grouped = { ...EMPTY, ...(result?.entries || {}) };
      // Adapta cada item para o shape esperado pelo DiarySection antigo
      const normalized = {};
      for (const meal of ['breakfast','lunch','dinner','snack']) {
        normalized[meal] = (grouped[meal] || []).map(it => ({
          id: it.id,
          food_id: it.food_id,
          quantity_g: it.grams,
          calories: it.calories,
          protein_g: it.protein_g,
          carbs_g: it.carbs_g,
          fat_g: it.fat_g,
          notes: it.name,
          source: it.source,
          photo_url: it.photo_url,
          // shape "foods" pra compat com DiarySection que faz entry.foods?.name
          foods: { name: it.name, brand: null, serving_unit: 'g' },
        }));
      }
      setEntries(normalized);

      const m = result?.metrics || {};
      setMetrics(m);
      setTotals({
        calories: Number(m.total_calories ?? 0),
        protein_g: Number(m.total_protein_g ?? 0),
        carbs_g: Number(m.total_carbs_g ?? 0),
        fat_g: Number(m.total_fat_g ?? 0),
      });
    } catch (err) {
      console.error('useFoodDiary v2:', err);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => { refresh(); }, [refresh]);

  return { entries, totals, metrics, loading, refresh };
}
