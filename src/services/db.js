import { supabase } from '../lib/supabase';
import { appEvents } from '../lib/events';

// [BUG #11 FIX] Helper para obter data local (YYYY-MM-DD) sem deslocamento UTC.
// new Date().toISOString() converte para UTC antes de extrair a data, causando
// data errada após 21:00 BRT (UTC-3). Use sempre esta função para datas do tipo date.
const toLocalDateStr = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// --- PROFILE & XP ---
export const getProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
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
    const { data } = await supabase.from('profiles').select('selected_mentor').eq('id', session.user.id).maybeSingle();
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
    const result = await supabase.from('tasks').insert([{ ...task, user_id: session.user.id }]);
    if (!result.error) appEvents.emit({ type: 'TASK_CHANGED' });
    return result;
};

// [BUG #9 FIX] Adicionado filtro user_id para defesa em profundidade além do RLS
export const updateTaskState = async (taskId, state) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const result = await supabase.from('tasks')
        .update({ state })
        .eq('id', taskId)
        .eq('user_id', session.user.id);
    if (!result.error) appEvents.emit({ type: 'TASK_CHANGED' });
    return result;
};

// [BUG #2 + #9 FIX] deleteTask agora filtra por user_id
// Requer política RLS DELETE na tabela tasks — ver SQL do relatório QA
export const deleteTask = async (taskId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const result = await supabase.from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', session.user.id);
    if (!result.error) appEvents.emit({ type: 'TASK_CHANGED' });
    return result;
};

// --- CAPITAL (TRANSACTIONS) ---
export const getTransactions = async (filter = 'all') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    
    let query = supabase.from('transactions').select('*').eq('user_id', session.user.id);
    
    const now = new Date();
    if (filter === 'SEM') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('date', toLocalDateStr(lastWeek));
    } else if (filter === 'MES') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query = query.gte('date', toLocalDateStr(lastMonth));
    } else if (filter === '3M') {
        const last3M = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        query = query.gte('date', toLocalDateStr(last3M));
    } else if (filter === '6M') {
        const last6M = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        query = query.gte('date', toLocalDateStr(last6M));
    } else if (filter === 'ANO') {
        const lastYear = new Date(now.getFullYear(), 0, 1);
        query = query.gte('date', toLocalDateStr(lastYear));
    }

    const { data } = await query.order('date', { ascending: false });
    return data || [];
};

export const createTransaction = async (transaction) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const result = await supabase.from('transactions').insert([{ ...transaction, user_id: session.user.id }]);
    if (!result.error) appEvents.emit({ type: 'TRANSACTION_CHANGED' });
    return result;
};

export const deleteTransaction = async (id) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const result = await supabase.from('transactions').delete().eq('id', id).eq('user_id', session.user.id);
    if (!result.error) appEvents.emit({ type: 'TRANSACTION_CHANGED' });
    return result;
};

// --- FINANCIAL GOALS ---
export const getGoals = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data } = await supabase.from('financial_goals').select('*').eq('user_id', session.user.id).order('target_amount', { ascending: false });
    return data || [];
};

export const createFinancialGoal = async (goal) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Destructure out 'category' and 'name'
    const { category, name, title, ...cleanGoal } = goal;
    const finalTitle = title || name || 'Nova Meta';

    const { data, error } = await supabase
        .from('financial_goals')
        .insert([{ ...cleanGoal, title: finalTitle, user_id: session.user.id, current_amount: 0 }])
        .select()
        .single();
    if (error) throw error;
    appEvents.emit({ type: 'GOAL_CHANGED' });
    return data;
};

export const deleteFinancialGoal = async (id) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const result = await supabase.from('financial_goals').delete().eq('id', id).eq('user_id', session.user.id);
    if (!result.error) appEvents.emit({ type: 'GOAL_CHANGED' });
    return result;
};

export const updateFinancialGoalProgress = async (id, amountToAdd) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    const { data: currentGoal } = await supabase.from('financial_goals').select('current_amount').eq('id', id).maybeSingle();
    if (!currentGoal) return null;

    const newAmount = Number(currentGoal.current_amount || 0) + Number(amountToAdd);
    
    const { data, error } = await supabase.from('financial_goals')
        .update({ current_amount: newAmount })
        .eq('id', id)
        .eq('user_id', session.user.id)
        .select()
        .single();
    if (data) appEvents.emit({ type: 'GOAL_CHANGED' });
    return data;
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

export const deleteMedia = async (id) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase.from('media_vault').delete().eq('id', id).eq('user_id', session.user.id);
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
    const result = await supabase.from('telemetry_metrics').upsert([{ ...metric, user_id: session.user.id }]);
    if (!result.error) appEvents.emit({ type: 'DAY_LOGGED' });
    return result;
};

export const deleteTelemetryMetric = async (id) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const result = await supabase.from('telemetry_metrics').delete().eq('id', id).eq('user_id', session.user.id);
    if (!result.error) appEvents.emit({ type: 'DAY_LOGGED' });
    return result;
};

// --- BLOG POSTS ---
export const getBlogPosts = async (highlightsOnly = false) => {
    try {
        let query = supabase.from('blog_posts').select('*').eq('published', true);
        if (highlightsOnly) {
            query = query.eq('is_highlight', true).order('highlight_order', { ascending: true });
        } else {
            query = query.order('created_at', { ascending: false });
        }
        const { data, error } = await query;
        if (error) return [];
        return data || [];
    } catch (e) {
        return [];
    }
};

export const createBlogPost = async (post) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const dt = new Date();
    const { data, error } = await supabase.from('blog_posts').insert([{
        title: post.title,
        content: post.content,
        summary: post.summary || '',
        category: post.category || 'GERAL',
        image_url: post.image_url || null,
        author_name: post.author_name || 'ORVAX',
        is_highlight: post.is_highlight || false,
        published: true,
        read_time_min: post.read_time_min || Math.ceil((post.content || '').split(' ').length / 200) || 3,
        date_day: String(dt.getDate()).padStart(2, '0'),
        date_month: dt.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''),
        created_at: dt.toISOString(),
    }]).select().single();
    if (error) { console.error('createBlogPost error:', error); return null; }
    return data;
};

export const deleteBlogPost = async (postId) => {
    const { error } = await supabase.from('blog_posts').delete().eq('id', postId);
    if (error) console.error('deleteBlogPost error:', error);
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
    const today = toLocalDateStr();
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
        .gte('activity_date', toLocalDateStr(weekAgo))
        .lte('activity_date', toLocalDateStr(today))
        .order('activity_date', { ascending: true });

    // Mapear para array de 7 booleans (seg a dom)
    const activityMap = new Map((data || []).map(d => [d.activity_date, d.active]));
    const weekStatus = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekAgo);
        d.setDate(d.getDate() + i);
        const dateStr = toLocalDateStr(d);
        weekStatus.push(activityMap.get(dateStr) || false);
    }
    return weekStatus;
};

export const getDailyStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { tasks_completed: 0, tasks_total: 0, focus_minutes: 0 };

    const today = toLocalDateStr();
    const { data } = await supabase.from('daily_activity')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('activity_date', today)
        .maybeSingle();

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

// [ORVAX] Atualiza o valor concreto atual (ex: 1.5 km corridos). O trigger
// no banco recalcula o progress (%) automaticamente.
export const updateGoalCurrentValue = async (goalId, currentValue) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase
        .from('goals')
        .update({ current_value: currentValue, updated_at: new Date().toISOString() })
        .eq('id', goalId)
        .eq('user_id', session.user.id);
};

export const deleteGoal = async (goalId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase.from('goals').delete().eq('id', goalId).eq('user_id', session.user.id);
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
        .gte('recorded_date', toLocalDateStr(since))
        .order('recorded_date', { ascending: true });
    return data || [];
};

export const saveTelemetrySnapshot = async (scores) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const today = toLocalDateStr();
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
    // [AUDIT FIX] Defense-in-depth: also filter by user_id beyond RLS
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return await supabase.from('user_notes').delete().eq('id', noteId).eq('user_id', session.user.id);
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
        .gte('date', toLocalDateStr(since))
        .order('date', { ascending: true });

    if (!data || data.length === 0) return [];

    // Agrupar por mês
    const monthMap = {};
    data.forEach(t => {
        const month = t.date.substring(0, 7); // YYYY-MM
        if (!monthMap[month]) monthMap[month] = { income: 0, expense: 0, net: 0 };
        const amount = Math.abs(parseFloat(t.amount) || 0);
        if (t.type === 'in') {
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
// [ORVAX] Fórmula matemática pura: cada passo DOBRA o delta anterior.
// delta(E- → E) = 100. delta(E → E+) = 200. delta(E+ → D-) = 400. E assim por diante.
// Isso gera um Ø (singularidade) naturalmente inalcançável — a escala é a vida inteira.
// minXP é acumulado: minXP[n] = minXP[n-1] + 100 * 2^(n-1)
export const RANK_DEFS = (() => {
    const META = [
        ['E-',  'FASE DE INÉRCIA',          '#ef4444', 'CRÍTICO'],
        ['E',   'OBSERVADOR PASSIVO',       '#ef4444', 'CRÍTICO'],
        ['E+',  'DESPERTAR TÉCNICO',        '#f87171', 'ALERTA'],
        ['D-',  'INICIANTE SISTÊMICO',      '#f97316', 'INSTÁVEL'],
        ['D',   'OPERADOR DE BAIXA FREQ.',  '#f97316', 'INSTÁVEL'],
        ['D+',  'CANDIDATO A AGENTE',       '#fb923c', 'ADAPTANDO'],
        ['C-',  'MÓDULO DE ESTABILIDADE',   '#eab308', 'ESTÁVEL'],
        ['C',   'OPERADOR DISCIPLINADO',    '#eab308', 'ESTÁVEL'],
        ['C+',  'TÉCNICO DE PERFORMANCE',   '#facc15', 'ESTÁVEL'],
        ['B-',  'AGENTE DE CAMPO',          '#3b82f6', 'OPERANTE'],
        ['B',   'AGENTE KAIROS',            '#3b82f6', 'OPERANTE'],
        ['B+',  'AGENTE VETERANO',          '#60a5fa', 'AVANÇADO'],
        ['A-',  'ESPECIALISTA EM FLUXO',    '#38bdf8', 'ELITE'],
        ['A',   'ELITE COMPUTACIONAL',      '#38bdf8', 'ELITE'],
        ['A+',  'MESTRE DA EXECUÇÃO',       '#7dd3fc', 'MÁXIMO'],
        ['S-',  'ARQUÉTIPO SUPERIOR',       '#22c55e', 'SUPREMO'],
        ['S',   'SOBERANO',                 '#22c55e', 'SUPREMO'],
        ['S+',  'ENTIDADE DE PERFORMANCE',  '#4ade80', 'SUPREMO'],
        ['SS-', 'SOBERANO ABSOLUTO',        '#2dd4bf', 'ABSOLUTO'],
        ['SS',  'DIVINDADE TÉCNICA',        '#2dd4bf', 'ABSOLUTO'],
        ['SS+', 'VANGUARDA NEURAL',         '#5eead4', 'ABSOLUTO'],
        ['X-',  'CIFRA DO SISTEMA',         '#f43f5e', 'TRANSCENDENTE'],
        ['X',   'DREADNOUGHT',              '#f43f5e', 'TRANSCENDENTE'],
        ['X+',  'NÊMESIS DO CAOS',          '#fb7185', 'TRANSCENDENTE'],
        ['Ø',   'SINGULARIDADE OMEGA',      null,      'OMEGA'],
    ];
    let cum = 0;
    return META.map(([rank, title, color, status], idx) => {
        const minXP = cum;
        // delta pro próximo nível = 100 * 2^idx
        cum += 100 * Math.pow(2, idx);
        return { rank, title, minXP, color, status };
    });
})();

export const getRankFromXP = (xp) => {
    const RANKS = RANK_DEFS;
    let currentIdx = 0;
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (xp >= RANKS[i].minXP) { currentIdx = i; break; }
    }

    const current = RANKS[currentIdx];
    const next = RANKS[currentIdx + 1];
    const progress = next
        ? ((xp - current.minXP) / (next.minXP - current.minXP)) * 100
        : 100;

    return {
        rank: current.rank,
        title: current.title,
        nextAt: next?.minXP || null,
        progress,
        color: current.color,
        status: current.status,
        currentMin: current.minXP,
        deltaToNext: next ? next.minXP - current.minXP : 0
    };
};

// --- STREAK (CALCULADO REAL) ---
export const getStreak = async () => {
    const act = await getWeekActivity();
    let streak = 0;
    // act is an array of 7 booleans (today is index 6, or similar, wait, getWeekActivity returns [mon, tue...])
    // Instead of guessing, we just count the consecutive true values from the end
    for (let i = act.length - 1; i >= 0; i--) {
        if (act[i]) streak++;
        else if (i !== act.length - 1) break; // if today is false, check yesterday. If yesterday is false, streak breaks.
    }
    return streak;
};

// ============================================================
// ORVAX CORE — Dashboard unificado (lê v_user_pillars_7d + RPC)
// ============================================================
export const getDashboard = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data, error } = await supabase.rpc('get_dashboard');
    if (error) {
        console.warn('[getDashboard] RPC falhou:', error.message);
        return null;
    }
    return data;
};

// Histórico diário (para sparklines dos pilares)
export const getDailyMetrics = async (days = 30) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('day', since.toISOString().slice(0, 10))
        .order('day', { ascending: true });
    return data || [];
};

// Últimos ganhos de XP (para feed de atividade)
export const getXpLog = async (limit = 20) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const { data } = await supabase
        .from('xp_log')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
    return data || [];
};

// ============================================================
// Feed de ATRIBUIÇÃO — XP enriquecido com título/origem
// Resolve source_id contra tasks/habits/goals para mostrar
// de ONDE veio cada ganho de XP no dashboard de métricas.
// ============================================================
export const getXpFeed = async (limit = 25) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];

    const { data: logs } = await supabase
        .from('xp_log')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (!logs || logs.length === 0) return [];

    // Agrupa source_ids por tabela
    const taskIds = [], habitIds = [], goalIds = [];
    for (const l of logs) {
        if (!l.source_id) continue;
        if (l.source === 'task_done') taskIds.push(l.source_id);
        else if (l.source === 'habit_done') habitIds.push(l.source_id);
        else if (l.source === 'goal_progress' || l.source === 'goal_complete') goalIds.push(l.source_id);
    }

    const [tasksRes, habitsRes, goalsRes] = await Promise.all([
        taskIds.length
            ? supabase.from('tasks').select('id, title, category, pillar').in('id', taskIds)
            : Promise.resolve({ data: [] }),
        habitIds.length
            ? supabase.from('habits').select('id, title, pillar').in('id', habitIds)
            : Promise.resolve({ data: [] }),
        goalIds.length
            ? supabase.from('goals').select('id, title, category, progress, current_value, target_value, unit').in('id', goalIds)
            : Promise.resolve({ data: [] }),
    ]);

    const taskMap = new Map((tasksRes.data || []).map(t => [t.id, t]));
    const habitMap = new Map((habitsRes.data || []).map(h => [h.id, h]));
    const goalMap = new Map((goalsRes.data || []).map(g => [g.id, g]));

    return logs.map(l => {
        let title = 'Atividade ORVAX';
        let area = 'sistema';
        let pillar = null;
        let detail = null;

        if (l.source === 'task_done') {
            const t = taskMap.get(l.source_id);
            if (t) { title = t.title; area = (t.category || 'agenda').toLowerCase(); pillar = t.pillar; }
            else { title = 'Tarefa concluída'; area = 'agenda'; }
        } else if (l.source === 'habit_done') {
            const h = habitMap.get(l.source_id);
            if (h) { title = h.title; pillar = h.pillar; }
            else { title = 'Hábito'; }
            area = 'hábito';
        } else if (l.source === 'goal_complete') {
            const g = goalMap.get(l.source_id);
            title = g ? `✓ Meta: ${g.title}` : 'Meta concluída';
            area = (g?.category || 'meta').toLowerCase();
            pillar = 'evolucao';
        } else if (l.source === 'goal_progress') {
            const g = goalMap.get(l.source_id);
            title = g ? `Meta: ${g.title}` : 'Progresso de meta';
            area = (g?.category || 'meta').toLowerCase();
            pillar = 'evolucao';
            if (g?.target_value && g?.unit) {
                detail = `${g.current_value ?? 0} / ${g.target_value} ${g.unit}`;
            } else if (g?.progress != null) {
                detail = `${g.progress}%`;
            }
        }

        return {
            id: l.id,
            source: l.source,
            source_id: l.source_id,
            title,
            area,
            pillar,
            amount: l.amount,
            detail,
            created_at: l.created_at,
        };
    });
};

// ============================================================
// Perfil Público — dados reais de outro usuário para Ranking
// ============================================================
export const getPublicProfile = async (userId) => {
    if (!userId) return null;
    const { data, error } = await supabase.rpc('get_public_profile', { p_user: userId });
    if (error) {
        console.warn('[getPublicProfile] erro:', error.message);
        return null;
    }
    return data;
};

// ============================================================
// Friendships
// ============================================================
export const listFriends = async () => {
    const { data, error } = await supabase.rpc('list_friends');
    if (error) { console.warn('[listFriends]', error.message); return []; }
    return data || [];
};

export const listFriendRequests = async () => {
    const { data, error } = await supabase.rpc('list_friend_requests');
    if (error) { console.warn('[listFriendRequests]', error.message); return []; }
    return data || [];
};

export const searchUsers = async (q) => {
    if (!q || q.trim().length < 2) return [];
    const { data, error } = await supabase.rpc('search_users', { q: q.trim() });
    if (error) { console.warn('[searchUsers]', error.message); return []; }
    return data || [];
};

export const sendFriendRequest = async (friendId) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: { message: 'no-session' } };
    return await supabase.from('friendships').insert([{
        requester_id: session.user.id,
        addressee_id: friendId,
        status: 'pending',
    }]).select().single();
};

export const acceptFriendRequest = async (friendshipId) => {
    return await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)
        .select()
        .single();
};

export const rejectFriendRequest = async (friendshipId) => {
    return await supabase.from('friendships').delete().eq('id', friendshipId);
};

export const removeFriend = async (friendshipId) => {
    return await supabase.from('friendships').delete().eq('id', friendshipId);
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
