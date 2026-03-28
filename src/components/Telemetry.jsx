import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RadarChart from './charts/RadarChart';
import GoalProgress from './Metrics/GoalProgress';
import ScrollReveal from './ScrollReveal';
import { ActiveNodeDashboard } from './Metrics/NodeDashboards';
import {
    Activity, BrainCircuit, Flame, DollarSign, Crown, Users, Cpu,
    BookOpen, Share2, Heart, Globe, Trophy, Target, ArrowUpRight,
    ArrowDownRight, Minus, ChevronRight, Compass, ShieldAlert, Zap, Plus
} from 'lucide-react';
import { getTelemetryMetrics, getProfile, saveTelemetryMetric, deleteTelemetryMetric, getUserGoals, getTelemetryHistory } from '../services/db';
import { ScrollContainer, OrvaxHeader } from './BaseLayout';

import { toLocalDateStr } from '../utils/dateUtils';

const getIconForId = (id) => {
    switch (id) {
        case 'BioFisico': return <Activity size={18} />;
        case 'Cognitivo': return <BrainCircuit size={18} />;
        case 'Frequencia': return <Flame size={18} />;
        case 'Capital': return <DollarSign size={18} />;
        case 'Dominio': return <Crown size={18} />;
        case 'Rede': return <Users size={18} />;
        case 'Algoritmo': return <Cpu size={18} />;
        case 'Upgrade': return <BookOpen size={18} />;
        case 'Social': return <Share2 size={18} />;
        case 'Espiritual': return <Heart size={18} />;
        case 'Digital': return <Globe size={18} />;
        case 'Skills': return <Trophy size={18} />;
        default: return <Target size={18} />;
    }
};

const DeepNodeCard = ({ node }) => {
    const isUp = node.trendDir === 'up';
    const isDown = node.trendDir === 'down';
    const trendColorClass = isUp ? 'text-[#22c55e]' : isDown ? 'text-red-500' : 'text-current opacity-50';

    return (
        <div className="w-full relative glass-panel rounded-[32px] p-6 mb-6 overflow-hidden transition-all hover:-translate-y-1 block" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)', backgroundColor: 'var(--glass-bg)' }}>

            {/* Header: Icon, Title, Status */}
            <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1.5 opacity-80">
                        {getIconForId(node.id)}
                        <span className="text-[12px] font-syncopate font-black uppercase tracking-widest">{node.title}</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-40 uppercase tracking-[0.2em]">{node.subtitle}</span>
                </div>
                <div className="text-right">
                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] opacity-60">{node.state}</span>
                </div>
            </div>

            {/* Main Score & Trend */}
            <div className="flex justify-between items-end mb-8 relative z-10">
                <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-outfit font-black tracking-tighter opacity-90">{node.score}</span>
                    <span className="text-sm font-outfit opacity-30">/100</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2 ${trendColorClass}`}>
                        {isUp ? <ArrowUpRight size={14} /> : isDown ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                        {node.trend}
                    </span>
                    {/* Mini 7 day graph simulation */}
                    <div className="flex items-end gap-[3px] h-8 opacity-40 mix-blend-overlay">
                        {node.history.map((h, i) => (
                            <div key={i} className="w-2.5 rounded-t-sm bg-current transition-all" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sub Metrics Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-5 mb-8 pt-6 border-t relative z-10" style={{ borderColor: 'var(--border-color)' }}>
                {node.subMetrics.map(sub => (
                    <div key={sub.label} className="flex flex-col">
                        <span className="text-[8px] font-mono uppercase tracking-[0.2em] opacity-30 mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis">{sub.label}</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-space font-bold opacity-80">{sub.value}</span>
                            <span className="text-[9px] font-mono opacity-40">{sub.unit}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Factors */}
            <div className="flex flex-col gap-5 px-5 py-5 rounded-3xl border relative z-10" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                {/* Positives */}
                <div className="flex flex-col gap-2.5">
                    <span className="text-[8px] font-mono uppercase tracking-[0.3em] font-bold text-[#22c55e] opacity-80 mb-1">Fatores Positivos (+)</span>
                    {node.factors.pos.map(f => (
                        <div key={f} className="flex items-start gap-2">
                            <span className="text-xs opacity-50 text-[#22c55e]">›</span>
                            <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 leading-tight mt-0.5">{f}</span>
                        </div>
                    ))}
                </div>

                <div className="h-px w-full bg-current opacity-5 rounded-full"></div>

                {/* Negatives */}
                <div className="flex flex-col gap-2.5">
                    <span className="text-[8px] font-mono uppercase tracking-[0.3em] font-bold text-red-500 opacity-80 mb-1">Atenção Crítica (-)</span>
                    {node.factors.crit.map(f => (
                        <div key={f} className="flex items-start gap-2">
                            <span className="text-xs opacity-50 text-red-500">›</span>
                            <span className="text-[10px] font-mono uppercase tracking-wider opacity-60 leading-tight mt-0.5">{f}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ambient minimal glow inside the card */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-current opacity-[0.02] blur-[40px] rounded-full pointer-events-none"></div>
        </div>
    );
};

const ShadowCardList = ({ nodes }) => {
    return (
        <div className="flex flex-col gap-3">
            {nodes.map(node => (
                <div key={node.id} className="w-full p-5 rounded-3xl flex justify-between items-center relative overflow-hidden group hover:bg-red-500/5 transition-colors border" style={{ borderColor: 'var(--border-color)' }}>
                    {/* Subtile red hint */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500 opacity-30 group-hover:opacity-60 transition-opacity"></div>
                    <div className="absolute inset-0 bg-red-500 opacity-[0.02] pointer-events-none"></div>

                    <div className="flex flex-col gap-1 pr-4 relative z-10">
                        <span className="text-[10px] font-syncopate font-bold uppercase tracking-widest text-[#ef4444] opacity-80">{node.title}</span>
                        <span className="text-[9px] font-mono opacity-40 uppercase tracking-[0.1em]">{node.description}</span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 relative z-10">
                        <div className="flex items-baseline gap-1 text-[#ef4444] opacity-90">
                            <span className="text-xl font-space font-black">{node.value}</span>
                            <span className="text-[10px] font-mono opacity-70 uppercase">{node.unit}</span>
                        </div>
                        <span className="text-[8px] font-mono uppercase tracking-[0.3em] font-bold opacity-40 mt-1">{node.status}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const HubNodeCard = ({ node, onClick }) => {
    const isUp = node.trendDir === 'up';
    const isDown = node.trendDir === 'down';
    const trendColorClass = isUp ? 'text-[#22c55e]' : isDown ? 'text-red-500' : 'text-current opacity-50';

    return (
        <button onClick={() => onClick(node)} className="w-full text-left relative glass-panel rounded-3xl p-5 mb-4 overflow-hidden transition-all hover:bg-current/5 block group" style={{ border: '1px solid var(--border-color)' }}>
            <div className="flex justify-between items-center relative z-10 w-full">
                {/* Left Side: Icon & Title */}
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl border opacity-80 group-hover:opacity-100 transition-opacity" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                        {getIconForId(node.id)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-syncopate font-black uppercase tracking-wider">{node.title}</span>
                        <span className="text-[8px] font-mono opacity-40 uppercase tracking-[0.2em] mt-0.5">{node.state}</span>
                    </div>
                </div>

                {/* Right Side: Score & Trend */}
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-space font-black opacity-90">{node.score}</span>
                        </div>
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-widest flex items-center gap-1 ${trendColorClass}`}>
                            {isUp ? <ArrowUpRight size={10} /> : isDown ? <ArrowDownRight size={10} /> : <Minus size={10} />}
                            {node.trend}
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
};

const Telemetry = ({ cfiScore = 0, theme, toggleTheme }) => {
    const [activeNode, setActiveNode] = useState(null);
    const [coreNodes, setCoreNodes] = useState([]);
    const [expansionNodes, setExpansionNodes] = useState([]);
    const [shadowMetrics, setShadowMetrics] = useState([]);
    const [globalStats, setGlobalStats] = useState({
        score: 84,
        trend: '+2.4%',
        trendDir: 'up',
        state: 'EM ASCENSÃO'
    });

    const [showAddForm, setShowAddForm] = useState(false);
    const [newMetric, setNewMetric] = useState({ title: '', value: 50, type: 'CORE_NODE' });
    const [userGoals, setUserGoals] = useState([]);
    const [lastWeekRadar, setLastWeekRadar] = useState(null);

    const handleAddMetric = async (e) => {
        e.preventDefault();
        if (!newMetric.title) return;
        await saveTelemetryMetric({
            title: newMetric.title,
            value: newMetric.value,
            unit: '%',
            status: 'ATIVO',
            type: newMetric.type,
            metadata: {
                subtitle: 'NÓDULO ADICIONAL',
                factors: { pos: ['Métrica personalizada'], crit: [] },
                history: [50, 50, 50, 50, 50, 50, 50],
                subMetrics: []
            }
        });
        setShowAddForm(false);
        setNewMetric({ title: '', value: 50, type: 'CORE_NODE' });
        fetchTelemetry(); // Re-fetch
    };

    const fetchTelemetry = async () => {
        // 1. Fetch trend from telemetry history
        let trend = '0%';
        let trendDir = 'neutral';
        try {
            const history = await getTelemetryHistory(14);
            if (history && history.length > 0) {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const weekAgoStr = toLocalDateStr(weekAgo);
                const oldScores = history.filter(h => h.recorded_date <= weekAgoStr).map(h => h.score);
                const newScores = history.filter(h => h.recorded_date > weekAgoStr).map(h => h.score);
                if (oldScores.length > 0 && newScores.length > 0) {
                    const oldAvg = oldScores.reduce((a, b) => a + b, 0) / oldScores.length;
                    const newAvg = newScores.reduce((a, b) => a + b, 0) / newScores.length;
                    const diff = oldAvg > 0 ? ((newAvg - oldAvg) / oldAvg * 100) : 0;
                    trend = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
                    trendDir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
                }
            }
        } catch (e) { /* telemetry_history may not exist */ }

        // 2. Fetch Metrics from telemetry_metrics
        const metrics = await getTelemetryMetrics();
        
        const cores = [];
        const expansions = [];
        const shadows = [];

        metrics.forEach(m => {
            const node = {
                id: m.id,
                title: m.title,
                score: m.value,
                unit: m.unit,
                trend: m.trend,
                trendDir: m.trend?.includes('+') ? 'up' : m.trend?.includes('-') ? 'down' : 'neutral',
                state: m.status,
                subtitle: m.metadata?.subtitle || '',
                factors: m.metadata?.factors || { pos: [], crit: [] },
                history: m.metadata?.history || [40, 60, 45, 70, 55, 80, 75],
                subMetrics: m.metadata?.subMetrics || []
            };

            if (m.type === 'CORE_NODE') cores.push(node);
            else if (m.type === 'EXPANSION_NODE') expansions.push(node);
            else if (m.type === 'SHADOW_METRIC') shadows.push({
                ...node,
                description: m.metadata?.description || '',
                value: m.value,
                status: m.status
            });
        });

        setCoreNodes(cores);
        setExpansionNodes(expansions);
        setShadowMetrics(shadows);

        // Calculate global score from loaded metrics
        const allScores = [...cores, ...expansions].map(n => Number(n.score)).filter(s => !isNaN(s) && s > 0);
        const avgScore = allScores.length > 0
            ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
            : 0;
        setGlobalStats({
            score: avgScore,
            trend,
            trendDir,
            state: trendDir === 'up' ? 'EM ASCENSÃO' : trendDir === 'down' ? 'EM QUEDA' : 'ESTÁVEL'
        });

        // 3. Fetch user goals for GoalProgress
        try {
            const goals = await getUserGoals();
            setUserGoals(goals);
        } catch (e) { /* goals table may not exist yet */ }

        // 4. Fetch telemetry history for radar last week comparison
        try {
            const history = await getTelemetryHistory(14);
            if (history && history.length > 0) {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const weekAgoStr = toLocalDateStr(weekAgo);
                const oldEntries = history.filter(h => h.recorded_date <= weekAgoStr);
                if (oldEntries.length > 0) {
                    const lastWeek = {};
                    oldEntries.forEach(h => {
                        if (!lastWeek[h.metric_key] || h.recorded_date > lastWeek[h.metric_key].date) {
                            lastWeek[h.metric_key] = { score: h.score, date: h.recorded_date };
                        }
                    });
                    setLastWeekRadar(Object.fromEntries(
                        Object.entries(lastWeek).map(([k, v]) => [k, v.score])
                    ));
                }
            }
        } catch (e) { /* telemetry_history may not exist yet */ }
    };

    useEffect(() => {
        fetchTelemetry();
    }, []);

    const allNodes = [...coreNodes, ...expansionNodes];
    const findScore = (id, fallback) => allNodes.find(n => n.id === id)?.score || fallback;

    // Renderização com sub-visão como overlay para preservar o scroll do hub
    return (
        <div className="relative w-full h-full">
            <ScrollContainer>
                <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />
                <div className={`transition-all duration-500 ${activeNode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="animate-in slide-in-from-left-4 duration-700 delay-100 pb-32 font-sans w-full relative" style={{ color: 'var(--text-main)' }}>
                        {/* Background Decorative Grid */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
                             style={{ backgroundImage: 'radial-gradient(var(--text-main) 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
                        />
                        
                        {/* Hub Header */}
                        <div className="mb-4 px-6 flex justify-between items-end pt-2">
                            <div>
                                <h2 className="text-[10px] font-mono opacity-30 tracking-[0.4em] uppercase mb-1">Navegação Sistêmica</h2>
                                <h1 className="text-2xl font-syncopate font-black tracking-widest uppercase opacity-90">HUB TELEMETRIA</h1>
                            </div>
                            <button 
                                onClick={() => setShowAddForm(true)}
                                className="p-2 rounded-xl border border-current/10 hover:bg-current/5 transition-colors"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        <AnimatePresence>
                            {showAddForm && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                    className="px-6 mb-12"
                                >
                                    <div className="glass-panel p-8 rounded-[40px] relative overflow-hidden group border border-current/10 shadow-2xl">
                                        <div className="absolute inset-0 bg-current opacity-[0.01] pointer-events-none"></div>
                                        
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-center mb-10">
                                                <div>
                                                    <h3 className="text-[12px] font-syncopate font-black uppercase tracking-[0.4em] mb-1 opacity-90">
                                                        Protocolo de Métrica
                                                    </h3>
                                                    <span className="text-[8px] font-mono uppercase tracking-[0.2em] opacity-40">Novo Identificador Sistêmico</span>
                                                </div>
                                                <div className="w-10 h-10 rounded-2xl border border-current/10 flex items-center justify-center opacity-40">
                                                    <Plus size={16} />
                                                </div>
                                            </div>

                                            <form onSubmit={handleAddMetric} className="flex flex-col gap-8">
                                                {/* Título */}
                                                <div className="flex flex-col gap-3">
                                                    <label className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-30 px-1 italic">› IDENTIFICADOR</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="EX: PERFORMANCE COGNITIVA"
                                                        className="bg-transparent border-b border-current/20 py-4 text-sm font-syncopate font-black uppercase focus:border-current transition-all outline-none placeholder:opacity-20 tracking-widest"
                                                        value={newMetric.title}
                                                        onChange={e => setNewMetric({...newMetric, title: e.target.value})}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 gap-10">
                                                    {/* Segmented Selector for Type */}
                                                    <div className="flex flex-col gap-4">
                                                        <label className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-30 px-1 italic">› CLASSIFICAÇÃO</label>
                                                        <div className="flex p-1.5 bg-current/[0.05] rounded-[24px] border border-current/10 gap-1">
                                                            {[
                                                                { id: 'CORE_NODE', label: 'NÚCLEO' },
                                                                { id: 'EXPANSION_NODE', label: 'EXPANSÃO' },
                                                                { id: 'SHADOW_METRIC', label: 'SOMBRA' }
                                                            ].map((opt) => (
                                                                <button
                                                                    key={opt.id}
                                                                    type="button"
                                                                    onClick={() => setNewMetric({...newMetric, type: opt.id})}
                                                                    className={`flex-1 py-3 text-[9px] font-mono font-bold rounded-[18px] transition-all duration-300 tracking-[0.15em] ${
                                                                        newMetric.type === opt.id 
                                                                        ? 'bg-[var(--text-main)] text-[var(--bg-color)] shadow-xl scale-[1.02]' 
                                                                        : 'opacity-40 hover:opacity-70 hover:bg-current/10 text-current'
                                                                    }`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Input de Score */}
                                                    <div className="flex flex-col gap-3">
                                                        <label className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-30 px-1 italic">› VETOR INICIAL (SCORE)</label>
                                                        <div className="relative flex items-center">
                                                            <input 
                                                                type="number" 
                                                                placeholder="00"
                                                                className="w-full bg-transparent border-b border-current/10 py-5 text-4xl font-outfit font-black tracking-tight focus:border-[var(--text-main)] transition-all outline-none"
                                                                value={newMetric.value}
                                                                onChange={e => setNewMetric({...newMetric, value: e.target.value})}
                                                                max="100"
                                                            />
                                                            <span className="absolute right-4 bottom-6 text-[11px] font-mono font-bold opacity-20 tracking-widest">/ 100</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Botões */}
                                                <div className="flex gap-4 mt-6 pt-6 border-t border-current/5">
                                                    <button 
                                                        type="submit" 
                                                        className="flex-[2] py-5 bg-[var(--text-main)] text-[var(--bg-color)] rounded-[22px] font-syncopate font-black text-[11px] uppercase tracking-[0.25em] shadow-2xl hover:brightness-110 active:scale-95 group relative overflow-hidden transition-all"
                                                    >
                                                        <span className="relative z-10">Inicializar Métrica</span>
                                                        <motion.div 
                                                            className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"
                                                            whileHover={{ x: ['100%', '-100%'] }}
                                                            transition={{ duration: 0.5, repeat: Infinity }}
                                                        />
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setShowAddForm(false)} 
                                                        className="flex-1 py-5 border border-current/10 rounded-[22px] font-mono font-black text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 hover:bg-current/5 transition-all"
                                                    >
                                                        Abortar
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="px-6 flex flex-col">
                            {/* Score Global Card */}
                            <ScrollReveal delay={0.1} className="w-full glass-panel p-8 rounded-[32px] mb-8 relative overflow-hidden transition-all hover:-translate-y-1 block" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-current opacity-[0.02] blur-[50px] rounded-full pointer-events-none"></div>
                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div>
                                        <h3 className="text-[10px] font-mono font-bold tracking-[0.5em] uppercase opacity-40 mb-2">Score Global</h3>
                                        <div className="flex items-baseline relative">
                                            <span className="text-7xl font-outfit font-black tracking-tighter opacity-90">{globalStats.score}</span>
                                            <span className="text-sm font-outfit opacity-30 ml-2">/100</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-[11px] font-mono font-bold tracking-[0.2em] mb-1 flex items-center gap-1.5 ${globalStats.trendDir === 'up' ? 'text-[#22c55e]' : globalStats.trendDir === 'down' ? 'text-red-500' : 'opacity-40'}`}>
                                            {globalStats.trendDir === 'up' ? <ArrowUpRight size={14} /> : globalStats.trendDir === 'down' ? <ArrowDownRight size={14} /> : <Minus size={14} />} {globalStats.trend}
                                        </span>
                                        <span className="text-[8px] font-mono tracking-[0.3em] uppercase opacity-40">Semana</span>
                                    </div>
                                </div>
                                <div className="w-full flex items-center gap-4 mb-6 relative z-10">
                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-current/10">
                                        <div className="h-full bg-current opacity-80 rounded-full" style={{ width: `${globalStats.score}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-syncopate font-black tracking-[0.2em] uppercase relative z-10 pt-4 border-t border-current/10">
                                    <span className="opacity-40">Status Operacional</span>
                                    <div className="flex items-center gap-3">
                                        <span className="opacity-90 tracking-widest">{globalStats.state}</span>
                                        <div className={`w-2 h-2 rounded-full animate-pulse shadow-lg ${globalStats.trendDir === 'up' ? 'bg-[#22c55e] shadow-[#22c55e]/50' : 'bg-red-500 shadow-red-500/50'}`}></div>
                                    </div>
                                </div>
                            </ScrollReveal>

                            <ScrollReveal delay={0.15} className="mb-12">
                                <div className="flex items-center gap-3 mb-6 opacity-40 pl-3 border-l-[3px] border-current">
                                    <Compass size={16} />
                                    <h2 className="text-[11px] font-syncopate font-bold uppercase tracking-widest">Mapa de Equilíbrio</h2>
                                </div>
                                <div className="glass-panel p-6 rounded-[32px] overflow-hidden">
                                    <RadarChart
                                        data={{
                                            BioFisico: findScore('BioFisico', 50),
                                            Cognitivo: findScore('Cognitivo', 50),
                                            Social: findScore('Social', 50),
                                            Espiritual: findScore('Espiritual', 50),
                                            Digital: findScore('Digital', 50)
                                        }}
                                        lastWeekData={lastWeekRadar || {
                                            BioFisico: findScore('BioFisico', 50) - 5,
                                            Cognitivo: findScore('Cognitivo', 50) - 5,
                                            Social: findScore('Social', 50) - 5,
                                            Espiritual: findScore('Espiritual', 50) - 5,
                                            Digital: findScore('Digital', 50) - 5
                                        }}
                                    />
                                </div>
                            </ScrollReveal>

                            {coreNodes.length > 0 && (
                                <ScrollReveal delay={0.2} className="mb-8">
                                    <div className="flex items-center gap-3 mb-6 opacity-40 pl-3 border-l-[3px] border-current">
                                        <Zap size={16} />
                                        <h2 className="text-[11px] font-syncopate font-bold uppercase tracking-widest">Nódulos Centrais</h2>
                                    </div>
                                    {coreNodes.filter(n => n.id !== 'Capital').map(node => (
                                        <HubNodeCard key={node.id} node={node} onClick={setActiveNode} />
                                    ))}
                                </ScrollReveal>
                            )}

                            {expansionNodes.length > 0 && (
                                <ScrollReveal delay={0.1} className="mb-8">
                                    <div className="flex items-center gap-3 mb-6 opacity-40 pl-3 border-l-[3px] border-current">
                                        <Target size={16} />
                                        <h2 className="text-[11px] font-syncopate font-bold uppercase tracking-widest">Nódulos de Expansão</h2>
                                    </div>
                                    {expansionNodes.filter(n => n.id !== 'Capital').map(node => (
                                        <HubNodeCard key={node.id} node={node} onClick={setActiveNode} />
                                    ))}
                                </ScrollReveal>
                            )}

                            {(coreNodes.length > 0 || expansionNodes.length > 0) && shadowMetrics.length > 0 && (
                                <div className="w-full h-px bg-current opacity-5 mb-10 mt-6 mx-auto rounded-full"></div>
                            )}

                            {shadowMetrics.length > 0 && (
                                <ScrollReveal delay={0.1} className="mb-12">
                                    <div className="flex items-center justify-between mb-6 pl-3 border-l-[3px] border-red-500 opacity-60">
                                        <div className="flex items-center gap-3 text-red-500">
                                            <ShieldAlert size={16} />
                                            <h2 className="text-[11px] font-syncopate font-bold uppercase tracking-widest">Métricas de Sombra</h2>
                                        </div>
                                        <span className="text-[8px] font-mono uppercase tracking-[0.2em] opacity-50">Regressores</span>
                                    </div>
                                    <ShadowCardList nodes={shadowMetrics} />
                                </ScrollReveal>
                            )}

                            <ScrollReveal delay={0.15} className="mb-20">
                                <div className="flex items-center gap-3 mb-6 opacity-40 pl-3 border-l-[3px] border-current">
                                    <Target size={16} />
                                    <h2 className="text-[11px] font-syncopate font-bold uppercase tracking-widest">Vetor de Progresso</h2>
                                </div>
                                <div className="flex flex-col gap-4">
                                    {userGoals.length > 0 ? userGoals.map(goal => (
                                        <GoalProgress
                                            key={goal.id}
                                            title={goal.title}
                                            progress={goal.progress || 0}
                                            deadline={goal.deadline ? new Date(goal.deadline).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase() : '---'}
                                            status={
                                                goal.status === 'completado' ? 'COMPLETADO' :
                                                goal.progress >= 70 ? 'NO CAMINHO' :
                                                goal.progress >= 40 ? 'EM RISCO' : 'ATRASADO'
                                            }
                                        />
                                    )) : (
                                        <>
                                            <GoalProgress title="Nenhuma meta definida" progress={0} deadline="---" status="ADICIONE METAS" />
                                        </>
                                    )}
                                </div>
                            </ScrollReveal>
                        </div>
                    </div>
                </div>
            </ScrollContainer>

            {/* Dashboard Ativo (Overlay) - Fora do ScrollContainer do Hub */}
            {activeNode && (
                <div className="fixed inset-0 z-50 bg-[var(--bg-color)] animate-in slide-in-from-right-8 duration-500 overflow-y-auto px-8 pt-12 pb-32">
                    <div className="w-full">
                        <ActiveNodeDashboard node={activeNode} onBack={() => setActiveNode(null)} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Telemetry;
