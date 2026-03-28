import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Clock, CheckCircle2, ListFilter, AlertCircle, Plus, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
const FullCalendar = ({ onClose, onSelectDate }) => {
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [selectedDate, setSelectedDate] = useState(today.getDate());
    const [selectedTime, setSelectedTime] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', time_start: '09:00', category: 'GERAL', duration: '1h' });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const monthNamesShort = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    const dayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // Fill days
    const blankDays = Array.from({ length: firstDayIndex }).map((_, i) => i);
    const monthDays = Array.from({ length: daysInMonth }).map((_, i) => i + 1);

    const generateTimes = () => {
        const timesArr = [];
        for (let h = 5; h <= 23; h++) {
            timesArr.push(`${h.toString().padStart(2, '0')}:00`);
            timesArr.push(`${h.toString().padStart(2, '0')}:30`);
        }
        return timesArr;
    };
    const times = generateTimes();

    const [timelineTasks, setTimelineTasks] = useState([]);

    useEffect(() => {
        const fetchTasks = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Fetch all tasks for the current month from tasks table
            const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`;

            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', session.user.id)
                .gte('scheduled_date', startDate)
                .lte('scheduled_date', endDate)
                .order('time_start', { ascending: true });

            if (!error && tasks) {
                const mappedTasks = tasks.map(t => ({
                    id: t.id,
                    time: t.time_start || '--:--',
                    period: t.time_start && parseInt(t.time_start.split(':')[0]) >= 12 ? 'PM' : 'AM',
                    title: t.title,
                    category: t.category || 'GERAL',
                    date: t.scheduled_date,
                    duration: t.duration || '1h',
                    state: t.state || 'pending'
                }));
                setTimelineTasks(mappedTasks);
            }
        };
        fetchTasks();
    }, [selectedDate, month, year, refreshTrigger]);

    const handleCreateTask = async () => {
        if (!newTask.title) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;

        await supabase.from('tasks').insert({
            user_id: session.user.id,
            title: newTask.title,
            time_start: newTask.time_start,
            category: newTask.category,
            duration: newTask.duration,
            scheduled_date: dateStr,
            state: 'pending'
        });

        setShowAddModal(false);
        setNewTask({ title: '', time_start: '09:00', category: 'GERAL', duration: '1h' });
        setRefreshTrigger(prev => prev + 1);
    };

    const filteredTasks = useMemo(() => {
        // Step 1: Filter by specific date
        const targetDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
        const dateFiltered = timelineTasks.filter(task => task.date === targetDate);

        // Step 2: Filter by specific time if active
        if (!selectedTime) return dateFiltered;
        const [filterH] = selectedTime.split(':');
        return dateFiltered.filter(task => {
            const [taskH] = task.time.split(':');
            return taskH === filterH;
        });
    }, [selectedTime, timelineTasks, selectedDate, month, year]);

    return (
        <div className="absolute inset-0 z-[100] flex flex-col font-sans animate-in slide-in-from-bottom-8 duration-500 overflow-y-auto" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>

            {/* Ambient Background Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none z-0"></div>

            {/* Header / Nav */}
            <div className="px-6 pt-12 pb-6 flex justify-between items-center border-b border-current/10 bg-current/5 backdrop-blur-3xl sticky top-0 z-30">
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--text-main)] hover:scale-105 transition-all shadow-[0_0_15px_var(--glass-shadow)]"
                    style={{ color: 'var(--bg-color)' }}
                >
                    <X size={20} strokeWidth={2.5} />
                </button>
                <h2 className="text-[12px] font-syncopate font-black tracking-[0.3em] uppercase opacity-80">Orvax Sync</h2>
                <div className="w-10 h-10"></div> {/* Spacer to balance flex */}
            </div>

            <div className="px-6 py-8 flex flex-col items-center max-w-[420px] mx-auto w-full relative z-10">

                {/* --- ORVAX STYLED CALENDAR WIDGET --- */}
                <div className="flex gap-4 w-full h-[360px] mb-6">

                    {/* Main Calendar Card (Left) */}
                    <div className="flex-1 bg-current/5 border border-current/10 rounded-[28px] p-5 flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden">

                        {/* Month Header */}
                        <div className="flex justify-between items-center mb-6 px-1 relative z-10">
                            <button onClick={handlePrevMonth} className="text-current/40 hover:text-current transition-colors">
                                <ChevronLeft size={18} />
                            </button>
                            <div className="text-[13px] font-syncopate font-bold tracking-widest uppercase">
                                {monthNames[month]} <span className="opacity-60 ml-1">{year}</span>
                            </div>
                            <button onClick={handleNextMonth} className="text-current/40 hover:text-current transition-colors">
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* Days of week */}
                        <div className="grid grid-cols-7 mb-4 relative z-10">
                            {dayNames.map(d => (
                                <div key={d} className="text-center text-[9px] font-mono tracking-widest opacity-30 uppercase">{d}</div>
                            ))}
                        </div>

                        {/* Dates grid */}
                        <div className="grid grid-cols-7 gap-y-3 relative z-10">
                            {blankDays.map(b => <div key={`blank-${b}`} />)}

                            {monthDays.map(d => {
                                const isSelected = d === selectedDate;
                                const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                                const hasEvent = timelineTasks.some(t => {
                                    if (!t.date) return false;
                                    const [tYear, tMonth, tDay] = t.date.split('-').map(Number);
                                    return tDay === d && tMonth === (month + 1) && tYear === year;
                                });

                                return (
                                    <div key={d} className="flex justify-center items-center h-8 relative group">
                                        <button
                                            onClick={() => {
                                                setSelectedDate(d);
                                                if (onSelectDate) onSelectDate(d, month, year);
                                            }}
                                            className={`w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] font-space transition-all duration-300
                                                ${isSelected
                                                    ? 'bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-110'
                                                    : 'text-current/70 hover:bg-current/10 hover:text-current'}
                                                ${isToday && !isSelected ? 'border border-white/40 text-white' : ''}
                                            `}
                                        >
                                            {d}
                                        </button>
                                        {/* Event Indicator Dot */}
                                        {hasEvent && !isSelected && (
                                            <div className="absolute -bottom-1 w-[3px] h-[3px] bg-white/40 rounded-full"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Vertical Time Picker Card (Right) */}
                    <div className="w-[85px] bg-current/5 border border-current/10 rounded-[28px] py-4 flex flex-col items-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden">
                        <div className="text-[9px] font-syncopate tracking-widest uppercase opacity-40 mb-4 z-10 flex flex-col items-center gap-1">
                            Hora
                            {selectedTime && <span className="text-[6px] bg-white/20 text-white px-1.5 py-0.5 rounded-full mt-1">ATIVO</span>}
                        </div>

                        <div className="flex flex-col w-full px-2 gap-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-4 z-10 relative" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)' }}>
                            {times.map(t => {
                                const isSelected = t === selectedTime;
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setSelectedTime(isSelected ? null : t)}
                                        className={`w-full py-2.5 rounded-[12px] text-[12px] font-mono transition-all shrink-0
                                            ${isSelected
                                                ? 'bg-white text-black font-bold shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                                                : 'text-current/40 hover:text-current hover:bg-current/10'}
                                        `}
                                    >
                                        {t}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Bottom Event Summary Card */}
                <div className="w-full bg-[#0a0a0a]/80 border border-white/10 rounded-[32px] p-2 pr-6 flex items-center gap-5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden mb-12 group hover:border-white/30 transition-all cursor-pointer">

                    {/* Hover Shimmer */}
                    <div className="absolute inset-0 translate-x-[-150%] skew-x-[-25deg] bg-gradient-to-r from-transparent via-white/5 to-transparent w-[150%] group-hover:animate-[shimmer_2s_infinite] pointer-events-none z-0"></div>

                    {/* Date Rounded Square (Premium Black) */}
                    <div className="bg-[#151515] border border-white/5 rounded-[28px] w-[70px] h-[70px] flex flex-col justify-center items-center shrink-0 shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)] relative z-10 transition-transform group-hover:scale-105">
                        <span className="text-[9px] font-syncopate font-bold tracking-[0.2em] text-white/40 uppercase mt-1">{monthNamesShort[month]}</span>
                        <span className="text-[26px] font-space font-black leading-none text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{selectedDate}</span>
                    </div>

                    {/* Info Block */}
                    <div className="flex flex-col justify-center gap-1.5 relative z-10 flex-1">
                        <span className="text-[13px] font-syncopate font-black tracking-widest uppercase text-white drop-shadow-md flex items-center justify-between w-full">
                            {filteredTasks.length > 0 ? filteredTasks[0].title : 'LIVRE'}
                            {filteredTasks.length > 0 && (
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                            )}
                        </span>

                        <div className="flex items-center gap-2">
                            <Clock size={11} className="text-white/40" />
                            <span className="text-[11px] font-mono text-white/50 tracking-widest font-medium">
                                {selectedTime ? `${selectedTime} H` : filteredTasks.length > 0 ? `${filteredTasks[0].time} H` : '--:--'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* --- Timeline View Below Calendar --- */}
                <div className="w-full mt-2 relative">
                    <div className="flex justify-between items-center mb-8 pl-4 border-l-2 border-white/50">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[10px] font-syncopate font-black tracking-widest uppercase opacity-60">
                                Tarefas do Dia
                            </h3>
                            <button onClick={() => setShowAddModal(true)} className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <Plus size={10} />
                            </button>
                        </div>
                        {selectedTime && (
                            <button onClick={() => setSelectedTime(null)} className="flex items-center gap-1 text-[9px] font-mono opacity-50 hover:opacity-100 transition-opacity bg-white/5 px-2 py-1 rounded-full">
                                <ListFilter size={10} />
                                LIMPAR FILTRO
                            </button>
                        )}
                    </div>

                    {/* Quick Add Modal */}
                    {showAddModal && (
                        <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-[20px] relative">
                            <button onClick={() => setShowAddModal(false)} className="absolute top-3 right-3 opacity-50 hover:opacity-100"><X size={14} /></button>
                            <h4 className="text-[9px] font-syncopate tracking-widest uppercase opacity-60 mb-4">Nova Tarefa</h4>
                            <input type="text" placeholder="TÍTULO DA TAREFA" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-transparent border-b border-white/20 text-[12px] font-mono mb-3 pb-1 outline-none focus:border-[#22c55e]" />
                            <div className="flex gap-2 mb-4">
                                <input type="time" value={newTask.time_start} onChange={e => setNewTask({ ...newTask, time_start: e.target.value })} className="bg-white/5 rounded-lg px-2 py-1 text-[10px] font-mono flex-1 outline-none" />
                                <input type="text" placeholder="CATEGORIA" value={newTask.category} onChange={e => setNewTask({ ...newTask, category: e.target.value })} className="bg-white/5 rounded-lg px-2 py-1 text-[10px] font-mono flex-1 outline-none" />
                            </div>
                            <button onClick={handleCreateTask} className="w-full bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30 py-2 rounded-xl text-[10px] font-syncopate uppercase font-bold tracking-widest hover:bg-[#22c55e]/30 transition-colors">ADICIONAR</button>
                        </div>
                    )}

                    {/* Visual Timeline Bar passing through */}
                    <div className="absolute left-[38px] top-12 bottom-10 w-[1px] bg-gradient-to-b from-transparent via-current/20 to-transparent"></div>

                    <div className="flex flex-col gap-8 relative z-10 w-full mb-10 text-left">
                        {filteredTasks.length === 0 ? (
                            <div className="text-center opacity-40 text-[11px] font-mono py-10">
                                Nenhuma tarefa nesta hora.
                            </div>
                        ) : (
                            filteredTasks.map((task) => {
                                const isDone = task.state === 'done';
                                const isActive = task.state === 'active';
                                const isFailed = task.state === 'failed';

                                return (
                                    <div key={task.id} className="flex gap-4 group items-start relative w-full">
                                        {/* Left Time Block */}
                                        <div className="flex flex-col items-end w-12 pt-1 shrink-0">
                                            <span className={`text-[12px] font-space font-bold ${(isDone || isFailed) ? 'opacity-30' : isActive ? 'text-glow opacity-100 scale-110 origin-right transition-transform' : 'opacity-70'}`}>
                                                {task.time}
                                            </span>
                                            <span className="text-[8px] font-mono opacity-30 mt-0.5">{task.duration}</span>
                                        </div>

                                        {/* Timeline Node / Check */}
                                        <div className="relative flex flex-col items-center mt-1.5 shrink-0 z-20">
                                            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-[var(--bg-color)] ring-4 ring-[var(--bg-color)]">
                                                {isDone ? (
                                                    <div className="w-3.5 h-3.5 rounded-full bg-current/20 flex items-center justify-center border border-current/30">
                                                        <CheckCircle2 size={10} className="opacity-60" />
                                                    </div>
                                                ) : isFailed ? (
                                                    <div className="w-3.5 h-3.5 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
                                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                                    </div>
                                                ) : isActive ? (
                                                    <div className="w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                                                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                                    </div>
                                                ) : (
                                                    <div className="w-2.5 h-2.5 rounded-full border border-white/30 group-hover:border-white/60 transition-colors"></div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Task Card */}
                                        <div className={`flex-1 rounded-[24px] p-5 transition-all duration-500 w-full overflow-hidden relative cursor-pointer
                                            ${isActive ? 'border border-white/40 bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'border border-transparent hover:border-white/10 bg-white/[0.02]'}
                                            ${isFailed ? 'border-red-500/20 bg-red-500/5' : ''}
                                        `}
                                        >
                                            {/* Active Shimmer Effect */}
                                            {isActive && (
                                                <div className="absolute inset-0 translate-x-[-150%] skew-x-[-25deg] bg-gradient-to-r from-transparent via-white/5 to-transparent w-[150%] animate-[shimmer_3s_infinite] pointer-events-none z-0"></div>
                                            )}

                                            <div className="relative z-10 w-full flex flex-col justify-start items-start">
                                                <div className="w-full flex justify-between items-start mb-2">
                                                    <span className={`text-[8px] font-mono tracking-[0.3em] uppercase ${isActive ? 'opacity-80 font-bold text-white' : 'opacity-30'}`}>
                                                        {task.category}
                                                    </span>
                                                    {isActive && (
                                                        <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full border border-white/30">
                                                            <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                                                            <span className="text-[7px] font-mono tracking-widest text-white uppercase">Ativo</span>
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
                                                    <span className={`text-[10px] font-mono ${isDone ? 'opacity-30' : 'opacity-50'}`}>
                                                        {task.time} {task.period}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>

        </div>
    );
};

export default FullCalendar;
