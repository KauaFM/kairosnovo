import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { 
    Calendar as CalendarIcon, 
    Image as ImageIcon, 
    FileText, 
    DollarSign, 
    Target, 
    Zap, 
    Plus, 
    Clock, 
    CheckCircle2, 
    CalendarDays, 
    AlertCircle, 
    Send, 
    Trash2, 
    Dumbbell, 
    Brain, 
    Quote,
    BookOpen,
    Users,
    Timer,
    Flame,
    X,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { getTasks, getAgendaItems, setEventStatus, deleteEvent, createTask, updateTaskState, deleteTask, getMedia, addMedia, deleteMedia, getProfile, getDailyStats, getTotalFocusToday, getUserNotes, createNote, deleteNote } from '../services/db';
import { appEvents } from '../lib/events';
import FullCalendar from './FullCalendar';
import CapitalViewNew from './CapitalViewNew';
import ScrollReveal from './ScrollReveal';
import { ScrollContainer, OrvaxHeader } from './BaseLayout';
import { compressImage } from '../utils/imageCompression';
import { ExecutionBoard } from '../features/vault/components/ExecutionBoard';
import { useLang } from '../i18n/LanguageContext';

const Vault = ({ habits = [], theme, toggleTheme }) => {
    const { t, lang } = useLang();
    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [mode, setMode] = useState('execucao'); // 'execucao' | 'agenda' | 'archive' | 'notes' | 'capital'
    const [isFullCalendarOpen, setIsFullCalendarOpen] = useState(false);
    const [capitalNode, setCapitalNode] = useState(null);

    // Dynamic States
    const [newNote, setNewNote] = useState('');
    const [notes, setNotes] = useState([]);
    const [timelineTasks, setTimelineTasks] = useState([]);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [fullscreenPhoto, setFullscreenPhoto] = useState(false);
    const [archiveLogs, setArchiveLogs] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [dailyMetrics, setDailyMetrics] = useState({ tasks_completed: 0, tasks_total: 0, focus_minutes: 0 });

    // Form States
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', time_start: '09:00', category: 'FOCO' });
    const [showAddMedia, setShowAddMedia] = useState(false);
    const [newMedia, setNewMedia] = useState({ file_url: '', description: '', segment: 'TREINO' });
    const [isCompressing, setIsCompressing] = useState(false);
    const vaultImageRef = React.useRef(null);

    const handleVaultImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsCompressing(true);
        try {
            // Compress image to Base64 (max 1024, 75% quality for Vault archiving)
            const result = await compressImage(file, { maxDimension: 1024, quality: 0.75 });
            setNewMedia({ ...newMedia, file_url: result.base64 });
        } catch(err) {
            console.error("Compression Error:", err);
            alert(t('vault.compressFail'));
        } finally {
            setIsCompressing(false);
        }
    };

    // Core Fetch Function
    const fetchVaultData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 1. Puxar Perfil (para streak)
        const profile = await getProfile();
        setUserProfile(profile);

        // 2. Puxar Anotações (tabela user_notes)
        const userNotes = await getUserNotes();
        setNotes(userNotes.map(n => ({
            id: n.id,
            date: new Date(n.updated_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase(),
            text: n.content || n.title || t('vault.noteEmpty')
        })));

        // 3. Puxar Tarefas (Tabela customizada 'tasks')
        // [BUG #11 FIX] Usar data local ao invés de UTC para evitar deslocamento de fuso
        const toLocalDateStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const dateStr = toLocalDateStr(selectedDate);
        // Agenda unificada: tarefas + eventos/calls/lembretes/pagamentos
        const agenda = await getAgendaItems(dateStr);
        setTimelineTasks(agenda.map(it => {
            const hh = parseInt((it.time_start || '').split(':')[0]);
            return {
                id: it.id,
                source: it.source,
                time: it.time_start,
                period: Number.isFinite(hh) && hh >= 12 ? 'PM' : 'AM',
                title: it.title,
                category: it.category || 'GERAL',
                date: it.scheduled_date,
                duration: it.duration || (it.source === 'event' ? '' : '1h'),
                state: it.state,
            };
        }));

        // 4. Puxar métricas diárias (conta tarefas + eventos do dia)
        const daily = await getDailyStats();
        const focusToday = await getTotalFocusToday();
        const todayItems = await getAgendaItems(toLocalDateStr());
        const completedCount = todayItems.filter(t => t.state === 'done').length;
        setDailyMetrics({
            tasks_completed: completedCount,
            tasks_total: todayItems.length,
            focus_minutes: daily.focus_minutes || focusToday || 0
        });

        // 5. Puxar Mídia (Tabela customizada 'media_vault')
        const media = await getMedia();
        setArchiveLogs(media.map(m => ({
            id: m.id,
            imgUrl: m.file_url,
            title: m.description || t('vault.noTitle'),
            type: m.segment || 'GERAL',
            date: new Date(m.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' }).toUpperCase(),
            time: new Date(m.created_at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' }),
            metric: '--',
            note: m.description,
            icon: m.segment === 'TREINO' ? Dumbbell : m.segment === 'FOCO' ? Brain : Quote
        })));
    };

    // Setup real-time sync listeners
    const unsubscribeRef = useRef(null);

    useEffect(() => {
        fetchVaultData();

        // Realtime: agenda (tasks + universal_events), notas e mídia.
        // 'tasks'/'universal_events' cobrem criações do mentor, do +CRIAR
        // e do agente WhatsApp em outro dispositivo.
        const subscription = supabase
            .channel('vault-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchVaultData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'universal_events' }, () => fetchVaultData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notes' }, () => fetchVaultData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'media_vault' }, () => fetchVaultData())
            .subscribe();

        // Barramento interno: mentor/CreationHub emitem TASK_CHANGED etc.
        // na mesma aba (o realtime nem sempre ecoa a própria escrita).
        const unsubBus = appEvents.subscribe(() => fetchVaultData());

        unsubscribeRef.current = subscription;

        return () => {
            if (unsubscribeRef.current) {
                supabase.removeChannel(unsubscribeRef.current);
            }
            unsubBus();
        };
    }, [selectedDate]);

    const handleAddTask = async () => {
        if (!newTask.title) return;
        // [BUG #11 FIX] Usar data local
        const toLocalDateStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const dateStr = toLocalDateStr(selectedDate);
        await createTask({ ...newTask, scheduled_date: dateStr });
        setNewTask({ title: '', time_start: '09:00', category: 'FOCO' });
        setShowAddTask(false);
        fetchVaultData();
    };

    const handleToggleTask = async (id, currentState, source = 'task') => {
        if (source === 'event') {
            // Eventos: alterna concluído <-> agendado (sem estado "falhou")
            const nextStatus = currentState === 'done' ? 'scheduled' : 'done';
            setTimelineTasks(tasks => tasks.map(t => t.id === id ? { ...t, state: nextStatus === 'done' ? 'done' : 'pending' } : t));
            await setEventStatus(id, nextStatus);
            fetchVaultData();
            return;
        }
        // Tarefas: progressão cíclica pendente -> done -> failed -> pendente
        let nextState = 'done';
        if (currentState === 'done') nextState = 'failed';
        else if (currentState === 'failed') nextState = null;
        else if (currentState === 'active') nextState = 'done';

        // Atualização Otimista
        setTimelineTasks(tasks => tasks.map(t => t.id === id ? { ...t, state: nextState } : t));

        await updateTaskState(id, nextState);
        fetchVaultData();
    };

    const handleDeleteTask = async (e, id, source = 'task') => {
        e.stopPropagation(); // Evita ativar tela ou toggle da tarefa
        if (!window.confirm(t('vault.confirmDeleteTask'))) return;

        // Atualização Otimista
        setTimelineTasks(tasks => tasks.filter(t => t.id !== id));

        if (source === 'event') {
            await deleteEvent(id);
        } else {
            await deleteTask(id);
        }
        fetchVaultData();
    };

    const handleUploadMedia = async () => {
        if (!newMedia.file_url) return;
        await addMedia(newMedia);
        setNewMedia({ file_url: '', description: '', segment: 'TREINO' });
        setShowAddMedia(false);
        fetchVaultData();
    };

    const handleDeleteMedia = async (id) => {
        if (!window.confirm(t('vault.confirmDeleteMedia'))) return;
        try {
            await deleteMedia(id);
            if (fullscreenPhoto?.id === id) {
                setFullscreenPhoto(false);
                setSelectedPhoto(null);
            }
            fetchVaultData();
        } catch (err) {
            console.error("Erro ao deletar mídia", err);
        }
    };



    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        try {
            const result = await createNote({ title: newNote.trim().slice(0, 80), content: newNote.trim() });
            if (result && result.error) {
                console.error('Supabase Notes Error:', result.error);
                throw result.error;
            }
            setNewNote('');
            fetchVaultData();
        } catch (err) {
            console.error('createNote Fallback:', err);
            // Fallback local: Injeta a nota na UI de imediato para não impactar a experiência
            setNotes([{
                id: Math.random(),
                date: new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase(),
                text: newNote.trim()
            }, ...notes]);
            setNewNote('');
        }
    };

    const handleDeleteNote = async (id) => {
        setNotes(notes.filter(note => note.id !== id));
        await deleteNote(id);
    };

    // Agenda: Calendário real (semana atual)
    const week = useMemo(() => {
        const d = new Date();
        const currentDayOfWeek = d.getDay(); 
        const weekArr = [];
        const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - currentDayOfWeek);
        for (let i = 0; i < 7; i++) {
            const tempDate = new Date(startOfWeek);
            tempDate.setDate(startOfWeek.getDate() + i);
            weekArr.push({
                day: days[tempDate.getDay()],
                num: tempDate.getDate(),
                month: tempDate.getMonth(),
                year: tempDate.getFullYear(),
                isToday: tempDate.getDate() === d.getDate() && tempDate.getMonth() === d.getMonth() && tempDate.getFullYear() === d.getFullYear()
            });
        }
        return weekArr;
    }, []);

    // Arquivo Visuais agora começam vazios, aguardando futuras implementações de Habit Tracking
    // O foco agora é Agenda e Notas


    return (
        <ScrollContainer>
            <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />
            <div className="animate-in slide-in-from-left-4 duration-700 delay-100 pb-32 font-sans" style={{ color: 'var(--text-main)' }}>

                {/* Header & Mode Toggle */}
                <div className="mb-6 px-6 pt-0">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-[10px] font-mono opacity-40 tracking-[0.4em] uppercase mb-2 shadow-sm">{t('vault.gridTitle')}</h2>
                            <h1 className="text-2xl font-syncopate font-black tracking-widest text-glow uppercase">{t('vault.title')}</h1>
                        </div>
                    </div>

                {/* Minimalist Switcher */}
                <div className="relative">
                    <div className="flex bg-current/5 p-1 rounded-2xl border backdrop-blur-md overflow-x-auto no-scrollbar" style={{ borderColor: 'var(--border-color)', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x proximity', overscrollBehaviorX: 'contain' }}>
                        <button
                            onClick={() => setMode('execucao')}
                            className={`shrink-0 min-w-[92px] py-3 text-[8.5px] sm:text-[9px] font-mono uppercase tracking-widest rounded-xl transition-all duration-300 flex justify-center items-center gap-1.5
                                ${mode === 'execucao' ? 'bg-[var(--bg-color)] shadow-sm font-bold opacity-100 text-[var(--orvax-green)]' : 'opacity-40 hover:opacity-100'}
                            `}
                        >
                            <Zap size={12} className="shrink-0" />
                            <span className="hidden sm:inline">{t('vault.tabExec')}</span>
                            <span className="inline sm:hidden">{t('vault.tabExecShort')}</span>
                        </button>
                        <button
                            onClick={() => setMode('agenda')}
                            className={`shrink-0 min-w-[92px] py-3 text-[8.5px] sm:text-[9px] font-mono uppercase tracking-widest rounded-xl transition-all duration-300 flex justify-center items-center gap-1.5
                                ${mode === 'agenda' ? 'bg-[var(--bg-color)] shadow-sm font-bold opacity-100 text-glow' : 'opacity-40 hover:opacity-100'}
                            `}
                        >
                            <CalendarIcon size={12} className="shrink-0" />
                            <span className="hidden sm:inline">{t('vault.tabAgenda')}</span>
                            <span className="inline sm:hidden">{t('vault.tabAgendaShort')}</span>
                        </button>
                        <button
                            onClick={() => setMode('archive')}
                            className={`shrink-0 min-w-[92px] py-3 text-[8.5px] sm:text-[9px] font-mono uppercase tracking-widest rounded-xl transition-all duration-300 flex justify-center items-center gap-1.5
                                ${mode === 'archive' ? 'bg-[var(--bg-color)] shadow-sm font-bold opacity-100 text-glow' : 'opacity-40 hover:opacity-100'}
                            `}
                        >
                            <ImageIcon size={12} className="shrink-0" />
                            <span className="hidden sm:inline">{t('vault.tabArchive')}</span>
                            <span className="inline sm:hidden">{t('vault.tabArchiveShort')}</span>
                        </button>
                        <button
                            onClick={() => setMode('notes')}
                            className={`shrink-0 min-w-[92px] py-3 text-[8.5px] sm:text-[9px] font-mono uppercase tracking-widest rounded-xl transition-all duration-300 flex justify-center items-center gap-1.5
                                ${mode === 'notes' ? 'bg-[var(--bg-color)] shadow-sm font-bold opacity-100 text-glow' : 'opacity-40 hover:opacity-100'}
                            `}
                        >
                            <FileText size={12} className="shrink-0" />
                            <span className="hidden sm:inline">{t('vault.tabNotes')}</span>
                            <span className="inline sm:hidden">{t('vault.tabNotesShort')}</span>
                        </button>
                        <button
                            onClick={() => setMode('capital')}
                            className={`shrink-0 min-w-[92px] py-3 text-[8.5px] sm:text-[9px] font-mono uppercase tracking-widest rounded-xl transition-all duration-300 flex justify-center items-center gap-1.5
                                ${mode === 'capital' ? 'bg-[var(--bg-color)] shadow-sm font-bold opacity-100 text-glow' : 'opacity-40 hover:opacity-100'}
                            `}
                        >
                            <DollarSign size={12} className="shrink-0" />
                            <span className="hidden sm:inline">{t('vault.tabFinance')}</span>
                            <span className="inline sm:hidden">{t('vault.tabFinanceShort')}</span>
                        </button>
                    </div>
                    {/* Fade indicator for mobile */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--bg-color)] to-transparent pointer-events-none md:hidden rounded-r-2xl"></div>
                </div>
                
                {/* Swipe Hint */}
                <div className="flex justify-end mt-2 md:hidden">
                    <span className="text-[8px] font-mono tracking-[0.2em] uppercase opacity-40 flex items-center gap-1 animate-pulse">
                        Deslize para ver mais <ChevronRight size={10} />
                    </span>
                </div>
            </div>

            {/* ===================== MODO: EXECUÇÃO ===================== */}
            {mode === 'execucao' && (
                <ExecutionBoard />
            )}

            {/* ===================== MODO: AGENDA ===================== */}
            {mode === 'agenda' && (
                <div className="animate-in fade-in duration-500">
                    {/* Horizontal Week Calendar */}
                    <ScrollReveal delay={0.1} className="px-5 mb-8">
                        <div className="glass-panel p-4 rounded-[28px] relative overflow-hidden flex justify-between items-center" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}>
                            {week.map((d, index) => {
                                const isSelected = selectedDate.getDate() === d.num &&
                                    selectedDate.getMonth() === d.month &&
                                    selectedDate.getFullYear() === d.year;
                                const isToday = d.isToday;

                                return (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedDate(new Date(d.year, d.month, d.num))}
                                        className={`relative flex flex-col items-center justify-center w-10 h-14 rounded-2xl transition-all duration-300
                                          ${isSelected ? 'scale-110 shadow-[0_0_15px_var(--glass-shadow)]' : 'opacity-60 hover:opacity-100 hover:scale-105'}
                                        `}
                                        style={{
                                            backgroundColor: isSelected ? 'var(--text-main)' : 'transparent',
                                            color: isSelected ? 'var(--bg-color)' : 'var(--text-main)'
                                        }}
                                    >
                                        <span className={`text-[9px] font-mono uppercase mb-1 tracking-widest ${isSelected ? 'opacity-80' : 'opacity-40'}`}>
                                            {d.day}
                                        </span>
                                        <span className={`text-lg font-space font-bold ${isSelected ? 'opacity-100' : 'opacity-80'}`}>
                                            {d.num}
                                        </span>

                                        {/* Today indicator dot */}
                                        {isToday && !isSelected && (
                                            <div className="absolute -bottom-1 w-1 h-1 bg-[#22c55e] rounded-full shadow-[0_0_5px_rgba(34,197,94,0.6)]"></div>
                                        )}
                                    </button>
                                );
                            })}

                            {/* Full Calendar Toggle Button */}
                            <button
                                onClick={() => setIsFullCalendarOpen(true)}
                                className="w-10 h-14 rounded-2xl border border-current/10 bg-current/5 flex flex-col items-center justify-center gap-1 hover:bg-current/10 hover:border-current/30 transition-all group shrink-0 shadow-inner"
                            >
                                <CalendarDays size={16} className="opacity-50 group-hover:opacity-100 group-hover:text-[#22c55e] transition-colors" />
                                <span className="text-[7px] font-mono uppercase opacity-30 group-hover:opacity-80">{t('vault.month')}</span>
                            </button>
                        </div>
                    </ScrollReveal>

                    {/* Daily Metrix Mini-Dashboard */}
                    <ScrollReveal delay={0.2} className="px-6 mb-8 flex gap-4">
                        <div className="flex-1 border rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-current/5 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                            <Target size={14} className="opacity-30 mb-2" />
                            <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest mb-1">{t('vault.completed')}</span>
                            <span className="text-xl font-space font-bold">{dailyMetrics.tasks_completed}/{dailyMetrics.tasks_total || 0}</span>
                        </div>
                        <div className="flex-1 border rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-current/5 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                            <Zap size={14} className="opacity-30 mb-2" />
                            <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest mb-1">{t('vault.focusToday')}</span>
                            <span className="text-xl font-space font-bold">{dailyMetrics.focus_minutes >= 60 ? `${(dailyMetrics.focus_minutes / 60).toFixed(1)}h` : `${dailyMetrics.focus_minutes}m`}</span>
                        </div>
                    </ScrollReveal>

                    {/* Add Task Button & Form */}
                    <div className="px-6 mb-8">
                        <AnimatePresence mode="wait">
                            {!showAddTask ? (
                                <motion.button 
                                    key="add-btn"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowAddTask(true)}
                                    className="w-full py-5 rounded-[28px] border border-dashed border-current/20 flex items-center justify-center gap-3 text-[10px] font-syncopate font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 hover:border-current/40 transition-all bg-current/[0.02]"
                                >
                                    <Plus size={16} /> Nova Diretriz de Agenda
                                </motion.button>
                            ) : (
                                <motion.div 
                                    key="add-form"
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.99 }}
                                    className="glass-panel p-8 rounded-[38px] border border-current/10 shadow-2xl relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-current opacity-[0.01] pointer-events-none"></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-center mb-8">
                                            <h3 className="text-[11px] font-syncopate font-black uppercase tracking-[0.2em] opacity-90">{t('vault.opRecord')}</h3>
                                            <Clock size={16} className="opacity-20" />
                                        </div>
                                        
                                        <div className="flex flex-col gap-8">
                                            {/* Título */}
                                            <div className="flex flex-col gap-3 relative">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Target size={12} className="opacity-40" />
                                                    <label className="text-[9px] font-syncopate font-black uppercase tracking-widest opacity-60">{t('vault.primaryDirective')}</label>
                                                </div>
                                                <input 
                                                    type="text" 
                                                    placeholder={t('vault.titlePlaceholder')} 
                                                    className="w-full bg-current/[0.03] border border-current/10 p-5 rounded-[22px] text-xs md:text-sm font-syncopate font-black outline-none focus:border-current/50 focus:bg-current/5 transition-all uppercase placeholder:opacity-30 tracking-widest"
                                                    value={newTask.title}
                                                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-2">
                                                {/* Categoria */}
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Flame size={12} className="opacity-40" />
                                                        <label className="text-[9px] font-syncopate font-black uppercase tracking-widest opacity-60">{t('vault.vector')}</label>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            { id: 'FOCO', icon: Brain },
                                                            { id: 'TREINO', icon: Dumbbell },
                                                            { id: 'ESTUDO', icon: BookOpen },
                                                            { id: 'SOCIAL', icon: Users }
                                                        ].map((cat) => (
                                                            <button
                                                                key={cat.id}
                                                                type="button"
                                                                onClick={() => setNewTask({...newTask, category: cat.id})}
                                                                className={`flex flex-col items-start gap-2 p-4 text-[9px] font-syncopate font-bold rounded-[20px] transition-all duration-300 tracking-widest border ${
                                                                    newTask.category === cat.id 
                                                                    ? 'shadow-lg scale-[1.02]' 
                                                                    : 'bg-current/[0.02] border-current/10 opacity-60 hover:opacity-100 hover:bg-current/10 text-current'
                                                                }`}
                                                                style={newTask.category === cat.id ? { backgroundColor: 'var(--text-main, currentColor)', color: 'var(--bg-color, white)', borderColor: 'var(--text-main, currentColor)' } : {}}
                                                            >
                                                                <cat.icon size={16} className={newTask.category === cat.id ? 'opacity-100' : 'opacity-40'} />
                                                                <span>{cat.id}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Cronograma & Duração */}
                                                <div className="flex flex-col gap-6">
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Clock size={12} className="opacity-40" />
                                                            <label className="text-[9px] font-syncopate font-black uppercase tracking-widest opacity-60">{t('vault.startTime')}</label>
                                                        </div>
                                                        <input 
                                                            type="time" 
                                                            className="w-full bg-current/[0.03] border border-current/10 py-4 px-5 rounded-[20px] text-sm font-space font-black outline-none focus:border-current/40 transition-all uppercase tracking-widest"
                                                            value={newTask.time_start}
                                                            onChange={e => setNewTask({...newTask, time_start: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Timer size={12} className="opacity-40" />
                                                            <label className="text-[9px] font-syncopate font-black uppercase tracking-widest opacity-60">{t('vault.durationBlock')}</label>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {['15m', '30m', '1h', '2h+'].map((dur) => {
                                                                const currentDur = newTask.duration || '1h';
                                                                return (
                                                                <button
                                                                    key={dur}
                                                                    type="button"
                                                                    onClick={() => setNewTask({...newTask, duration: dur})}
                                                                    className={`py-3.5 text-[10px] font-space font-bold rounded-[16px] transition-all duration-300 border ${
                                                                        currentDur === dur 
                                                                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 shadow-inner' 
                                                                        : 'bg-transparent border-current/10 opacity-40 hover:opacity-70 text-current'
                                                                    }`}
                                                                >
                                                                    {dur}
                                                                </button>
                                                            )})}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-3 pt-6 border-t border-current/10">
                                                <button 
                                                    onClick={handleAddTask} 
                                                    className="flex-[2] py-5 rounded-[20px] text-[11px] font-syncopate font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl hover:brightness-110"
                                                    style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
                                                >
                                                    Protocolar DIRETRIZ
                                                </button>
                                                <button
                                                    onClick={() => setShowAddTask(false)}
                                                    className="flex-1 py-5 border border-current/20 rounded-[20px] opacity-60 text-[10px] font-mono uppercase tracking-widest hover:opacity-100 hover:bg-current/10 transition-all text-current"
                                                >
                                                    Abortar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Timeline Task View */}
                    <div className="px-6 relative">
                        {/* Visual Timeline Bar passing through */}
                        <div className="absolute left-[38px] top-4 bottom-10 w-[1px] bg-gradient-to-b from-transparent via-current/20 to-transparent"></div>

                        <div className="flex flex-col gap-8 relative z-10 w-full text-left">
                            {timelineTasks.length === 0 ? (
                                <ScrollReveal delay={0.3} className="py-12 flex flex-col items-center justify-center opacity-40 text-center px-4 w-full">
                                    <CalendarIcon size={32} className="mb-4 opacity-50" />
                                    <span className="text-[12px] font-mono tracking-[0.2em] uppercase font-bold mb-2">{t('vault.noPendingTasks')}</span>
                                    <span className="text-[9px] font-mono tracking-widest uppercase opacity-70">{t('vault.awaitingCoords')}</span>
                                </ScrollReveal>
                            ) : (
                                timelineTasks.map((task, index) => {
                                    const isDone = task.state === 'done';
                                    const isActive = task.state === 'active';
                                    const isFailed = task.state === 'failed';

                                    return (
                                        <ScrollReveal key={task.id} delay={0.15 + (index * 0.1)} className="flex gap-5 group items-start relative w-full">

                                            {/* Left Time Block */}
                                            <div className="flex flex-col items-end w-12 pt-1 shrink-0">
                                                <span className={`text-[12px] font-space font-bold ${(isDone || isFailed) ? 'opacity-30' : isActive ? 'text-glow opacity-100 scale-110 origin-right transition-transform' : 'opacity-70'}`}>
                                                    {task.time}
                                                </span>
                                                <span className="text-[8px] font-mono opacity-30 mt-0.5">{task.duration}</span>
                                            </div>

                                            {/* Timeline Node / Check Area */}
                                            <div className="relative flex flex-col items-center mt-1 shrink-0 z-20" onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id, task.state, task.source); }}>
                                                <div className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-current/[0.05] transition-colors cursor-pointer group/check">
                                                    <div className={`w-6 h-6 flex items-center justify-center rounded-full border-2 transition-all duration-300 ${
                                                        isDone 
                                                            ? 'bg-[#22c55e] border-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.4)]' 
                                                            : isFailed 
                                                                ? 'bg-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                                                                : isActive
                                                                    ? 'border-[var(--orvax-green)] bg-[var(--orvax-green)]/10 shadow-[0_0_8px_var(--orvax-green)]'
                                                                    : 'border-current/40 group-hover/check:border-current/80 bg-current/[0.02]'
                                                    }`}>
                                                        {isDone ? (
                                                            <CheckCircle2 size={14} className="text-white" />
                                                        ) : isFailed ? (
                                                            <X size={14} className="text-white" />
                                                        ) : isActive ? (
                                                            <div className="w-2 h-2 bg-[var(--orvax-green)] rounded-full animate-pulse"></div>
                                                        ) : (
                                                            <div className="w-2 h-2 rounded-full bg-current/10 opacity-0 group-hover/check:opacity-100 transition-opacity"></div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Task Card */}
                                            <div 
                                                onClick={() => handleToggleTask(task.id, task.state, task.source)}
                                                className={`flex-1 rounded-[24px] p-5 transition-all duration-300 w-full overflow-hidden relative cursor-pointer
                                                ${isActive
                                                    ? 'border border-[var(--orvax-green)]/40 shadow-[0_0_20px_var(--orvax-green)] bg-[var(--orvax-green)]/[0.02]'
                                                    : 'border border-current/10 hover:border-current/30 bg-current/[0.04]'}
                                                ${isDone ? 'border-dashed border-current/20 bg-transparent opacity-60' : ''}
                                                ${isFailed ? 'border-red-500/30 bg-red-500/10' : ''}
                                            `}
                                            >

                                                {/* Active Shimmer Effect */}
                                                {isActive && (
                                                    <div className="absolute inset-0 translate-x-[-150%] skew-x-[-25deg] bg-gradient-to-r from-transparent via-current/5 to-transparent w-[150%] animate-[shimmer_3s_infinite] pointer-events-none z-0"></div>
                                                )}

                                                <div className="relative z-10 w-full flex flex-col justify-start items-start">
                                                    <div className="w-full flex justify-between items-start mb-2">
                                                        <span className={`text-[9px] font-mono tracking-[0.3em] uppercase ${isActive ? 'opacity-80 font-bold text-[var(--orvax-green)]' : 'opacity-60 font-bold'}`}>
                                                            {task.category}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            {isActive && (
                                                                <div className="flex items-center gap-1 bg-[var(--orvax-green)]/10 px-2 py-0.5 rounded-full border border-[var(--orvax-green)]/30">
                                                                    <div className="w-1 h-1 bg-[var(--orvax-green)] rounded-full animate-pulse"></div>
                                                                    <span className="text-[7px] font-mono tracking-widest text-[var(--orvax-green)] uppercase">{t('vault.activeOccurrence')}</span>
                                                                </div>
                                                            )}
                                                            <button 
                                                                onClick={(e) => handleDeleteTask(e, task.id, task.source)}
                                                                className="opacity-20 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 text-red-500 rounded-full hover:bg-red-500/10"
                                                                title={t('vault.removeDirective')}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <h3 className={`text-[13px] font-syncopate tracking-wider uppercase mb-3 text-left w-full
                                                        ${isDone ? 'opacity-50 line-through decoration-current/30 font-bold' : isActive ? 'font-black opacity-100 text-glow' : 'font-black opacity-90 transition-opacity group-hover:opacity-100'}
                                                    `}>
                                                        {task.title}
                                                    </h3>

                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} className={isDone ? 'opacity-30' : 'opacity-60'} />
                                                        <span className={`text-[10px] font-mono font-bold ${isDone ? 'opacity-40' : 'opacity-70'}`}>{task.time} {task.period}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </ScrollReveal>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ====== FULLSCREEN via Portal (escapa do overflow-hidden) ====== */}
            {mode === 'archive' && selectedPhoto && fullscreenPhoto && ReactDOM.createPortal(
                <div
                    onClick={() => setFullscreenPhoto(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        zIndex: 99999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                    }}
                >
                    {/* Fundo: a própria foto desfocada cobrindo tudo */}
                    <img
                        src={selectedPhoto.imgUrl}
                        alt=""
                        style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                            filter: 'blur(40px) brightness(0.5) saturate(1.4)',
                            transform: 'scale(1.15)',
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Overlay escurecedor leve */}
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.25)', pointerEvents: 'none' }} />

                    {/* Foto principal em retrato — não toca as bordas */}
                    <img
                        src={selectedPhoto.imgUrl}
                        alt={selectedPhoto.title}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            width: 'calc(100vw - 48px)',
                            maxHeight: 'calc(100dvh - 120px)',
                            objectFit: 'cover',
                            aspectRatio: '3/4',
                            borderRadius: '28px',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                        }}
                    />

                    {/* Botão fechar */}
                    <button
                        onClick={() => setFullscreenPhoto(false)}
                        style={{
                            position: 'absolute', top: '2rem', right: '1.25rem',
                            zIndex: 3,
                            width: '2.5rem', height: '2.5rem',
                            borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.3)',
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(10px)',
                            color: 'white', fontSize: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >✕</button>

                    <span style={{
                        position: 'absolute', bottom: '2rem',
                        left: 0, right: 0, textAlign: 'center',
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: '9px', fontFamily: 'monospace',
                        letterSpacing: '0.3em', textTransform: 'uppercase',
                        zIndex: 3,
                    }}>{t('vault.tapOutside')}</span>
                </div>,
                document.body
            )}



            {/* ====== DETALHE DA FOTO ====== */}
            {mode === 'archive' && selectedPhoto && !fullscreenPhoto && (() => {
                const LogIcon = selectedPhoto.icon;
                return (
                    <div className="animate-in fade-in duration-300 pb-10">

                        {/* Botão voltar */}
                        <button
                            onClick={() => { setSelectedPhoto(null); setFullscreenPhoto(false); }}
                            className="flex items-center gap-2 px-6 mb-5 opacity-50 hover:opacity-100 transition-opacity"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">{t('common.back')}</span>
                        </button>

                        {/* Foto clicável → fullscreen */}
                        <div className="px-5 mb-5">
                            <button
                                onClick={() => setFullscreenPhoto(true)}
                                className="relative w-full overflow-hidden group active:scale-[0.98] transition-transform duration-200"
                                style={{ borderRadius: '24px', aspectRatio: '4/5', display: 'block', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}
                            >
                                <img
                                    src={selectedPhoto.imgUrl}
                                    alt={selectedPhoto.title}
                                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                                />
                                {/* Gradient */}
                                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)' }} />

                                {/* Hint expand — sempre visível + pulsa no hover */}
                                <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 group-hover:bg-black/70 transition-all">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                                    <span className="text-[8px] font-mono text-white uppercase tracking-widest font-bold">{t('vault.zoom')}</span>
                                </div>

                                {/* Badge tipo */}
                                <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                                    <LogIcon size={10} className="text-white/80" />
                                    <span className="text-[8px] font-mono text-white uppercase tracking-widest font-bold">{selectedPhoto.type}</span>
                                </div>
                            </button>
                        </div>

                        {/* Info */}
                        <div className="px-5 flex flex-col gap-4">
                            {/* Título + Métrica */}
                            <div className="flex justify-between items-start">
                                <div className="flex-1 pr-4">
                                    <span className="text-[9px] font-mono opacity-35 uppercase tracking-[0.35em] block mb-1">{selectedPhoto.date} · {selectedPhoto.time}</span>
                                    <h2 className="text-xl font-syncopate font-black tracking-wider uppercase leading-tight">{selectedPhoto.title}</h2>
                                </div>
                                <div className="flex flex-col items-center justify-center px-4 py-2.5 rounded-2xl border shrink-0" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                                    <span className="text-lg font-space font-black">{selectedPhoto.metric}</span>
                                    <span className="text-[7px] font-mono opacity-40 uppercase tracking-widest">{t('vault.metric')}</span>
                                </div>
                            </div>

                            {/* Divisor */}
                            <div className="w-full h-px opacity-10" style={{ backgroundColor: 'var(--text-main)' }} />

                            {/* Nota */}
                            <div className="pl-4" style={{ borderLeft: '2px solid var(--border-color)' }}>
                                <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest block mb-2">{t('vault.internalRecord')}</span>
                                <p className="text-[12px] font-mono leading-loose opacity-75 italic">&quot;{selectedPhoto.note}&quot;</p>
                            </div>

                            {/* Tags */}
                            <div className="flex gap-2 flex-wrap">
                                {[t('vault.evolution'), selectedPhoto.type, selectedPhoto.date].map(tag => (
                                    <span key={tag} className="text-[8px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full opacity-50 border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ====== GRID DE FOTOS ====== */}
            {mode === 'archive' && !selectedPhoto && (
                <div className="animate-in fade-in duration-400">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4 px-6">
                        <div>
                            <span className="text-[9px] font-mono opacity-35 uppercase tracking-[0.35em] block mb-0.5">{t('vault.visualMemory')}</span>
                            <span className="text-[11px] font-syncopate font-black uppercase tracking-widest">{archiveLogs.length} {t('vault.records')}</span>
                        </div>
                    </div>
                     {/* Add Media Button & Form */}
                    <div className="px-6 mb-8">
                        <AnimatePresence mode="wait">
                            {!showAddMedia ? (
                                <motion.button 
                                    key="add-media-btn"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowAddMedia(true)}
                                    className="w-full py-5 rounded-[28px] border border-dashed border-current/20 flex items-center justify-center gap-3 text-[10px] font-syncopate font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 hover:border-current/40 transition-all bg-current/[0.02]"
                                >
                                    <Plus size={16} /> {t('vault.logPhoto')}
                                </motion.button>
                            ) : (
                                <motion.div 
                                    key="add-media-form"
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.99 }}
                                    className="glass-panel p-8 rounded-[38px] border border-current/10 shadow-2xl relative overflow-hidden text-left"
                                >
                                    <div className="absolute inset-0 bg-current opacity-[0.01] pointer-events-none"></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-center mb-10">
                                            <h3 className="text-[11px] font-syncopate font-black uppercase tracking-[0.2em] opacity-90 text-left">{t('vault.newVisualCapture')}</h3>
                                            <ImageIcon size={16} className="opacity-20" />
                                        </div>
                                        
                                        <div className="flex flex-col gap-8">
                                            <div className="flex flex-col gap-3">
                                                <label className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-50 italic px-1">› AMOSTRA VISUAL</label>
                                                
                                                <div className="relative border border-dashed border-current/20 p-6 flex flex-col items-center justify-center gap-3 rounded-[24px] hover:bg-current/5 transition-all text-center">
                                                    {isCompressing ? (
                                                        <span className="animate-pulse text-[10px] font-mono font-bold tracking-widest text-[#22c55e]">{t('vault.compressing')}</span>
                                                    ) : newMedia.file_url ? (
                                                        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-current/10 group">
                                                            {/* Display real image */}
                                                            <img src={newMedia.file_url} alt="Preview" className="w-full h-full object-cover grayscale opacity-80" />
                                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer" onClick={() => setNewMedia({...newMedia, file_url: ''})}>
                                                                <span className="text-white text-[9px] font-bold tracking-widest uppercase">{t('vault.removeMatrix')}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button 
                                                                onClick={() => vaultImageRef.current?.click()}
                                                                className="py-3 px-6 rounded-[18px] bg-[var(--text-main)] text-[var(--bg-color)] text-[9px] font-bold tracking-[0.2em] font-mono shadow-md uppercase active:scale-95 transition-all"
                                                            >
                                                                CÂMERA / GALERIA
                                                            </button>
                                                            <span className="text-[8px] font-mono opacity-40 max-w-[200px] leading-relaxed uppercase">{t('vault.lossyCompressor')}</span>
                                                        </>
                                                    )}
                                                    <input type="file" ref={vaultImageRef} className="hidden" accept="image/*" onChange={handleVaultImageUpload} />
                                                </div>

                                                {!newMedia.file_url && !isCompressing && (
                                                    <input 
                                                        type="text" 
                                                        placeholder={t('vault.urlPlaceholder')} 
                                                        className="w-full bg-transparent border-b border-current/10 py-3 text-[10px] font-mono outline-none focus:border-current/40 transition-all placeholder:opacity-20 mt-1"
                                                        value={newMedia.file_url}
                                                        onChange={e => setNewMedia({...newMedia, file_url: e.target.value})}
                                                    />
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                <label className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-50 italic px-1">{t('lo.descOperational')}</label>
                                                <input 
                                                    type="text" 
                                                    placeholder={t('vault.mediaTitlePlaceholder')} 
                                                    className="w-full bg-transparent border-b border-current/20 py-3 text-sm font-syncopate font-black outline-none focus:border-current transition-all uppercase placeholder:opacity-20 tracking-widest"
                                                    value={newMedia.description}
                                                    onChange={e => setNewMedia({...newMedia, description: e.target.value})}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-4">
                                                <label className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-50 italic px-1">{t('lo.segmentation')}</label>
                                                <div className="flex p-1 bg-current/[0.05] rounded-[22px] border border-current/10 gap-1">
                                                    {['TREINO', 'FOCO', 'ESTILO', 'LIFE'].map((seg) => (
                                                        <button
                                                            key={seg}
                                                            type="button"
                                                            onClick={() => setNewMedia({...newMedia, segment: seg})}
                                                            className={`flex-1 py-3 text-[9px] font-mono font-bold rounded-[18px] transition-all duration-300 tracking-[0.1em] ${
                                                                newMedia.segment === seg 
                                                                ? 'bg-[var(--text-main)] text-[var(--bg-color)] shadow-lg scale-[1.02]' 
                                                                : 'opacity-40 hover:opacity-70 hover:bg-current/10 text-current'
                                                            }`}
                                                        >
                                                            {seg}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-6 border-t border-current/5">
                                                <button 
                                                    onClick={handleUploadMedia} 
                                                    className="flex-[2] py-4 rounded-[20px] text-[10px] font-syncopate font-black uppercase tracking-[0.25em] transition-all active:scale-95 shadow-xl hover:brightness-110"
                                                    style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
                                                >
                                                    Arquivar
                                                </button>
                                                <button 
                                                    onClick={() => setShowAddMedia(false)} 
                                                    className="flex-1 py-4 border border-current/20 rounded-[20px] opacity-60 text-[10px] font-mono uppercase tracking-widest hover:opacity-100 hover:bg-current/10 transition-all text-current"
                                                >
                                                    Abortar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {/* Archive Items */}
                    <div className={`px-2 sm:px-6 w-full ${archiveLogs.length === 0 ? 'flex flex-col items-center' : archiveLogs.length === 1 ? 'grid grid-cols-1 max-w-xs mx-auto' : 'grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5'}`}>
                        {archiveLogs.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center opacity-30 text-center">
                                <ImageIcon size={40} className="mb-4" />
                                <span className="text-[12px] font-mono tracking-widest uppercase">{t('vault.emptyMediaVault')}</span>
                                <span className="text-[8px] font-mono tracking-widest uppercase mt-2">{t('vault.noVisualRecords')}</span>
                            </div>
                        ) : (
                            archiveLogs.map((log, index) => (
                                <ScrollReveal key={log.id} delay={index * 0.1}>
                                    <div 
                                        onClick={() => setSelectedPhoto(log)}
                                        className="group relative aspect-[3/4] w-full rounded-[18px] md:rounded-[24px] overflow-hidden bg-current/5 cursor-pointer border border-current/10 hover:border-current/30 transition-all shadow-xl"
                                    >
                                        {/* Imagem */}
                                        <img 
                                            src={log.imgUrl} 
                                            alt={log.title}
                                            className="absolute inset-0 w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
                                        />
                                        
                                        {/* Gradientes Clássicos (Pinterest/Instagram) */}
                                        <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-black/70 to-transparent z-10 pointer-events-none"></div>
                                        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none"></div>

                                        {/* Overlay Topo: Tag Visual e Lixeira */}
                                        <div className="absolute top-0 inset-x-0 p-2.5 sm:p-4 flex justify-between items-start z-20">
                                            {/* Tag Minimalista arredondada */}
                                            <div className="bg-white/90 backdrop-blur-md text-black px-2 sm:px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                                                {log.icon && <log.icon size={8} className="opacity-80" />}
                                                <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-widest">{log.type}</span>
                                            </div>

                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteMedia(log.id); }}
                                                className="p-1 opacity-50 hover:opacity-100 hover:text-red-400 drop-shadow-md transition-all pointer-events-auto bg-black/20 hover:bg-black/80 rounded-full"
                                                title={t('vault.deleteRecord')}
                                            >
                                                <Trash2 size={12} className="text-white" />
                                            </button>
                                        </div>

                                        {/* Overlay Base: Título Impactante e Data */}
                                        <div className="absolute bottom-0 inset-x-0 p-3 sm:p-5 flex flex-col justify-end z-20">
                                            <span className="text-white text-[11px] sm:text-[14px] font-syncopate font-black tracking-widest uppercase leading-[1.2] line-clamp-2 drop-shadow-2xl mb-1.5">{log.title}</span>
                                            
                                            <div className="flex items-center gap-1.5 opacity-90">
                                                <div className="w-1 h-3 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                                <span className="text-[8px] sm:text-[10px] font-mono tracking-[0.2em] text-white uppercase block line-clamp-1 font-bold">{log.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            ))
                        )}
                    </div>
                </div>
            )}




            {/* ===================== MODO: CAPITAL ===================== */}
            {mode === 'capital' && (
                <div className="animate-in fade-in duration-400">
                    <CapitalViewNew onBack={() => setMode('agenda')} theme={theme} />
                </div>
            )}

            {mode === 'notes' && (
                <div className="animate-in fade-in duration-500 px-6">

                    {/* System Warning Notice */}
                    <ScrollReveal delay={0.1} className="mb-6 p-4 rounded-2xl flex items-start gap-3 mx-1 transition-colors duration-500 border" style={{ backgroundColor: 'var(--warning-bg)', borderColor: 'var(--warning-border)' }}>
                        <AlertCircle size={16} style={{ color: 'var(--warning-color)' }} className="shrink-0 mt-0.5 transition-colors duration-500" />
                        <div>
                            <span className="text-[10px] font-syncopate font-bold uppercase tracking-widest block mb-1 transition-colors duration-500" style={{ color: 'var(--warning-color)' }}>{t('vault.systemWarning')}</span>
                            <p className="text-[10px] font-mono leading-relaxed opacity-90 transition-colors duration-500" style={{ color: 'var(--warning-color)' }}>
                                Esta área é a <strong className="font-bold border-b transition-colors duration-500" style={{ borderColor: 'var(--warning-border)' }}>{t('vault.onlyAllowed')}</strong> para registro e intervenção manual no sistema ORVAX. Todas as outras métricas devem ser controladas passivamente via WhatsApp com o seu Agente ORVAX.
                            </p>
                        </div>
                    </ScrollReveal>

                    {/* Add Note Card */}
                    <ScrollReveal delay={0.2} className="glass-panel p-8 rounded-[40px] mb-10 relative overflow-hidden group shadow-2xl border border-current/10">
                        <div className="absolute inset-0 bg-current opacity-[0.01] pointer-events-none"></div>
                        <div className="relative z-10 text-left">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[11px] font-syncopate font-black uppercase tracking-[0.3em] opacity-80 flex items-center gap-3">
                                    <Brain size={16} className="text-[#22c55e]" />
                                    Captura Cognitiva
                                </h3>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20"></div>
                                </div>
                            </div>
                            
                            <textarea
                                className="w-full bg-transparent border-b border-current/10 focus:border-current outline-none text-sm font-mono py-4 min-h-[140px] resize-none transition-all placeholder:opacity-20 leading-relaxed font-bold uppercase tracking-wider"
                                placeholder={t('vault.notePlaceholder')}
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                style={{ color: 'var(--text-main)' }}
                            />
                            
                            <div className="flex justify-between items-center mt-8">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-mono opacity-40 tracking-[0.2em] uppercase">{t('vault.recordStatus')}</span>
                                    <span className="text-[9px] font-mono font-bold opacity-70 uppercase">{newNote.length} Caracteres Detectados</span>
                                </div>
                                <button
                                    onClick={handleAddNote}
                                    disabled={!newNote.trim()}
                                    className="flex items-center gap-3 px-8 py-4 rounded-[22px] transition-all font-syncopate font-black text-[10px] uppercase tracking-[0.2em] disabled:opacity-30 active:scale-95 shadow-2xl hover:brightness-110 relative overflow-hidden group/btn"
                                    style={{ 
                                        backgroundColor: newNote.trim() ? 'var(--text-main)' : 'var(--glass-bg)', 
                                        color: newNote.trim() ? 'var(--bg-color)' : 'var(--text-dim)' 
                                    }}
                                >
                                    <span className="relative z-10">{t('vault.persist')}</span>
                                    <Send size={12} className="relative z-10" />
                                    {newNote.trim() && (
                                        <motion.div 
                                            className="absolute inset-0 bg-white opacity-0 group-hover/btn:opacity-10 transition-opacity"
                                            animate={{ x: ['100%', '-100%'] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                        />
                                    )}
                                </button>
                            </div>
                        </div>
                    </ScrollReveal>

                    {/* Notes List */}
                    <div className="flex flex-col gap-4">
                        {notes.map((note, index) => (
                            <ScrollReveal key={note.id} delay={0.3 + (index * 0.1)} className="glass-panel p-6 rounded-[24px]" style={{ border: '1px solid var(--border-color)' }}>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-current opacity-30 rounded-full"></div>
                                        {note.date}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="p-1.5 rounded-lg opacity-40 hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all text-current"
                                        title={t('vault.deleteNote')}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                <p className="text-[12px] font-mono leading-relaxed opacity-80 pl-4 border-l-2 border-current/20 relative z-10 whitespace-pre-wrap">
                                    {note.text}
                                </p>
                            </ScrollReveal>
                        ))}
                    </div>

                </div>
            )}

            {/* Full Calendar Modal Overlay */}
            {isFullCalendarOpen && (
                <FullCalendar
                    onClose={() => setIsFullCalendarOpen(false)}
                    onSelectDate={(d, m, y) => setSelectedDate(new Date(y, m, d))}
                />
            )}

            </div>
        </ScrollContainer>
    );
};

export default Vault;
