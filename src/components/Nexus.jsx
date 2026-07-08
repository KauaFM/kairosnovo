import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Zap, Crosshair, Clock, CheckCircle2, Circle, ShieldAlert, Smartphone, Check, Flame, BrainCircuit, Newspaper, ChevronRight } from 'lucide-react';
import { getTasks, getProfile, updateTaskState, getWeekActivity } from '../services/db';
import { seedWeekVisualization } from '../services/seedVisualization';
import ScrollReveal from './ScrollReveal';
import { ScrollContainer, OrvaxHeader } from './BaseLayout';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { toLocalDateStr } from '../utils/dateUtils';
import PendingTodayPanel from './lifeOs/PendingTodayPanel';

const Nexus = ({ theme, toggleTheme, onOpenMentor, onOpenBlog }) => {
    // Motivational Quotes Cycling Logic
    const [quoteIndex, setQuoteIndex] = useState(0);
    const quotes = [
        "Se torne sua melhor versão.",
        "O sucesso está mais próximo do que você imagina.",
        "Tudo começa de algum lugar.",
        "Seu único limite é sua mente.",
        "1% todo dia."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setQuoteIndex(prev => (prev + 1) % quotes.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    // Interactive Symbiote Core Eye Tracking Logic (Exclusive Gyroscope)
    const [coreOffset, setCoreOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        // Mobile Gyroscope Tracking (High Sensitivity)
        const handleDeviceOrientation = (e) => {
            if (e.beta === null || e.gamma === null) return;

            // Deixando o rastreamento imensamente mais sensivel para facilitar a brincadeira no Celular
            const maxTilt = 15;  // Agora só precisa de 15 graus de inclinação física pra bater na parede! 
            const maxOffset = 25; // Permite o olho viajar mais pixels pras laterais, ficando mais longe do centro

            let gamma = e.gamma;
            let beta = e.beta - 50; // Compensador da mão segurando o celular. 

            // Hard clamp pra não deixar "vasar"
            if (gamma > maxTilt) gamma = maxTilt;
            if (gamma < -maxTilt) gamma = -maxTilt;
            if (beta > maxTilt) beta = maxTilt;
            if (beta < -maxTilt) beta = -maxTilt;

            const deltaX = (gamma / maxTilt) * maxOffset;
            const deltaY = (beta / maxTilt) * maxOffset;

            setCoreOffset({ x: deltaX, y: deltaY });
        };

        window.addEventListener('deviceorientation', handleDeviceOrientation);

        return () => {
            window.removeEventListener('deviceorientation', handleDeviceOrientation);
        };
    }, []);

    // Fetch Pending Tasks for Today
    const [pendingTasks, setPendingTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        streak: '--',
        goalsCompleted: '--',
        goalsTotal: '--',
        weekStatus: [false, false, false, false, false, false, false]
    });

    const unsubscribeRef = useRef([]);
    const { subscribeToOrvaxAgenda } = useRealtimeSync();

    useEffect(() => {
        const fetchNexusData = async () => {
            const today = toLocalDateStr();
            const tasks = await getTasks(today);

            if (tasks) {
                const pending = tasks.filter(t => t.state === 'pending' || t.state === 'active').slice(0, 3);
                const completed = tasks.filter(t => t.state === 'done').length;

                setPendingTasks(pending.map(t => ({
                    id: t.id,
                    title: t.title,
                    category: t.category || 'SISTEMA',
                    time_start: t.time_start,
                    duration: t.duration || '1h',
                    state: t.state
                })));

                const profile = await getProfile();
                const weekActivity = await getWeekActivity();
                setStats({
                    streak: profile?.streak_days || 0,
                    goalsCompleted: completed,
                    goalsTotal: tasks.length,
                    weekStatus: weekActivity.length === 7 ? weekActivity : [false, false, false, false, false, false, false]
                });
            }
            setLoading(false);
        };

        fetchNexusData();

        // Set up real-time listeners for orvax_agenda changes
        const unsubscribeOrvaxAgenda = subscribeToOrvaxAgenda(() => {
            fetchNexusData();
        });

        if (unsubscribeOrvaxAgenda) {
            unsubscribeRef.current.push(unsubscribeOrvaxAgenda);
        }

        // Cleanup function - unsubscribe from all listeners
        return () => {
            unsubscribeRef.current.forEach(unsubscribe => unsubscribe?.());
            unsubscribeRef.current = [];
        };
    }, [subscribeToOrvaxAgenda]);

    const handleToggleTask = async (taskId, currentState) => {
        const newState = currentState === 'done' ? 'active' : 'done';
        await updateTaskState(taskId, newState);
        // Refresh
        const today = toLocalDateStr();
        const tasks = await getTasks(today);
        if (tasks) {
            setPendingTasks(tasks.filter(t => t.state === 'pending' || t.state === 'active').slice(0, 3));
        }
    };

    const handleSeedData = async () => {
        if (window.confirm('Deseja injetar dados de visualização para os últimos 7 dias?')) {
            const res = await seedWeekVisualization();
            if (res.success) {
                alert('Dados gerados! O Nexus e os Pilares agora possuem 1 semana de inteligência.');
                window.location.reload();
            }
        }
    };

    // Memoize the background star generation so they don't recalculate and re-render on every app state change
    const backgroundStars = useMemo(() => {
        return [...Array(150)].map((_, i) => {
            // Cria um aglomerado de estrelas parecido com uma galáxia (mais denso no centro, se espalhando)
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * Math.random() * 50; // Math.random() twice weights points towards center

            const top = (50 + Math.sin(angle) * radius).toFixed(2);
            const left = (50 + Math.cos(angle) * (radius * 1.5)).toFixed(2); // Stretch horizontally
            const duration = (2 + Math.random() * 4).toFixed(1);
            const delay = (Math.random() * 5).toFixed(1);
            const size = Math.random() > 0.9 ? '3px' : Math.random() > 0.5 ? '2px' : '1px';
            const baseOpacity = (Math.random() * 0.8 + 0.2).toFixed(2);

            return (
                <div
                    key={`star-${i}`}
                    className="absolute rounded-full"
                    style={{
                        backgroundColor: 'var(--text-main)',
                        boxShadow: '0 0 6px var(--text-main)',
                        top: `${top}%`,
                        left: `${left}%`,
                        width: size,
                        height: size,
                        opacity: baseOpacity,
                        animation: `pulse-slow ${duration}s ease-in-out ${delay}s infinite alternate`,
                        willChange: 'transform, opacity'
                    }}
                />
            );
        });
    }, []);

    // Memoize Symbiote Matter (The organic liquid mass)
    const symbioteMass = useMemo(() => {
        return Array.from({ length: 4 }).map((_, i) => (
            <div
                key={`symbiote-${i}`}
                className="absolute inset-0 transition-all duration-1000"
                style={{
                    backgroundColor: 'var(--text-main)',
                    opacity: 0.7 - (i * 0.1),
                    transform: `rotate(${i * 45}deg) scale(${0.85 + (i * 0.05)})`,
                    animation: `alien-morph ${8 + i * 2}s ease-in-out -${i * 3}s infinite ${i % 2 === 0 ? 'alternate' : 'alternate-reverse'}`,
                    willChange: 'border-radius, transform'
                }}
            ></div>
        ));
    }, []);

    // Active tendrils / organic shifting layers inside the symbiote
    const tendrils = useMemo(() => {
        return Array.from({ length: 6 }).map((_, i) => (
            <div
                key={`tendril-${i}`}
                className="absolute inset-4"
                style={{
                    backgroundColor: 'var(--text-main)',
                    opacity: 0.4,
                    transform: `rotate(${i * 60}deg) scale(${0.8 + Math.random() * 0.2})`,
                    animation: `alien-morph ${6 + Math.random() * 4}s ease-in-out -${Math.random() * 5}s infinite ${i % 2 === 0 ? 'alternate-reverse' : 'alternate'}`,
                    willChange: 'border-radius, transform',
                    filter: 'blur(2px)'
                }}
            ></div>
        ));
    }, []);

    // Intergalactic Dust emitting from the symbiote to form the star field
    const cosmicDust = useMemo(() => {
        return Array.from({ length: 45 }).map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 80 + Math.random() * 220; // Travel distance outwards
            const tx = (Math.cos(angle) * distance).toFixed(2);
            const ty = (Math.sin(angle) * distance).toFixed(2);
            const duration = (2.5 + Math.random() * 2.5).toFixed(2);
            const delay = (Math.random() * -6).toFixed(2); // Start at random points in time
            const size = Math.random() > 0.6 ? '3px' : '2px';

            return (
                <div
                    key={`dust-${i}`}
                    className="absolute rounded-full"
                    style={{
                        backgroundColor: 'var(--text-main)',
                        boxShadow: '0 0 6px var(--text-main)',
                        width: size,
                        height: size,
                        '--tx': tx,
                        '--ty': ty,
                        animation: `emit-dust ${duration}s ease-out ${delay}s infinite`,
                        willChange: 'transform, opacity',
                        opacity: 0 // Will be handled by the animation keyframes
                    }}
                ></div>
            );
        });
    }, []);

    if (loading) return (
        <ScrollContainer>
            <OrvaxHeader theme={theme} toggleTheme={toggleTheme} />
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-[var(--text-main)] border-t-transparent rounded-full animate-spin opacity-40"></div>
            </div>
        </ScrollContainer>
    );

    return (
        <ScrollContainer>
            <OrvaxHeader theme={theme} toggleTheme={toggleTheme} />
            <div className="animate-in slide-in-from-left-4 duration-700 delay-100 pb-32 relative" style={{ color: 'var(--text-main)' }}>

            {/* Subtle dotted grid */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(var(--text-main) 0.5px, transparent 0.5px)',
                    backgroundSize: '24px 24px',
                    opacity: 0.02
                }}
            />

            {/* Identity Header */}
            <div className="mb-6 flex flex-col items-center justify-center relative w-full mt-4 z-10">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.5)' }}></div>
                    <span 
                        className="text-[8px] font-mono tracking-[0.35em] uppercase font-bold text-[#22c55e] opacity-60"
                    >
                        Monitoramento Ativo
                    </span>
                </div>

                <h2 className="text-[18px] font-outfit font-black tracking-tight text-center max-w-[85%] leading-relaxed mb-4 opacity-85">
                    Estou sempre te observando, <br />não erre.
                </h2>

                {/* Rotating Quote */}
                <div className="h-6 flex items-center justify-center overflow-hidden w-full px-6">
                    <p
                        key={quoteIndex}
                        className="text-[8px] font-mono opacity-30 tracking-[0.25em] text-center uppercase animate-fade-in-up"
                    >
                        &quot; {quotes[quoteIndex]} &quot;
                    </p>
                </div>

                {/* Acesso à Timeline de Notícias (realocada da aba central) */}
                <button
                    onClick={() => onOpenBlog?.()}
                    className="mt-5 flex items-center gap-2 px-4 py-2 rounded-full border transition-all hover:scale-[1.03] active:scale-95"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
                >
                    <Newspaper size={13} className="opacity-50" />
                    <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase opacity-50">Timeline de Notícias</span>
                    <ChevronRight size={12} className="opacity-30" />
                </button>
            </div>

            {/* The Symbiote Entity */}
            <ScrollReveal delay={0.15} className="relative w-full aspect-square mt-2 mb-16 flex items-center justify-center z-10">

                {/* Star Field */}
                <div className="absolute inset-[-100%] flex items-center justify-center pointer-events-none z-0 mix-blend-normal opacity-100" style={{ maskImage: 'radial-gradient(ellipse 50% 40% at 50% 50%, black 10%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 50% 40% at 50% 50%, black 10%, transparent 80%)' }}>
                    {backgroundStars}
                </div>

                <div className="w-56 h-56 sm:w-64 sm:h-64 relative flex items-center justify-center group z-10 transition-transform duration-700 hover:scale-105" style={{ color: 'var(--text-main)' }}>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        {cosmicDust}
                    </div>
                    <div className="absolute inset-[-10%] opacity-[0.15] blur-[30px] rounded-full animate-pulse" style={{ backgroundColor: 'var(--text-main)' }}></div>
                    <div className="absolute w-32 h-32 opacity-[0.2] blur-[15px] rounded-full animate-pulse" style={{ backgroundColor: 'var(--text-main)' }}></div>
                    <div
                        className="absolute w-2.5 h-2.5 bg-red-600 rounded-full shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse z-30 opacity-90 transition-transform duration-200 ease-out"
                        style={{ transform: `translate(${coreOffset.x}px, ${coreOffset.y}px)` }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-[spin_80s_linear_infinite]" style={{ willChange: 'transform' }}>
                        {symbioteMass}
                        {tendrils}
                    </div>
                </div>

                <div className="absolute w-72 h-72 border-[0.5px] border-dashed animate-[spin_120s_linear_infinite_reverse] opacity-10 pointer-events-none z-0 rounded-full" style={{ borderColor: 'var(--text-main)' }}></div>
            </ScrollReveal>

            {/* System Directives Card */}
            <ScrollReveal delay={0.2} className="w-full max-w-sm mx-auto mb-5 px-5 z-10 relative">
                <div className="rounded-[28px] border p-6 relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.015] pointer-events-none" style={{ backgroundColor: 'var(--text-main)', filter: 'blur(30px)' }}></div>

                    <div className="flex items-center gap-2.5 mb-5 relative z-10">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
                            <ShieldAlert size={14} style={{ opacity: 0.4 }} />
                        </div>
                        <div>
                            <h3 className="text-[10px] font-outfit font-bold tracking-tight opacity-70">Diretrizes do Sistema</h3>
                            <p className="text-[7px] font-mono opacity-15 tracking-[0.2em] uppercase">protocolo de operacao</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex items-start gap-3 group">
                            <div className="mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                                <Check size={10} className="text-[#22c55e]" style={{ opacity: 0.6 }} />
                            </div>
                            <p className="text-[8px] font-mono opacity-35 leading-relaxed tracking-wider">
                                Voce nao pode editar, alterar ou adicionar informacoes dentro do aplicativo.
                            </p>
                        </div>

                        <div className="flex items-start gap-3 group">
                            <div className="mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                                <Check size={10} className="text-[#22c55e]" style={{ opacity: 0.6 }} />
                            </div>
                            <p className="text-[8px] font-mono opacity-35 leading-relaxed tracking-wider">
                                Este aplicativo funciona apenas como <strong className="opacity-70">visualizador</strong> dos seus registros.
                            </p>
                        </div>

                        <div className="w-full h-px opacity-5" style={{ backgroundColor: 'var(--text-main)' }}></div>

                        <div className="flex items-start gap-3 group">
                            <div className="mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                                <Smartphone size={10} className="text-[#22c55e]" style={{ opacity: 0.6 }} />
                            </div>
                            <p className="text-[8px] font-mono opacity-35 leading-relaxed tracking-wider">
                                Todas as acoes devem ser feitas <strong className="opacity-70">exclusivamente pelo WhatsApp</strong> com o Agente ORVAX.
                            </p>
                        </div>

                        <div className="flex items-start gap-3 group">
                            <div className="mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                                <Smartphone size={10} className="text-[#22c55e]" style={{ opacity: 0.6 }} />
                            </div>
                            <p className="text-[8px] font-mono opacity-35 leading-relaxed tracking-wider">
                                O Agente ORVAX e o unico responsavel por registrar, organizar e modificar seus dados.
                            </p>
                        </div>
                    </div>
                </div>
            </ScrollReveal>

            {/* Streak & Goals Widget */}
            <ScrollReveal delay={0.1} className="w-full max-w-sm mx-auto mb-5 px-5 z-10 relative">
                <div className="rounded-[28px] border p-5 flex items-center gap-4 relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[var(--bg-color)] opacity-40 pointer-events-none"></div>

                    {/* Streak Core */}
                    <div className="flex flex-col items-center justify-center rounded-[22px] relative z-10 shrink-0 w-[85px] h-[100px] border" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
                        <div className="absolute inset-0 rounded-[22px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.04), transparent 70%)' }}></div>
                        <Flame size={24} strokeWidth={1.5} className="text-[#ef4444] mb-1.5 relative z-10" style={{ filter: 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' }} />
                        <span className="text-[22px] font-outfit font-black leading-none relative z-10 opacity-85">{stats.streak}</span>
                        <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.2em] mt-1 relative z-10">dias</span>
                    </div>

                    {/* Goals + Week */}
                    <div className="flex flex-col flex-1 relative z-10 py-1">
                        {/* Goal count */}
                        <div className="flex items-baseline gap-1.5 mb-3">
                            <span className="text-[28px] font-outfit font-black leading-none opacity-85">{stats.goalsCompleted}</span>
                            <span className="text-[14px] font-outfit opacity-20">/ {stats.goalsTotal}</span>
                            <span className="text-[7px] font-mono opacity-15 uppercase tracking-[0.2em] ml-1">metas</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-[4px] rounded-full overflow-hidden mb-4 relative" style={{ backgroundColor: 'var(--border-color)' }}>
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${(Number(stats.goalsCompleted) / Number(stats.goalsTotal)) * 100 || 0}%`,
                                    background: 'linear-gradient(90deg, #22c55e, #4ade80)',
                                    boxShadow: '0 0 8px rgba(34,197,94,0.4)'
                                }}
                            ></div>
                        </div>

                        {/* Week Tracker */}
                        <div className="flex justify-between items-center w-full">
                            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, idx) => {
                                const isChecked = stats.weekStatus[idx];
                                const isToday = new Date().getDay() === (idx + 1) % 7;
                                return (
                                    <div key={idx} className="flex flex-col items-center gap-1.5">
                                        <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all duration-300
                                            ${isChecked ? 'bg-[#22c55e]' : 'border'}`}
                                            style={!isChecked ? { borderColor: 'var(--border-color)' } : { boxShadow: '0 0 8px rgba(34,197,94,0.3)' }}
                                        >
                                            {isChecked && <Check size={9} strokeWidth={3} className="text-[#000]" />}
                                        </div>
                                        <span className={`text-[7px] font-mono uppercase tracking-[0.15em] font-bold transition-all ${
                                            isToday ? 'opacity-70 text-[#22c55e]' : isChecked ? 'opacity-40' : 'opacity-15'
                                        }`}>
                                            {day}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </ScrollReveal>

            {/* Pending Today (Life OS — unified) */}
            <ScrollReveal delay={0.15} className="w-full max-w-sm mx-auto mb-10 px-5 z-10 relative">
                <PendingTodayPanel />
            </ScrollReveal>

            {/* Legacy task strip (compat com UI antiga) */}
            <ScrollReveal delay={0.2} className="w-full max-w-sm mx-auto mb-10 px-5 z-10 relative hidden">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-20 font-bold">tarefas pendentes</span>
                    <span className="text-[8px] font-mono opacity-10">{pendingTasks.length}</span>
                </div>

                <div className="flex flex-col gap-2">
                    {pendingTasks.length === 0 ? (
                        <div className="rounded-[24px] border p-6 flex flex-col justify-center items-center text-center" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
                                <ShieldAlert size={18} className="opacity-15" />
                            </div>
                            <span className="text-[10px] font-outfit font-bold opacity-40 mb-0.5">Area Limpa</span>
                            <span className="text-[7px] font-mono tracking-[0.2em] uppercase opacity-15">sem pendencias atuais</span>
                        </div>
                    ) : (
                        pendingTasks.map((task) => {
                            const isActive = task.state === 'active';
                            return (
                                <button
                                    key={task.id}
                                    onClick={() => handleToggleTask(task.id, task.state)}
                                    className="w-full rounded-[24px] border p-4 flex justify-between items-center group transition-all hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden"
                                    style={{
                                        borderColor: isActive ? 'rgba(34,197,94,0.25)' : 'var(--border-color)',
                                        backgroundColor: isActive ? 'rgba(34,197,94,0.03)' : 'var(--glass-bg)',
                                        boxShadow: isActive ? '0 0 20px rgba(34,197,94,0.08)' : 'none'
                                    }}
                                >
                                    {/* Active glow bar */}
                                    {isActive && <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #22c55e, transparent 60%)' }} />}

                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                            isActive ? 'border-[#22c55e]' : ''
                                        }`} style={!isActive ? { borderColor: 'var(--border-color)' } : { boxShadow: '0 0 6px rgba(34,197,94,0.4)' }}>
                                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse"></div>}
                                        </div>
                                        <div className="text-left">
                                            <h4 className={`text-[10px] font-outfit font-bold tracking-tight truncate max-w-[180px] ${
                                                isActive ? 'text-[#22c55e] opacity-90' : 'opacity-60'
                                            }`}>{task.title}</h4>
                                            <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.15em]">{task.category || 'Sistema'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <div className="flex items-center gap-1 opacity-40">
                                            <Clock size={9} />
                                            <span className="text-[10px] font-mono font-bold">{task.time_start}</span>
                                        </div>
                                        <span className="text-[7px] font-mono opacity-15 mt-0.5 uppercase">{task.duration || '--'}</span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </ScrollReveal>
            </div>
        </ScrollContainer>
    );
};

export default Nexus;
