import { supabase } from '../lib/supabase';

// --- PROFILE & XP ---
export const getProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
    return data;
};

export const updateAvatar = async (url) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase.from('profiles').update({ avatar_url: url }).eq('id', session.user.id);
};

// --- MENTOR SELECTION (PERSISTE NO BANCO PARA O AGENTE WHATSAPP) ---
export const updateSelectedMentor = async (mentorId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase.from('profiles').update({ selected_mentor: mentorId }).eq('id', session.user.id);
};

export const getSelectedMentor = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 'atlas';
    const { data } = await supabase.from('profiles').select('selected_mentor').eq('id', session.user.id).single();
    return data?.selected_mentor || 'atlas';
};

// --- PHONE NUMBER (VINCULAR TELEFONE PARA O AGENTE) ---
export const updatePhoneNumber = async (phone) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase.from('profiles').update({ phone_number: phone }).eq('id', session.user.id);
};

// --- TASKS (AGENDA) ---
export const getTasks = async (date) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    
    let query = supabase.from('tasks').select('*').eq('user_id', session.user.id);
    if (date) {
        query = query.eq('scheduled_date', date);
    }
    const { data } = await query.order('time_start', { ascending: true });
    return data || [];
};

export const createTask = async (task) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase.from('tasks').insert([{ ...task, user_id: session.user.id }]);
};

export const updateTaskState = async (taskId, state) => {
    return await supabase.from('tasks').update({ state }).eq('id', taskId);
};

// --- CAPITAL (TRANSACTIONS) ---
export const getTransactions = async (filter = 'all') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    
    let query = supabase.from('transactions').select('*').eq('user_id', session.user.id);
    
    const now = new Date();
    if (filter === 'SEM') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('date', lastWeek.toISOString().split('T')[0]);
    } else if (filter === 'MES') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query = query.gte('date', lastMonth.toISOString().split('T')[0]);
    } else if (filter === '3M') {
        const last3M = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        query = query.gte('date', last3M.toISOString().split('T')[0]);
    } else if (filter === '6M') {
        const last6M = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        query = query.gte('date', last6M.toISOString().split('T')[0]);
    } else if (filter === 'ANO') {
        const lastYear = new Date(now.getFullYear(), 0, 1);
        query = query.gte('date', lastYear.toISOString().split('T')[0]);
    }

    const { data } = await query.order('date', { ascending: false });
    return data || [];
};

export const createTransaction = async (transaction) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase.from('transactions').insert([{ ...transaction, user_id: session.user.id }]);
};

// --- FINANCIAL GOALS ---
export const getGoals = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data } = await supabase.from('financial_goals').select('*').eq('user_id', session.user.id).order('target_amount', { ascending: false });
    return data || [];
};

// --- MEDIA VAULT ---
export const getMedia = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data } = await supabase.from('media_vault').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    return data || [];
};

export const addMedia = async (media) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase.from('media_vault').insert([{ ...media, user_id: session.user.id }]);
};

// --- TELEMETRY ---
export const getTelemetryMetrics = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data } = await supabase.from('telemetry_metrics').select('*').eq('user_id', session.user.id);
    return data || [];
};

export const saveTelemetryMetric = async (metric) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase.from('telemetry_metrics').upsert([{ ...metric, user_id: session.user.id }]);
};

export const deleteTelemetryMetric = async (id) => {
    return await supabase.from('telemetry_metrics').delete().eq('id', id);
};

// --- BLOG POSTS ---
export const getBlogPosts = async (highlightsOnly = false) => {
    let query = supabase.from('blog_posts').select('*').eq('published', true);
    if (highlightsOnly) {
        query = query.eq('is_highlight', true).order('highlight_order', { ascending: true });
    } else {
        query = query.order('created_at', { ascending: false });
    }
    const { data } = await query;
    return data || [];
};

// --- ACHIEVEMENTS ---
export const getAllAchievements = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { all: [], unlocked: [] };

    const [{ data: all }, { data: unlocked }] = await Promise.all([
        supabase.from('achievements').select('*').order('sort_order', { ascending: true }),
        supabase.from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', session.user.id)
    ]);

    const unlockedIds = new Set((unlocked || []).map(u => u.achievement_id));
    const unlockedMap = Object.fromEntries((unlocked || []).map(u => [u.achievement_id, u.unlocked_at]));

    return {
        all: (all || []).map(a => ({
            ...a,
            unlocked: unlockedIds.has(a.id),
            unlocked_at: unlockedMap[a.id] || null
        })),
        unlocked: unlocked || [],
        total: (all || []).length,
        completedCount: unlockedIds.size
    };
};

export const checkAndUnlockAchievements = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data } = await supabase.rpc('check_achievements', { p_user_id: session.user.id });
    return data || [];
};

// --- FOCUS SESSIONS ---
export const createFocusSession = async (session_data) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data } = await supabase.from('focus_sessions').insert([{ ...session_data, user_id: session.user.id }]).select().single();
    return data;
};

export const completeFocusSession = async (sessionId, actualMinutes) => {
    return await supabase.from('focus_sessions').update({
        completed: true,
        actual_minutes: actualMinutes,
        ended_at: new Date().toISOString()
    }).eq('id', sessionId);
};

export const getTotalFocusToday = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 0;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('focus_sessions')
        .select('actual_minutes, duration_minutes, completed')
        .eq('user_id', session.user.id)
        .gte('started_at', today);
    if (!data) return 0;
    return data.reduce((sum, s) => sum + (s.completed ? (s.actual_minutes || s.duration_minutes) : 0), 0);
};

// --- DAILY ACTIVITY (WEEK STATUS) ---
export const getWeekActivity = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    // Pegar últimos 7 dias
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const { data } = await supabase.from('daily_activity')
        .select('activity_date, tasks_completed, focus_minutes, xp_earned, active')
        .eq('user_id', session.user.id)
        .gte('activity_date', weekAgo.toISOString().split('T')[0])
        .lte('activity_date', today.toISOString().split('T')[0])
        .order('activity_date', { ascending: true });

    // Mapear para array de 7 booleans (seg a dom)
    const activityMap = new Map((data || []).map(d => [d.activity_date, d.active]));
    const weekStatus = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekAgo);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        weekStatus.push(activityMap.get(dateStr) || false);
    }
    return weekStatus;
};

export const getDailyStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { tasks_completed: 0, tasks_total: 0, focus_minutes: 0 };

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('daily_activity')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('activity_date', today)
        .single();

    return data || { tasks_completed: 0, tasks_total: 0, focus_minutes: 0 };
};

// --- GOALS (TELEMETRIA) ---
export const getUserGoals = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data } = await supabase.from('goals').select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false });
    return data || [];
};

export const createGoal = async (goal) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase.from('goals').insert([{ ...goal, user_id: session.user.id }]).select().single();
};

export const updateGoalProgress = async (goalId, progress, status) => {
    const update = { progress, updated_at: new Date().toISOString() };
    if (status) update.status = status;
    return await supabase.from('goals').update(update).eq('id', goalId);
};

// --- TELEMETRY HISTORY (RADAR CHART SEMANAL) ---
export const getTelemetryHistory = async (days = 7) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data } = await supabase.from('telemetry_history')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('recorded_date', since.toISOString().split('T')[0])
        .order('recorded_date', { ascending: true });
    return data || [];
};

export const saveTelemetrySnapshot = async (scores) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const today = new Date().toISOString().split('T')[0];
    const rows = Object.entries(scores).map(([key, score]) => ({
        user_id: session.user.id,
        metric_key: key,
        score,
        recorded_date: today
    }));
    return await supabase.from('telemetry_history').upsert(rows, { onConflict: 'user_id,metric_key,recorded_date' });
};

// --- NOTES ---
export const getUserNotes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data } = await supabase.from('user_notes').select('*')
        .eq('user_id', session.user.id)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });
    return data || [];
};

export const createNote = async (note) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase.from('user_notes').insert([{ ...note, user_id: session.user.id }]).select().single();
};

export const updateNote = async (noteId, updates) => {
    return await supabase.from('user_notes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', noteId);
};

export const deleteNote = async (noteId) => {
    return await supabase.from('user_notes').delete().eq('id', noteId);
};

// --- MONTHLY FINANCIAL SUMMARY (PARA CHARTS) ---
export const getMonthlyFinancialSummary = async (months = 12) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const { data } = await supabase.from('transactions')
        .select('date, type, amount')
        .eq('user_id', session.user.id)
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: true });

    if (!data || data.length === 0) return [];

    // Agrupar por mês
    const monthMap = {};
    data.forEach(t => {
        const month = t.date.substring(0, 7); // YYYY-MM
        if (!monthMap[month]) monthMap[month] = { income: 0, expense: 0, net: 0 };
        const amount = Math.abs(parseFloat(t.amount) || 0);
        if (t.type === 'income') {
            monthMap[month].income += amount;
            monthMap[month].net += amount;
        } else {
            monthMap[month].expense += amount;
            monthMap[month].net -= amount;
        }
    });

    return Object.entries(monthMap).map(([month, data]) => ({
        month,
        ...data
    })).sort((a, b) => a.month.localeCompare(b.month));
};

// --- RANK HELPER ---
export const getRankFromXP = (xp) => {
    if (xp >= 10000) return { rank: 'Ø', title: 'SINGULARIDADE OMEGA', nextAt: null, progress: 100 };
    if (xp >= 5000) return { rank: 'S', title: 'SISTEMA AUTÔNOMO', nextAt: 10000, progress: ((xp - 5000) / 5000) * 100 };
    if (xp >= 2000) return { rank: 'A+', title: 'MESTRE DE SISTEMAS', nextAt: 5000, progress: ((xp - 2000) / 3000) * 100 };
    if (xp >= 1000) return { rank: 'A', title: 'ARQUITETO DE DADOS', nextAt: 2000, progress: ((xp - 1000) / 1000) * 100 };
    if (xp >= 500) return { rank: 'B', title: 'OPERADOR SENIOR', nextAt: 1000, progress: ((xp - 500) / 500) * 100 };
    if (xp >= 200) return { rank: 'C', title: 'ANALISTA ALPHA', nextAt: 500, progress: ((xp - 200) / 300) * 100 };
    if (xp >= 50) return { rank: 'D', title: 'AGENTE NOVATO', nextAt: 200, progress: ((xp - 50) / 150) * 100 };
    return { rank: 'E', title: 'RECRUTA KRS', nextAt: 50, progress: (xp / 50) * 100 };
};

// --- STREAK (CALCULADO REAL) ---
export const getStreak = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 0;
    const { data } = await supabase.rpc('calculate_streak', { p_user_id: session.user.id });
    return data || 0;
};

// --- GROUPS ---
export const getMyGroups = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data } = await supabase
        .from('ranking_groups')
        .select('*, ranking_group_members!inner(*)')
        .eq('ranking_group_members.user_id', session.user.id);
    return data || [];
};

export const createGroup = async (name) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // 1. Create group
    const { data: group, error } = await supabase.from('ranking_groups').insert([{ name, owner_id: session.user.id }]).select().single();
    if (error) return null;

    // 2. Add owner as member
    await supabase.from('ranking_group_members').insert([{ group_id: group.id, user_id: session.user.id }]);
    return group;
};
