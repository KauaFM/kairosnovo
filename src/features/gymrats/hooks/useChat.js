import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getMessages, subscribeToChat } from '../services/chatService';

export function useChat(challengeId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    try {
      const data = await getMessages(challengeId);
      setMessages(data);
    } catch (err) {
      console.error('useChat:', err);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!challengeId) return;
    const channel = subscribeToChat(challengeId, (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
    });
    return () => supabase.removeChannel(channel);
  }, [challengeId]);

  return { messages, loading, refresh };
}
