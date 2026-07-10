import { supabase } from '../lib/supabase';
import { appEvents } from '../lib/events';

// ============================================================
// ORVAX Core — Habits service
// Tabelas: habits, habit_logs
// Triggers SQL cuidam da cascata (XP, daily_metrics)
// ============================================================

const session = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

export const PILLARS = ['disciplina', 'consistencia', 'foco', 'energia', 'evolucao'];

// ----- HABITS CRUD -----
export const listHabits = async ({ onlyActive = true } = {}) => {
    const s = await session();
    if (!s) return [];
    let q = supabase.from('habits').select('*').eq('user_id', s.user.id);
    if (onlyActive) q = q.eq('active', true);
    const { data } = await q.order('created_at', { ascending: false });
    return data || [];
};

export const createHabit = async (habit) => {
    const s = await session();
    if (!s) return { error: { message: 'no-session' } };

    // [ORVAX] XP atribuído automaticamente pela IA com base na complexidade real.
    // O usuário não define XP manualmente — quem avalia é o Agente.
    let xpReward = habit.xp_reward;
    if (xpReward == null) {
        try {
            const { estimateXP } = await import('./xpEstimator.js');
            const prompt = [habit.title, habit.cue, habit.reward].filter(Boolean).join(' — ');
            xpReward = await estimateXP(prompt);
        } catch {
            xpReward = 10; // fallback seguro
        }
    }

    const payload = {
        user_id: s.user.id,
        title: habit.title,
        cue: habit.cue || null,
        reward: habit.reward || null,
        frequency: habit.frequency || 'daily',
        target_count: habit.target_count ?? 1,
        pillar: habit.pillar || 'disciplina',
        xp_reward: xpReward,
        goal_id: habit.goal_id || null,
        active: true,
    };
    const result = await supabase.from('habits').insert([payload]).select().single();
    if (!result.error) appEvents.emit({ type: 'HABIT_CHANGED' });
    return result;
};

export const updateHabit = async (id, patch) => {
    const s = await session();
    if (!s) return null;
    const result = await supabase.from('habits').update(patch).eq('id', id).eq('user_id', s.user.id);
    if (!result.error) appEvents.emit({ type: 'HABIT_CHANGED' });
    return result;
};

export const deleteHabit = async (id) => {
    const s = await session();
    if (!s) return null;
    const result = await supabase.from('habits').delete().eq('id', id).eq('user_id', s.user.id);
    if (!result.error) appEvents.emit({ type: 'HABIT_CHANGED' });
    return result;
};

// ----- HABIT LOGS -----
// Registrar um check-in → trigger SQL cascata XP + daily_metrics
export const checkInHabit = async (habitId, { quality = 3, note = null } = {}) => {
    const s = await session();
    if (!s) return { error: { message: 'no-session' } };
    const result = await supabase.from('habit_logs').insert([{
        user_id: s.user.id,
        habit_id: habitId,
        quality,
        note,
    }]).select().single();
    if (!result.error) appEvents.emit({ type: 'HABIT_CHANGED' });
    return result;
};

// Undo check-in (Remove log de hoje)
export const undoCheckInHabit = async (habitId) => {
    const s = await session();
    if (!s) return { error: { message: 'no-session' } };
    
    // Janela do dia LOCAL (não UTC — após 21h BRT o dia UTC já virou)
    // e mesma coluna usada pela listagem (logged_at); senão o undo
    // não encontra o log que a UI mostra como feito.
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date();   end.setHours(23, 59, 59, 999);
    const result = await supabase
        .from('habit_logs')
        .delete()
        .eq('user_id', s.user.id)
        .eq('habit_id', habitId)
        .gte('logged_at', start.toISOString())
        .lte('logged_at', end.toISOString());

    if (!result.error) appEvents.emit({ type: 'HABIT_CHANGED' });
    return result;
};

// Lista hábitos do dia + se já foi feito hoje
export const listHabitsWithTodayStatus = async () => {
    const s = await session();
    if (!s) return [];

    // Hábitos ativos
    const { data: habits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', s.user.id)
        .eq('active', true)
        .order('created_at', { ascending: true });

    if (!habits || habits.length === 0) return [];

    // Logs de hoje (em BRT)
    const now = new Date();
    const startBRT = new Date(now);
    startBRT.setHours(0, 0, 0, 0);
    const { data: logs } = await supabase
        .from('habit_logs')
        .select('habit_id, logged_at')
        .eq('user_id', s.user.id)
        .gte('logged_at', startBRT.toISOString());

    const doneSet = new Set((logs || []).map(l => l.habit_id));
    return habits.map(h => ({ ...h, done_today: doneSet.has(h.id) }));
};

// Todos os logs do usuário nos últimos N dias (para o Compass/dimensões)
export const getRecentHabitLogs = async (days = 365) => {
    const s = await session();
    if (!s) return [];
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data } = await supabase
        .from('habit_logs')
        .select('habit_id, logged_at, quality')
        .eq('user_id', s.user.id)
        .gte('logged_at', since.toISOString())
        .order('logged_at', { ascending: true });
    return data || [];
};

// Logs de um hábito (últimos N)
export const getHabitLogs = async (habitId, limit = 30) => {
    const s = await session();
    if (!s) return [];
    const { data } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', s.user.id)
        .eq('habit_id', habitId)
        .order('logged_at', { ascending: false })
        .limit(limit);
    return data || [];
};
