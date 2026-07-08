import { useState, useEffect, useRef, useCallback } from 'react';
import { ExecutionMatrix, HabitData } from './ExecutionMatrix';
import { getTasks, updateTaskState } from '../../../services/db';
import { toLocalDateStr } from '../../../utils/dateUtils';
import { useRealtimeSync } from '../../../hooks/useRealtimeSync';

/**
 * VaultExecutionMatrix
 * Wraps ExecutionMatrix to display real Vault tasks as a weekly execution matrix
 * with real-time synchronization from orvax_agenda table
 */

interface TaskRow {
  id: string;
  title: string;
  category: string;
  scheduled_date: string;
  state: 'pending' | 'active' | 'done' | 'failed' | null;
  time_start?: string;
  duration?: string;
  created_at?: string;
}

interface Props {
  isDark: boolean;
}

// Helper: Convert Vault tasks to ExecutionMatrix HabitData format
function convertTasksToHabits(tasks: TaskRow[]): HabitData[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday

  return tasks.map((task) => {
    const weekDays: [boolean, boolean, boolean, boolean, boolean, boolean, boolean] = [
      false, false, false, false, false, false, false,
    ];

    const taskDate = new Date(task.scheduled_date + 'T00:00:00');
    const dayOfWeek = Math.floor((taskDate.getTime() - startOfWeek.getTime()) / (24 * 60 * 60 * 1000));

    // Mark as done if state is 'done'
    if (dayOfWeek >= 0 && dayOfWeek < 7 && task.state === 'done') {
      weekDays[dayOfWeek] = true;
    }

    // Calculate streak (consecutive days with done state)
    let streak = 0;
    const taskDateStr = toLocalDateStr(taskDate);
    const currentDateStr = toLocalDateStr(today);

    if (taskDateStr === currentDateStr && task.state === 'done') {
      streak = 1;
    }

    return {
      id: task.id,
      name: task.title,
      target: task.duration || task.time_start || '1h',
      domain: task.category || 'SISTEMA',
      streak,
      streakBroken: taskDateStr === currentDateStr && task.state !== 'done',
      weekDays,
    };
  });
}

export function VaultExecutionMatrix({ isDark }: Props) {
  const [habits, setHabits] = useState<HabitData[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef<(() => void)[]>([]);
  const { subscribeToOrvaxAgenda } = useRealtimeSync();

  // Fetch tasks from current week
  const fetchWeekTasks = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date();

      // Get tasks for this week (Mon-Sun)
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

      const startStr = toLocalDateStr(startOfWeek);
      const endStr = toLocalDateStr(endOfWeek);

      // Fetch ALL tasks and filter locally for this week
      const allTasks = await getTasks();
      console.log('📊 VaultExecutionMatrix: Todas as tarefas:', allTasks);
      console.log('📅 Semana:', startStr, 'a', endStr);

      if (allTasks && allTasks.length > 0) {
        // Filter only this week's tasks
        const weekTasks = allTasks.filter((t: TaskRow) => {
          const tDate = t.scheduled_date;
          return tDate >= startStr && tDate <= endStr;
        });

        console.log('📋 Tarefas desta semana:', weekTasks);
        const converted = convertTasksToHabits(weekTasks);
        console.log('✅ Convertidas para HabitData:', converted);
        setHabits(converted);
      } else {
        console.warn('⚠️ Nenhuma tarefa encontrada no Cofre');
        setHabits([]);
      }
    } catch (err) {
      console.error('Failed to fetch week tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeekTasks();

    // Set up real-time listener for orvax_agenda changes
    const unsubscribeOrvax = subscribeToOrvaxAgenda(() => {
      fetchWeekTasks();
    });

    if (unsubscribeOrvax) {
      unsubscribeRef.current.push(unsubscribeOrvax);
    }

    // Cleanup
    return () => {
      unsubscribeRef.current.forEach((unsub) => unsub?.());
      unsubscribeRef.current = [];
    };
  }, [fetchWeekTasks, subscribeToOrvaxAgenda]);

  // Handle toggling a task completion
  const handleToggle = useCallback(
    async (habitId: string, dayIndex: number) => {
      try {
        const habit = habits.find((h) => h.id === habitId);
        if (!habit) return;

        // Calculate which date this is
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));

        const targetDate = new Date(startOfWeek);
        targetDate.setDate(startOfWeek.getDate() + dayIndex);

        // Toggle state: pending -> done -> pending
        const currentState = habit.weekDays[dayIndex] ? 'done' : 'pending';
        const newState = currentState === 'done' ? 'pending' : 'done';

        // Update in database
        await updateTaskState(habitId, newState === 'done' ? 'done' : null);

        // Refresh data
        await fetchWeekTasks();
      } catch (err) {
        console.error('Failed to toggle task:', err);
      }
    },
    [habits, fetchWeekTasks]
  );

  if (loading) {
    return <div className="rounded-[28px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/80 p-6 text-center text-zinc-500">Carregando...</div>;
  }

  return (
    <ExecutionMatrix
      habits={habits}
      isDark={isDark}
      onToggle={handleToggle}
    />
  );
}
