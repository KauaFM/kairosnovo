import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getActivePlan } from '../services/foodService';

export function useNutritionPlan() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await getActivePlan(session.user.id);
      setPlan(data);
    } catch (err) {
      console.error('useNutritionPlan:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { plan, loading, refresh };
}
