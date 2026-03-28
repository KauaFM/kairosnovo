import React, { useMemo, useState, useEffect } from 'react';
import { Zap, Crosshair, Clock, CheckCircle2, Circle, ShieldAlert, Smartphone, Check, Flame, BrainCircuit } from 'lucide-react';
import { getTasks, getProfile, updateTaskState, getWeekActivity } from '../services/db';
import ScrollReveal from './ScrollReveal';
import { ScrollContainer, OrvaxHeader } from './BaseLayout';

import { toLocalDateStr } from '../utils/dateUtils';

const Nexus = ({ theme, toggleTheme, onOpenMentor }) => {
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
    const [stats, setStats] = useState({
        streak: '--',
        goalsCompleted: '--',
        goalsTotal: '--',
        weekStatus: [false, false, false, false, false, false, false]
    });

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
        };

        fetchNexusData();
    }, []);

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

    return (
        <ScrollContainer>
            <OrvaxHeader theme={theme} toggleTheme={toggleTheme} />
            <div className="animate-in slide-in-from-left-4 duration-700 delay-100">
            {/* Identity Header / Overseer Phrase */}
            <div className="mb-6 flex flex-col items-center justify-center relative w-full mt-4">
                <div className="flex items-center gap-2 mb-4 opacity-50">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse"></div>
                    <span className="text-[9px] font-mono tracking-[0.4em] uppercase font-bold text-[#22c55e]">
                        Monitoramento Ativo
                    </span>
                </div>

                <h2 className="text-xl font-syncopate font-black tracking-widest uppercase text-center drop-shadow-sm max-w-[85%] leading-relaxed mb-4 text-glow">
                    Estou sempre te observando, <br /> não erre.
                </h2>

                {/* Rotating Motivational Citation */}
                <div className="h-6 flex items-center justify-center overflow-hidden w-full px-6">
                    <p
                        key={quoteIndex}
                        className="text-[9.5px] font-mono opacity-60 tracking-[0.3em] text-center uppercase animate-fade-in-up"
                    >
                        &quot; {quotes[quoteIndex]} &quot;
                    </p>
                </div>
            </div>

            {/* The Tangled Fiber Sphere (Neural Orb) */}
            <ScrollReveal delay={0.15} className="relative w-full aspect-square mt-2 mb-20 flex items-center justify-center">

                {/* DISTANT STAR FIELD (Galaxy effect) */}
                <div className="absolute inset-[-100%] flex items-center justify-center pointer-events-none z-0 mix-blend-normal opacity-100" style={{ maskImage: 'radial-gradient(ellipse 50% 40% at 50% 50%, black 10%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 50% 40% at 50% 50%, black 10%, transparent 80%)' }}>
                    {backgroundStars}
                </div>

                {/* The Symbiote Entity */}
                <div className="w-56 h-56 sm:w-64 sm:h-64 relative flex items-center justify-center group z-10 transition-transform duration-700 hover:scale-105" style={{ color: 'var(--text-main)' }}>

                    {/* Intergalactic Dust Emission */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        {cosmicDust}
                    </div>

                    {/* Dark Matter Aura / Outer Glow */}
                    <div className="absolute inset-[-10%] opacity-[0.15] blur-[30px] rounded-full animate-pulse" style={{ backgroundColor: 'var(--text-main)' }}></div>
                    <div className="absolute w-32 h-32 opacity-[0.2] blur-[15px] rounded-full animate-pulse" style={{ backgroundColor: 'var(--text-main)' }}></div>

                    {/* Blinking Red Core / Eye Reactor (Interactive Tracking) */}
                    <div
                        className="absolute w-2.5 h-2.5 bg-red-600 rounded-full shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse z-30 opacity-90 transition-transform duration-200 ease-out"
                        style={{ transform: `translate(${coreOffset.x}px, ${coreOffset.y}px)` }}
                    ></div>

                    {/* Spinning container for the organic mass (Gooey effect) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-[spin_80s_linear_infinite]" style={{ willChange: 'transform' }}>
                        {symbioteMass}
                        {tendrils}
                    </div>
                </div>

                {/* Outer Field Isolation Rim */}
                <div className="absolute w-72 h-72 border-[0.5px] border-dashed animate-[spin_120s_linear_infinite_reverse] opacity-20 pointer-events-none z-0 rounded-full" style={{ borderColor: 'var(--text-main)' }}></div>
            </ScrollReveal>

            {/* System Directives (WhatsApp Rules) */}
            <ScrollReveal delay={0.2} className="w-full max-w-sm mx-auto mb-10 px-6">
                <div className="border border-current/20 rounded-[28px] p-6 relative overflow-hidden transition-all duration-500 hover:-translate-y-1" style={{ backgroundColor: 'var(--glass-bg)', boxShadow: 'var(--glass-shadow)' }}>
                    {/* Background subtle noise/decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-current opacity-[0.02] rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <ShieldAlert size={16} className="text-[var(--text-main)] opacity-70" />
                        <h3 className="text-[10px] font-syncopate font-black tracking-[0.2em] uppercase opacity-90">Diretrizes do Sistema</h3>
                    </div>

                    <div className="flex flex-col gap-5 relative z-10">
                        <div className="flex items-start gap-4 group">
                            <div className="mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity"><Check size={14} className="text-[#22c55e]" /></div>
                            <p className="text-[9px] font-mono opacity-60 leading-relaxed tracking-widest uppercase">
                                Você não pode editar, alterar ou adicionar informações dentro do aplicativo.
                            </p>
                        </div>

                        <div className="flex items-start gap-4 group">
                            <div className="mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity"><Check size={14} className="text-[#22c55e]" /></div>
                            <p className="text-[9px] font-mono opacity-60 leading-relaxed tracking-widest uppercase">
                                Este aplicativo funciona apenas como <strong className="opacity-100">visualizador</strong> dos seus registros.
                            </p>
                        </div>

                        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-current/10 to-transparent my-1"></div>

                        <div className="flex items-start gap-4 group">
                            <div className="mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity"><Smartphone size={14} className="text-[#22c55e]" /></div>
                            <p className="text-[9px] font-mono opacity-60 leading-relaxed tracking-widest uppercase">
                                Todas as ações — envio de informações, correções e atualizações — devem ser feitas <strong className="opacity-100">exclusivamente pelo WhatsApp</strong> com o Agente ORVAX.
                            </p>
                        </div>

                        <div className="flex items-start gap-4 group">
                            <div className="mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity"><Smartphone size={14} className="text-[#22c55e]" /></div>
                            <p className="text-[9px] font-mono opacity-60 leading-relaxed tracking-widest uppercase">
                                O Agente ORVAX é o único responsável por registrar, organizar e modificar seus dados. Se precisar alterar algo, envie a solicitação diretamente para o ORVAX no WhatsApp.
                            </p>
                        </div>
                    </div>

                    {/* Decorative Bottom Line */}
                    <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[var(--text-main)]/20 to-transparent"></div>
                </div>
            </ScrollReveal>

            {/* Mentor AI Button */}
            {onOpenMentor && (
                <ScrollReveal delay={0.15} className="w-full max-w-sm mx-auto mb-6 px-6">
                    <button
                        onClick={onOpenMentor}
                        className="w-full glass-panel p-4 rounded-3xl flex items-center justify-between group cursor-pointer hover:bg-current/5 transition-all"
                        style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/30 flex items-center justify-center">
                                <BrainCircuit size={18} className="text-[#a855f7]" />
                            </div>
                            <div className="text-left">
                                <span className="text-[11px] font-syncopate font-bold uppercase tracking-wider block">Mentor IA</span>
                                <span className="text-[8px] font-mono opacity-40 uppercase tracking-widest">Consultar o Arquiteto</span>
                            </div>
                        </div>
                        <div className="opacity-30 group-hover:opacity-60 transition-opacity">
                            <Zap size={16} />
                        </div>
                    </button>
                </ScrollReveal>
            )}

            {/* Frequência de Metas e Streak Widget */}
            <ScrollReveal delay={0.1} className="w-full max-w-sm mx-auto mb-10 px-6">
                <div className="glass-panel p-4 sm:p-5 rounded-[32px] flex items-center gap-4 sm:gap-5 relative overflow-hidden" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--glass-bg)', boxShadow: 'var(--glass-shadow)' }}>
                    {/* Inner ambient glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--bg-color)] to-[var(--bg-color)] opacity-60 pointer-events-none z-0"></div>

                    {/* Left Box (Streak Core) */}
                    <div className="flex flex-col items-center justify-center p-3 rounded-[24px] relative z-10 shrink-0 w-[90px] h-[105px] border" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                        <div className="absolute inset-0 bg-[#ef4444]/5 blur-md rounded-[24px]"></div>
                        <Flame size={28} strokeWidth={1.5} className="text-[#ef4444] drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] mb-2 animate-pulse" />
                        <span className="font-space font-black text-xl text-glow leading-none">{stats.streak}</span>
                        <span className="text-[10px] font-space font-bold leading-none mt-1">DIAS</span>
                        <span className="text-[7px] font-mono opacity-40 uppercase tracking-widest mt-1.5 text-center leading-tight">Streak<br />Operacional</span>
                    </div>

                    {/* Right Content (Metas & Semana) */}
                    <div className="flex flex-col flex-1 relative z-10 py-1">
                        {/* Top Stats */}
                        <div className="flex items-baseline gap-1.5 mb-2.5">
                            <span className="font-space font-black text-3xl text-glow">{stats.goalsCompleted}</span>
                            <span className="font-space text-[14px] opacity-40">/ {stats.goalsTotal}</span>
                            <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest ml-1 hidden sm:inline">Metas</span>
                        </div>

                        {/* Progress Bar com Glow Acentuado */}
                        <div className="w-full h-2 rounded-full bg-current/10 mb-4 relative overflow-visible flex items-center border border-current/5">
                            {/* A barra em si */}
                            <div className="absolute top-0 left-0 h-full rounded-full bg-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.8)]" style={{ width: `${(Number(stats.goalsCompleted) / Number(stats.goalsTotal)) * 100 || 0}%` }}></div>

                            {/* O Efeito de "Luz/Saber" passando o limite (estilo Apple Fitness) */}
                            <div className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full bg-[#22c55e] opacity-40 shadow-[0_0_15px_rgba(34,197,94,0.8)] blur-[2px]" style={{ left: '0', width: `${(Number(stats.goalsCompleted) / Number(stats.goalsTotal)) * 100 || 0}%` }}></div>
                        </div>

                        {/* Week Frequency Tracker */}
                        <div className="flex justify-between items-center w-full mt-1">
                            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, idx) => {
                                const isChecked = stats.weekStatus[idx];
                                const isToday = new Date().getDay() === (idx + 1) % 7;

                                return (
                                    <div key={idx} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                                        <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all duration-300
                                            ${isChecked ? 'bg-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-current/5 border border-current/10 hover:bg-current/10'}
                                        `}>
                                            {isChecked && <Check size={10} strokeWidth={4} className="text-[var(--bg-color)]" />}
                                        </div>
                                        <span className={`text-[7px] font-mono uppercase tracking-[0.2em] font-bold transition-all duration-300 ${isToday ? 'opacity-100 text-[#22c55e] scale-110 drop-shadow-[0_0_5px_rgba(34,197,94,0.4)]' :
                                            isChecked ? 'opacity-80' : 'opacity-30'
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

            {/* Pending Tasks (Protocolos Pendentes) */}
            <ScrollReveal delay={0.15} className="w-full max-w-sm mx-auto mb-10 px-6">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40">HOJE</span>
                        <h3 className="font-syncopate text-xs font-black tracking-widest text-red-500 mt-1 shadow-[0_0_10px_rgba(239,68,68,0.4)]">Tarefas Pendentes</h3>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {pendingTasks.length === 0 ? (
                        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-center items-center text-center opacity-50" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}>
                            <ShieldAlert size={20} className="mb-2 opacity-60" />
                            <span className="text-[10px] font-mono tracking-widest uppercase mb-1">Área Limpa</span>
                            <span className="text-[8px] font-mono tracking-widest uppercase opacity-60">Sem Pendências Atuais</span>
                        </div>
                    ) : (
                        pendingTasks.map((task) => (
                            <button key={task.id} 
                                onClick={() => handleToggleTask(task.id, task.state)}
                                className={`w-full glass-panel p-4 rounded-3xl flex justify-between items-center group cursor-pointer hover:bg-current/10 transition-colors ${task.state === 'active' ? 'border-[var(--orvax-green)]/40 shadow-[0_0_15px_var(--orvax-green)]' : ''}`} 
                                style={task.state !== 'active' ? { border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' } : { border: '1px solid var(--orvax-green)', backgroundColor: 'rgba(34,197,94,0.05)' }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-4 h-4 rounded-full border group-hover:border-current/60 transition-colors ${task.state === 'active' ? 'border-[var(--orvax-green)] shadow-[0_0_8px_var(--orvax-green)]' : 'border-[var(--border-color)]'}`}>
                                        {task.state === 'active' && <div className="w-1.5 h-1.5 m-1 rounded-full bg-[var(--orvax-green)] animate-pulse"></div>}
                                    </div>
                                    <div className="text-left">
                                        <h4 className={`font-syncopate text-[11px] font-black uppercase tracking-wider mb-1 line-clamp-1 ${task.state === 'active' ? 'text-[var(--orvax-green)] drop-shadow-[0_0_5px_var(--orvax-green)]' : ''}`}>{task.title}</h4>
                                        <span className="text-[9px] font-mono opacity-50 uppercase block">{task.category || 'Sistema'}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1 opacity-70">
                                        <Clock size={10} />
                                        <span className="text-[10px] font-space font-bold">{task.time_start}</span>
                                    </div>
                                    <span className="text-[8px] font-mono opacity-40 mt-1 uppercase">{task.duration || '--'}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </ScrollReveal>
            </div>
        </ScrollContainer>
    );
};

export default Nexus;
