import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getMyChallenges, getChallengeDetail, getChallengeMembers } from '../services/challengeService';

export function useChallenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await getMyChallenges(session.user.id);
      setChallenges(data);
    } catch (err) {
      console.error('useChallenges:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { challenges, loading, refresh };
}

export function useChallengeDetail(challengeId) {
  const [challenge, setChallenge] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    try {
      const [detail, memberList] = await Promise.all([
        getChallengeDetail(challengeId),
        getChallengeMembers(challengeId),
      ]);
      setChallenge(detail);
      setMembers(memberList);
    } catch (err) {
      console.error('useChallengeDetail:', err);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { challenge, members, loading, refresh };
}
