import React, { useState, useEffect, useMemo } from 'react';
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
    Quote 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { getTasks, createTask, updateTaskState, getMedia, addMedia, getProfile, getDailyStats, getTotalFocusToday } from '../services/db';
import FullCalendar from './FullCalendar';
import CapitalViewNew from './CapitalViewNew';
import ScrollReveal from './ScrollReveal';
import { ScrollContainer, OrvaxHeader } from './BaseLayout';

const Vault = ({ habits = [], theme, toggleTheme }) => {
    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [mode, setMode] = useState('agenda'); // 'agenda' | 'archive' | 'notes' | 'capital'
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

    // Core Fetch Function
    const fetchVaultData = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 1. Puxar Perfil (para streak)
        const profile = await getProfile();
        setUserProfile(profile);

        // 2. Puxar Anotações (busca flexível por nome do módulo)
        const { data: modulesData } = await supabase
            .from('modulos')
            .select('id')
            .or('nome_modulo.eq.Anotação,nome_modulo.eq.Notas,nome_modulo.eq.Anotações');
        
        const moduloIds = modulesData?.map(m => m.id) || [];
        
        let noteRegistros = [];
        if (moduloIds.length > 0) {
            const { data: regs } = await supabase
                .from('registros_dinamicos')
                .select('*')
                .in('modulo_id', moduloIds)
                .order('created_at', { ascending: false });
            if (regs) noteRegistros = regs;
        }

        if (noteRegistros.length > 0) {
            const formattedNotes = noteRegistros.map(r => {
                let json = r.dados;
                if (typeof json === 'string') try { json = JSON.parse(json); } catch (e) {}
                const dt = new Date(r.created_at);
                return {
                    id: r.id,
                    date: dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase(),
                    text: json?.texto || json?.nota || 'Anotação sem conteúdo'
                };
            });
            setNotes(formattedNotes);
        } else {
            setNotes([]);
        }

        // 3. Puxar Tarefas (Tabela customizada 'tasks')
        // [BUG #11 FIX] Usar data local ao invés de UTC para evitar deslocamento de fuso
        const toLocalDateStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const dateStr = toLocalDateStr(selectedDate);
        const tasks = await getTasks(dateStr);
        setTimelineTasks(tasks.map(t => ({
            id: t.id,
            time: t.time_start,
            period: parseInt(t.time_start.split(':')[0]) >= 12 ? 'PM' : 'AM',
            title: t.title,
            category: t.category || 'GERAL',
            date: t.scheduled_date,
            duration: t.duration || '1h',
            state: t.state
        })));

        // 4. Puxar métricas diárias
        const daily = await getDailyStats();
        const focusToday = await getTotalFocusToday();
        const todayTasks = await getTasks(toLocalDateStr());
        const completedCount = todayTasks.filter(t => t.state === 'done').length;
        setDailyMetrics({
            tasks_completed: completedCount,
            tasks_total: todayTasks.length,
            focus_minutes: daily.focus_minutes || focusToday || 0
        });

        // 5. Puxar Mídia (Tabela customizada 'media_vault')
        const media = await getMedia();
        setArchiveLogs(media.map(m => ({
            id: m.id,
            imgUrl: m.file_url,
            title: m.description || 'Sem título',
            type: m.segment || 'GERAL',
            date: new Date(m.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase(),
            time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            metric: '--',
            note: m.description,
            icon: m.segment === 'TREINO' ? Dumbbell : m.segment === 'FOCO' ? Brain : Quote
        })));
    };

    useEffect(() => {
        fetchVaultData();
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

    const handleUploadMedia = async () => {
        if (!newMedia.file_url) return;
        await addMedia(newMedia);
        setNewMedia({ file_url: '', description: '', segment: 'TREINO' });
        setShowAddMedia(false);
        fetchVaultData();
    };

    const handleToggleTask = async (taskId, currentState) => {
        const newState = currentState === 'done' ? 'pending' : 'done';
        await updateTaskState(taskId, newState);
        fetchVaultData();
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        
        // 1. Localizar ou Criar o módulo correto
        let { data: modules } = await supabase
            .from('modulos')
            .select('id')
            .eq('nome_modulo', 'Anotação')
            .limit(1);

        let moduloId = modules?.[0]?.id;

        // Se não existir, criar o módulo agora
        if (!moduloId) {
            const { data: newMod, error: modError } = await supabase
                .from('modulos')
                .insert([{ nome_modulo: 'Anotação' }])
                .select()
                .single();
            
            if (modError) {
                console.error("Erro ao criar módulo de anotação:", modError);
                alert("Falha ao inicializar sistema de notas. Verifique permissões do banco.");
                return;
            }
            moduloId = newMod.id;
        }

        const { data: { session } } = await supabase.auth.getSession();
        const insertPayload = { 
            modulo_id: moduloId, 
            dados: { texto: newNote } 
        };

        // Se a tabela tiver user_id, incluímos para respeitar RLS
        if (session?.user?.id) {
            insertPayload.user_id = session.user.id;
        }

        const { error } = await supabase.from('registros_dinamicos').insert(insertPayload);
        
        if (!error) {
            setNewNote('');
            fetchVaultData();
        } else {
            console.error("Erro ao persistir nota:", error);
            alert("Erro ao salvar nota no banco.");
        }
    };

    const handleDeleteNote = async (id) => {
        setNotes(notes.filter(note => note.id !== id));
        await supabase.from('registros_dinamicos').delete().eq('id', id);
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
                            <h2 className="text-[10px] font-mono opacity-40 tracking-[0.4em] uppercase mb-2 shadow-sm">Grade Operacional</h2>
                            <h1 className="text-2xl font-syncopate font-black tracking-widest text-glow uppercase">O Cofre</h1>
                        </div>
                    </div>

                {/* Minimalist Switcher */}
                <div className="flex bg-current/5 p-1 rounded-2xl border backdrop-blur-md" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                        onClick={() => setMode('agenda')}
                        className={`flex-1 py-3 text-[9px] font-mono uppercase tracking-widest rounded-xl transition-all duration-300 flex justify-center items-center gap-1.5
                            ${mode === 'agenda' ? 'bg-[var(--bg-color)] shadow-sm font-bold opacity-100 text-glow' : 'opacity-40 hover:opacity-100'}
                        `}
                    >
                        <CalendarIcon size={12} />
                        Agenda
                    </button>
                    <button
                        onClick={() => setMode('archive')}
                        className={`flex-1 py-3 text-[9px] font-mono uppercase tracking-widest rounded-xl transition-all duration-300 flex justify-center items-center gap-1.5
                            ${mode === 'archive' ? 'bg-[var(--bg-color)] shadow-sm font-bold opacity-100 text-glow' : 'opacity-40 hover:opacity-100'}
                        `}
                    >
                        <ImageIcon size={12} />
                        Arquivo
                    </button>
                    <button
                        onClick={() => setMode('notes')}
                        className={`flex-1 py-3 text-[9px] font-mono uppercase tracking-widest rounded-xl transition-all duration-300 flex justify-center items-center gap-1.5
                            ${mode === 'notes' ? 'bg-[var(--bg-color)] shadow-sm font-bold opacity-100 text-glow' : 'opacity-40 hover:opacity-100'}
                        `}
                    >
                        <FileText size={12} />
                        Notas
                    </button>
                    <button
                        onClick={() => setMode('capital')}
                        className={`flex-1 py-3 text-[9px] font-mono uppercase tracking-widest rounded-xl transition-all duration-300 flex justify-center items-center gap-1.5
                            ${mode === 'capital' ? 'bg-[var(--bg-color)] shadow-sm font-bold opacity-100 text-glow' : 'opacity-40 hover:opacity-100'}
                        `}
                    >
                        <DollarSign size={12} />
                        Capital
                    </button>
                </div>
            </div>

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
                                <span className="text-[7px] font-mono uppercase opacity-30 group-hover:opacity-80">Mês</span>
                            </button>
                        </div>
                    </ScrollReveal>

                    {/* Daily Metrix Mini-Dashboard */}
                    <ScrollReveal delay={0.2} className="px-6 mb-8 flex gap-4">
                        <div className="flex-1 border rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-current/5 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                            <Target size={14} className="opacity-30 mb-2" />
                            <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest mb-1">Concluídas</span>
                            <span className="text-xl font-space font-bold">{dailyMetrics.tasks_completed}/{dailyMetrics.tasks_total || 0}</span>
                        </div>
                        <div className="flex-1 border rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-current/5 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                            <Zap size={14} className="opacity-30 mb-2" />
                            <span className="text-[10px] font-mono opacity-40 uppercase tracking-widest mb-1">Foco Hoje</span>
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
                                            <h3 className="text-[11px] font-syncopate font-black uppercase tracking-[0.2em] opacity-90">Registro Operacional</h3>
                                            <Clock size={16} className="opacity-20" />
                                        </div>
                                        
                                        <div className="flex flex-col gap-6">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-50 italic px-1">› TÍTULO</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="EX: TREINO DE ALTA PERFORMANCE" 
                                                    className="w-full bg-transparent border-b border-current/20 py-3 text-sm font-syncopate font-black outline-none focus:border-current transition-all uppercase placeholder:opacity-20 tracking-widest"
                                                    value={newTask.title}
                                                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 gap-8 mb-4">
                                                <div className="flex flex-col gap-3">
                                                    <label className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-50 italic px-1">› CRONOGRAMA</label>
                                                    <input 
                                                        type="time" 
                                                        className="w-full bg-current/[0.05] border border-current/10 p-4 rounded-2xl text-xs font-mono outline-none focus:border-current/30 transition-all"
                                                        value={newTask.time_start}
                                                        onChange={e => setNewTask({...newTask, time_start: e.target.value})}
                                                    />
                                                </div>
                                                
                                                <div className="flex flex-col gap-3">
                                                    <label className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-50 italic px-1">› CATEGORIA</label>
                                                    <div className="flex p-1 bg-current/[0.05] rounded-[22px] border border-current/10 gap-1">
                                                        {['FOCO', 'TREINO', 'ESTUDO', 'SOCIAL'].map((cat) => (
                                                            <button
                                                                key={cat}
                                                                type="button"
                                                                onClick={() => setNewTask({...newTask, category: cat})}
                                                                className={`flex-1 py-3 text-[9px] font-mono font-bold rounded-[18px] transition-all duration-300 tracking-widest ${
                                                                    newTask.category === cat 
                                                                    ? 'bg-[var(--text-main)] text-[var(--bg-color)] shadow-lg scale-[1.02]' 
                                                                    : 'opacity-40 hover:opacity-70 hover:bg-current/10 text-current'
                                                                }`}
                                                            >
                                                                {cat}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-4 border-t border-current/5">
                                                <button 
                                                    onClick={handleAddTask} 
                                                    className="flex-[2] py-4 rounded-[20px] text-[10px] font-syncopate font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl hover:brightness-110"
                                                    style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
                                                >
                                                    Confirmar
                                                </button>
                                                <button
                                                    onClick={() => setShowAddTask(false)}
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

                    {/* Timeline Task View */}
                    <div className="px-6 relative">
                        {/* Visual Timeline Bar passing through */}
                        <div className="absolute left-[38px] top-4 bottom-10 w-[1px] bg-gradient-to-b from-transparent via-current/20 to-transparent"></div>

                        <div className="flex flex-col gap-8 relative z-10 w-full text-left">
                            {timelineTasks.length === 0 ? (
                                <ScrollReveal delay={0.3} className="py-12 flex flex-col items-center justify-center opacity-40 text-center px-4 w-full">
                                    <CalendarIcon size={32} className="mb-4 opacity-50" />
                                    <span className="text-[12px] font-mono tracking-[0.2em] uppercase font-bold mb-2">Sem Tarefas Pendentes</span>
                                    <span className="text-[9px] font-mono tracking-widest uppercase opacity-70">Aguardando coordenadas do Sistema Orvax.</span>
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

                                            {/* Timeline Node / Check */}
                                            <div className="relative flex flex-col items-center mt-1.5 shrink-0 z-20" onClick={() => handleToggleTask(task.id, task.state)}>
                                                <div className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--bg-color)] ring-4 ring-[var(--bg-color)] cursor-pointer">
                                                    {isDone ? (
                                                        <div className="w-3.5 h-3.5 rounded-full bg-[#22c55e]/30 flex items-center justify-center border border-[#22c55e]">
                                                            <CheckCircle2 size={10} className="text-[#22c55e]" />
                                                        </div>
                                                    ) : isFailed ? (
                                                        <div className="w-3.5 h-3.5 rounded-full bg-red-500/30 flex items-center justify-center border border-red-500">
                                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                                        </div>
                                                    ) : isActive ? (
                                                        <div className="w-3.5 h-3.5 rounded-full border border-[var(--orvax-green)] flex items-center justify-center bg-[var(--orvax-green)]/10 shadow-[0_0_10px_var(--orvax-green)]">
                                                            <div className="w-1.5 h-1.5 bg-[var(--orvax-green)] rounded-full animate-pulse"></div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-2.5 h-2.5 rounded-full border border-current/30 group-hover:border-current/60 transition-colors"></div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right Task Card */}
                                            <div 
                                                onClick={() => handleToggleTask(task.id, task.state)}
                                                className={`flex-1 rounded-[24px] p-5 transition-all duration-500 w-full overflow-hidden relative cursor-pointer
                                                ${isActive
                                                    ? 'border border-[var(--orvax-green)]/40 shadow-[0_0_20px_var(--orvax-green)]'
                                                    : 'border border-transparent hover:border-current/10 bg-current/[0.02]'}
                                                ${isFailed ? 'border-red-500/20 bg-red-500/5' : ''}
                                            `}
                                            >

                                                {/* Active Shimmer Effect */}
                                                {isActive && (
                                                    <div className="absolute inset-0 translate-x-[-150%] skew-x-[-25deg] bg-gradient-to-r from-transparent via-current/5 to-transparent w-[150%] animate-[shimmer_3s_infinite] pointer-events-none z-0"></div>
                                                )}

                                                <div className="relative z-10 w-full flex flex-col justify-start items-start">
                                                    <div className="w-full flex justify-between items-start mb-2">
                                                        <span className={`text-[8px] font-mono tracking-[0.3em] uppercase ${isActive ? 'opacity-60 font-bold text-[var(--orvax-green)]' : 'opacity-30'}`}>
                                                            {task.category}
                                                        </span>
                                                        {isActive && (
                                                            <div className="flex items-center gap-1 bg-[var(--orvax-green)]/10 px-2 py-0.5 rounded-full border border-[var(--orvax-green)]/30">
                                                                <div className="w-1 h-1 bg-[var(--orvax-green)] rounded-full animate-pulse"></div>
                                                                <span className="text-[7px] font-mono tracking-widest text-[var(--orvax-green)] uppercase">Ocorrência Ativa</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <h3 className={`text-[12px] font-syncopate tracking-wider uppercase mb-3 text-left w-full
                                                        ${isDone ? 'opacity-40 line-through decoration-current/20' : isActive ? 'font-black opacity-100 text-glow' : 'opacity-80 transition-opacity group-hover:opacity-100'}
                                                    `}>
                                                        {task.title}
                                                    </h3>

                                                    <div className="flex items-center gap-2">
                                                        <Clock size={12} className={isDone ? 'opacity-20' : 'opacity-40'} />
                                                        <span className={`text-[10px] font-mono ${isDone ? 'opacity-30' : 'opacity-50'}`}>{task.time} {task.period}</span>
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
                    }}>Toque fora para fechar</span>
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
                            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Voltar</span>
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
                                    <span className="text-[8px] font-mono text-white uppercase tracking-widest font-bold">Ampliar</span>
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
                                    <span className="text-[7px] font-mono opacity-40 uppercase tracking-widest">métrica</span>
                                </div>
                            </div>

                            {/* Divisor */}
                            <div className="w-full h-px opacity-10" style={{ backgroundColor: 'var(--text-main)' }} />

                            {/* Nota */}
                            <div className="pl-4" style={{ borderLeft: '2px solid var(--border-color)' }}>
                                <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest block mb-2">Registro Interno</span>
                                <p className="text-[12px] font-mono leading-loose opacity-75 italic">"{selectedPhoto.note}"</p>
                            </div>

                            {/* Tags */}
                            <div className="flex gap-2 flex-wrap">
                                {['Evolução', selectedPhoto.type, selectedPhoto.date].map(tag => (
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
                            <span className="text-[9px] font-mono opacity-35 uppercase tracking-[0.35em] block mb-0.5">Memória Visual</span>
                            <span className="text-[11px] font-syncopate font-black uppercase tracking-widest">{archiveLogs.length} Registros</span>
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
                                    <Plus size={16} /> Registrar Foto em Arquivo
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
                                            <h3 className="text-[11px] font-syncopate font-black uppercase tracking-[0.2em] opacity-90 text-left">Nova Captura Visual</h3>
                                            <ImageIcon size={16} className="opacity-20" />
                                        </div>
                                        
                                        <div className="flex flex-col gap-8">
                                            <div className="flex flex-col gap-3">
                                                <label className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-50 italic px-1">› ENDEREÇO DA IMAGEM (URL)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="HTTPS://..." 
                                                    className="w-full bg-transparent border-b border-current/20 py-3 text-xs font-mono outline-none focus:border-current transition-all placeholder:opacity-20"
                                                    value={newMedia.file_url}
                                                    onChange={e => setNewMedia({...newMedia, file_url: e.target.value})}
                                                    autoFocus
                                                />
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                <label className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-50 italic px-1">› DESCRIÇÃO OPERACIONAL</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="EX: REGISTRO DE TREINO DE PERNAS" 
                                                    className="w-full bg-transparent border-b border-current/20 py-3 text-sm font-syncopate font-black outline-none focus:border-current transition-all uppercase placeholder:opacity-20 tracking-widest"
                                                    value={newMedia.description}
                                                    onChange={e => setNewMedia({...newMedia, description: e.target.value})}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-4">
                                                <label className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-50 italic px-1">› SEGMENTAÇÃO</label>
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
                    <div className="flex flex-col gap-6 px-6">
                        {archiveLogs.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center opacity-30 text-center">
                                <ImageIcon size={40} className="mb-4" />
                                <span className="text-[12px] font-mono tracking-widest uppercase">Cofre de Mídia Vazio</span>
                                <span className="text-[8px] font-mono tracking-widest uppercase mt-2">Nenhum registro visual detectado no banco.</span>
                            </div>
                        ) : (
                            archiveLogs.map((log, index) => (
                                <ScrollReveal key={log.id} delay={index * 0.1}>
                                    <div 
                                        onClick={() => {
                                            setSelectedPhoto(log);
                                            setFullscreenPhoto(true);
                                        }}
                                        className="group relative flex flex-col gap-4 p-5 rounded-[32px] border border-current/10 hover:border-current/30 transition-all duration-500 cursor-pointer overflow-hidden"
                                    >
                                        <div className="flex justify-between items-center z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-current/5 border border-current/10 flex items-center justify-center">
                                                    {log.icon && <log.icon size={18} className="opacity-70" />}
                                                </div>
                                                <div className="text-left">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-syncopate font-black tracking-widest uppercase line-clamp-1">{log.title}</span>
                                                    </div>
                                                    <span className="text-[8px] font-mono tracking-[0.2em] opacity-40 uppercase">{log.type}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-space font-black block tracking-widest uppercase">{log.date}</span>
                                                <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest">{log.time}</span>
                                            </div>
                                        </div>

                                        <div className="relative w-full aspect-[16/9] rounded-[24px] overflow-hidden border border-current/10">
                                            <img 
                                                src={log.imgUrl} 
                                                alt={log.title}
                                                className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60"></div>
                                        </div>

                                        {log.note && (
                                            <div className="bg-current/[0.03] p-4 rounded-2xl border border-current/5">
                                                <p className="text-[9.5px] font-mono opacity-50 uppercase leading-relaxed text-left">
                                                    &quot;{log.note}&quot;
                                                </p>
                                            </div>
                                        )}
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
                            <span className="text-[10px] font-syncopate font-bold uppercase tracking-widest block mb-1 transition-colors duration-500" style={{ color: 'var(--warning-color)' }}>Aviso do Sistema</span>
                            <p className="text-[10px] font-mono leading-relaxed opacity-90 transition-colors duration-500" style={{ color: 'var(--warning-color)' }}>
                                Esta área é a <strong className="font-bold border-b transition-colors duration-500" style={{ borderColor: 'var(--warning-border)' }}>única permitida</strong> para registro e intervenção manual no sistema ORVAX. Todas as outras métricas devem ser controladas passivamente via WhatsApp com o seu Agente ORVAX.
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
                                placeholder="TRANSKREVA INSIGHTS, REFLEXÕES OU DADOS OPERACIONAIS..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                style={{ color: 'var(--text-main)' }}
                            />
                            
                            <div className="flex justify-between items-center mt-8">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-mono opacity-40 tracking-[0.2em] uppercase">Status de Registro</span>
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
                                    <span className="relative z-10">Persistir</span>
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
                                        title="Apagar Nota"
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
