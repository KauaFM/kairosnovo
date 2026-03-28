import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getDailyLog } from '../services/foodService';
import { calcDailyTotals } from '../utils/macroCalc';

import { toLocalDateStr } from '../../../utils/dateUtils';

export function useFoodDiary(date) {
  // Stabilize date into a string to prevent infinite re-render loop
  const dateStr = date instanceof Date
    ? toLocalDateStr(date)
    : (date || toLocalDateStr());

  const [entries, setEntries] = useState({ breakfast: [], lunch: [], dinner: [], snack: [] });
  const [totals, setTotals] = useState({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await getDailyLog(session.user.id, dateStr);
      setEntries(data);
      setTotals(calcDailyTotals(data));
    } catch (err) {
      console.error('useFoodDiary:', err);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, totals, loading, refresh };
}
