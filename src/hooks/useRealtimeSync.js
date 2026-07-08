import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook para sincronizar dados em tempo real do Supabase
 * Escuta mudanças em tabelas e notifica callbacks
 */
export function useRealtimeSync() {
  const subscribeToOrvaxAgenda = useCallback((onUpdate) => {
    const subscription = supabase
      .channel('orvax-agenda-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orvax_agenda'
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const subscribeToDailyActivity = useCallback((onUpdate) => {
    const subscription = supabase
      .channel('daily-activity-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_activity'
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const subscribeToMediaVault = useCallback((onUpdate) => {
    const subscription = supabase
      .channel('media-vault-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_vault'
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const subscribeToRegistrosDinamicos = useCallback((onUpdate) => {
    const subscription = supabase
      .channel('registros-dinamicos-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registros_dinamicos'
        },
        (payload) => {
          onUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ============================================================
  // ORVAX CORE — novas subscriptions do sistema unificado
  // ============================================================
  const subscribeToTable = useCallback((tableName, onUpdate) => {
    const channel = supabase
      .channel(`${tableName}-sync-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => onUpdate(payload)
      )
      .subscribe();
    return () => channel.unsubscribe();
  }, []);

  const subscribeToHabits        = useCallback((cb) => subscribeToTable('habits', cb),        [subscribeToTable]);
  const subscribeToHabitLogs     = useCallback((cb) => subscribeToTable('habit_logs', cb),    [subscribeToTable]);
  const subscribeToDailyMetrics  = useCallback((cb) => subscribeToTable('daily_metrics', cb), [subscribeToTable]);
  const subscribeToXpLog         = useCallback((cb) => subscribeToTable('xp_log', cb),        [subscribeToTable]);
  const subscribeToTasks         = useCallback((cb) => subscribeToTable('tasks', cb),         [subscribeToTable]);
  const subscribeToGoals         = useCallback((cb) => subscribeToTable('goals', cb),         [subscribeToTable]);

  return {
    subscribeToOrvaxAgenda,
    subscribeToDailyActivity,
    subscribeToMediaVault,
    subscribeToRegistrosDinamicos,
    // core unificado
    subscribeToHabits,
    subscribeToHabitLogs,
    subscribeToDailyMetrics,
    subscribeToXpLog,
    subscribeToTasks,
    subscribeToGoals,
  };
}
