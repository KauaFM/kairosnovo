import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getStreakInfo } from '../services/streakService';

export function useStreak() {
  const [streak, setStreak] = useState({ streak_days: 0, total_points: 0, last_log_date: null });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await getStreakInfo(session.user.id);
      if (data) setStreak(data);
    } catch (err) {
      console.error('useStreak:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { streak, loading, refresh };
}
