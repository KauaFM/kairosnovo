import React, { useState, useEffect, useRef } from 'react';
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
import { useRealtimeSync } from '../hooks/useRealtimeSync';
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
        <div className="w-full relative rounded-[28px] border p-6 mb-4 overflow-hidden transition-all hover:scale-[1.005] block" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.015] pointer-events-none" style={{ backgroundColor: 'var(--text-main)', filter: 'blur(40px)' }}></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
                        <div className="opacity-40">{getIconForId(node.id)}</div>
                    </div>
                    <div>
                        <span className="text-[11px] font-outfit font-bold tracking-tight block">{node.title}</span>
                        <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.2em]">{node.subtitle}</span>
                    </div>
                </div>
                <span className="text-[7px] font-mono font-bold uppercase tracking-[0.2em] opacity-25 mt-1">{node.state}</span>
            </div>

            <div className="flex justify-between items-end mb-6 relative z-10">
                <div className="flex items-baseline gap-1">
                    <span className="text-[48px] font-outfit font-black leading-none opacity-85">{node.score}</span>
                    <span className="text-[13px] font-outfit opacity-15">/100</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 mb-2 ${trendColorClass}`}>
                        {isUp ? <ArrowUpRight size={12} /> : isDown ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                        {node.trend}
                    </span>
                    <div className="flex items-end gap-[3px] h-7 opacity-25">
                        {node.history.map((h, i) => (
                            <div key={i} className="w-2 rounded-t-sm bg-current transition-all" style={{ height: `${h}%` }}></div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-6 pt-5 relative z-10" style={{ borderTop: '1px solid var(--border-color)' }}>
                {node.subMetrics.map(sub => (
                    <div key={sub.label} className="flex flex-col">
                        <span className="text-[7px] font-mono uppercase tracking-[0.2em] opacity-20 mb-1">{sub.label}</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[18px] font-outfit font-bold opacity-70">{sub.value}</span>
                            <span className="text-[8px] font-mono opacity-25">{sub.unit}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-4 px-4 py-4 rounded-[20px] border relative z-10" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
                <div className="flex flex-col gap-2">
                    <span className="text-[7px] font-mono uppercase tracking-[0.25em] font-bold text-[#22c55e] opacity-60">Fatores Positivos</span>
                    {node.factors.pos.map(f => (
                        <div key={f} className="flex items-start gap-2">
                            <span className="text-[9px] opacity-30 text-[#22c55e] mt-0.5">+</span>
                            <span className="text-[8px] font-mono opacity-35 leading-relaxed tracking-wider">{f}</span>
                        </div>
                    ))}
                </div>
                <div className="h-px w-full opacity-5" style={{ backgroundColor: 'var(--text-main)' }}></div>
                <div className="flex flex-col gap-2">
                    <span className="text-[7px] font-mono uppercase tracking-[0.25em] font-bold text-red-500 opacity-60">Atencao Critica</span>
                    {node.factors.crit.map(f => (
                        <div key={f} className="flex items-start gap-2">
                            <span className="text-[9px] opacity-30 text-red-500 mt-0.5">-</span>
                            <span className="text-[8px] font-mono opacity-35 leading-relaxed tracking-wider">{f}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ShadowCardList = ({ nodes }) => {
    return (
        <div className="flex flex-col gap-2">
            {nodes.map(node => (
                <div key={node.id} className="w-full p-4 rounded-[24px] border flex justify-between items-center relative overflow-hidden group transition-all hover:scale-[1.01]" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.3), transparent 50%)' }}></div>

                    <div className="flex flex-col gap-0.5 pr-4 relative z-10">
                        <span className="text-[10px] font-outfit font-bold text-[#ef4444] opacity-70">{node.title}</span>
                        <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.15em]">{node.description}</span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 relative z-10">
                        <div className="flex items-baseline gap-1 text-[#ef4444] opacity-80">
                            <span className="text-[18px] font-outfit font-black">{node.value}</span>
                            <span className="text-[8px] font-mono opacity-50">{node.unit}</span>
                        </div>
                        <span className="text-[7px] font-mono uppercase tracking-[0.2em] font-bold opacity-25 mt-0.5">{node.status}</span>
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
        <button onClick={() => onClick(node)} className="w-full text-left relative rounded-[24px] border p-4 mb-2 overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] block group" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
            <div className="flex justify-between items-center relative z-10 w-full">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl border flex items-center justify-center opacity-40 group-hover:opacity-70 transition-opacity" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                        {getIconForId(node.id)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-outfit font-bold tracking-tight">{node.title}</span>
                        <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.2em] mt-0.5">{node.state}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-[22px] font-outfit font-black leading-none opacity-80">{node.score}</span>
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5 ${trendColorClass}`}>
                            {isUp ? <ArrowUpRight size={10} /> : isDown ? <ArrowDownRight size={10} /> : <Minus size={10} />}
                            {node.trend}
                        </span>
                    </div>
                    <ChevronRight size={14} className="opacity-10 group-hover:opacity-30 transition-opacity" />
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
    // [ORVAX CORE] Sem fallbacks fakes: partimos de 0 e substituímos
    // com os valores reais quando fetchTelemetry termina. Se o usuário
    // não registrou nada ainda, o score fica 0 e a UI mostra estado vazio.
    const [globalStats, setGlobalStats] = useState({
        score: 0,
        trend: '0%',
        trendDir: 'neutral',
        state: 'SEM DADOS'
    });

    const [showAddForm, setShowAddForm] = useState(false);
    const [newMetric, setNewMetric] = useState({ title: '', value: 50, type: 'CORE_NODE' });
    const [userGoals, setUserGoals] = useState([]);
    const [lastWeekRadar, setLastWeekRadar] = useState(null);

    const unsubscribeRef = useRef([]);
    const { subscribeToDailyActivity } = useRealtimeSync();

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

        // Set up real-time listeners for daily_activity changes
        const unsubscribeDailyActivity = subscribeToDailyActivity(() => {
            fetchTelemetry();
        });

        if (unsubscribeDailyActivity) {
            unsubscribeRef.current.push(unsubscribeDailyActivity);
        }

        // Cleanup function - unsubscribe from all listeners
        return () => {
            unsubscribeRef.current.forEach(unsubscribe => unsubscribe?.());
            unsubscribeRef.current = [];
        };
    }, [subscribeToDailyActivity]);

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

                        <div className="px-5 flex flex-col pt-6">
                            <ScrollReveal delay={0.15} className="mb-8">
                                <div className="flex items-center gap-2 mb-4 px-1">
                                    <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-20 font-bold">mapa de equilibrio</span>
                                </div>
                                <div className="rounded-[28px] border p-5 overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
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
                                <ScrollReveal delay={0.2} className="mb-6">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-20 font-bold">nodulos centrais</span>
                                        <span className="text-[8px] font-mono opacity-10">{coreNodes.filter(n => n.id !== 'Capital').length}</span>
                                    </div>
                                    {coreNodes.filter(n => n.id !== 'Capital').map(node => (
                                        <HubNodeCard key={node.id} node={node} onClick={setActiveNode} />
                                    ))}
                                </ScrollReveal>
                            )}

                            {expansionNodes.length > 0 && (
                                <ScrollReveal delay={0.1} className="mb-6">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-20 font-bold">nodulos de expansao</span>
                                        <span className="text-[8px] font-mono opacity-10">{expansionNodes.filter(n => n.id !== 'Capital').length}</span>
                                    </div>
                                    {expansionNodes.filter(n => n.id !== 'Capital').map(node => (
                                        <HubNodeCard key={node.id} node={node} onClick={setActiveNode} />
                                    ))}
                                </ScrollReveal>
                            )}

                            {(coreNodes.length > 0 || expansionNodes.length > 0) && shadowMetrics.length > 0 && (
                                <div className="w-full h-px opacity-5 mb-6 mt-2" style={{ backgroundColor: 'var(--text-main)' }}></div>
                            )}

                            {shadowMetrics.length > 0 && (
                                <ScrollReveal delay={0.1} className="mb-8">
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.4)' }}></div>
                                            <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-30 font-bold text-red-400">metricas de sombra</span>
                                        </div>
                                        <span className="text-[7px] font-mono uppercase tracking-[0.2em] opacity-15">{shadowMetrics.length}</span>
                                    </div>
                                    <ShadowCardList nodes={shadowMetrics} />
                                </ScrollReveal>
                            )}

                            <ScrollReveal delay={0.15} className="mb-20">
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-20 font-bold">vetor de progresso</span>
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
