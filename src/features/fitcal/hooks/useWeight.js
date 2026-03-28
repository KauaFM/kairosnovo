import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getWeightHistory, getDailyWater } from '../services/weightService';

export function useWeight(days = 30) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await getWeightHistory(session.user.id, days);
      setHistory(data);
    } catch (err) {
      console.error('useWeight:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { history, loading, refresh };
}

export function useWater() {
  const [totalMl, setTotalMl] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const ml = await getDailyWater(session.user.id);
      setTotalMl(ml);
    } catch (err) {
      console.error('useWater:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { totalMl, loading, refresh };
}
