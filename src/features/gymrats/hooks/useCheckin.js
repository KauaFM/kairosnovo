import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getWorkouts, subscribeToFeed } from '../services/checkinService';

export function useCheckin(challengeId) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    try {
      const data = await getWorkouts(challengeId);
      setWorkouts(data);
    } catch (err) {
      console.error('useCheckin:', err);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!challengeId) return;
    const channel = subscribeToFeed(challengeId, async (newWorkout) => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', newWorkout.user_id)
        .maybeSingle();
      setWorkouts((prev) => [{ ...newWorkout, profiles: data }, ...prev]);
    });
    return () => supabase.removeChannel(channel);
  }, [challengeId]);

  return { workouts, loading, refresh };
}
