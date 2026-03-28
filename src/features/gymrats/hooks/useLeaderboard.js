import { useState, useEffect, useCallback } from 'react';
import { getLeaderboard } from '../services/checkinService';

export function useLeaderboard(challengeId) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    try {
      const data = await getLeaderboard(challengeId);
      setLeaderboard(data);
    } catch (err) {
      console.error('useLeaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { leaderboard, loading, refresh };
}
