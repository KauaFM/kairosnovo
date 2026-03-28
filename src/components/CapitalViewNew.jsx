import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    TrendingUp, TrendingDown, Target, Plus, ChevronRight, ChevronLeft, Calendar, Search, 
    Filter, ArrowRight, ArrowUpRight, ArrowDownRight, MoreVertical, 
    PiggyBank, CreditCard, DollarSign, Wallet, ShoppingBag, Coffee, Home,
    Car, Zap, Utensils, Briefcase, Minus, ChevronDown, CheckCircle2, History,
    ShoppingCart, Tv, Smile, MoreHorizontal, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTransactions, getGoals, createTransaction, createFinancialGoal, getMonthlyFinancialSummary } from '../services/db';
import { supabase } from '../lib/supabase';

import { toLocalDateStr } from '../utils/dateUtils';

const CATEGORIES_ICONS = {
    'Moradia': Home,
    'Alimentação': ShoppingCart,
    'Assinaturas': Tv,
    'Transporte': Car,
    'Lazer': Smile,
    'Receita': TrendingUp,
    'Outros': MoreHorizontal
};

const CATEGORIES_COLORS = {
    'Moradia': '#6366f1',
    'Alimentação': '#22c55e',
    'Assinaturas': '#a855f7',
    'Transporte': '#f97316',
    'Lazer': '#ec4899',
    'Receita': '#22c55e',
    'Outros': '#64748b'
};

/* ─── Animated Counter ─────────────────────────────────── */
function AnimCounter({ to, prefix = '', suffix = '', duration = 1400 }) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        let start; let raf;
        const step = (ts) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 4);
            setVal(Math.round(ease * to));
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [to, duration]);
    return <>{prefix}{val.toLocaleString('pt-BR')}{suffix}</>;
}

/* ─── Mini Sparkline SVG ────────────────────────────────── */
function Sparkline({ data, color = '#22c55e', height = 40 }) {
    const w = 100, h = height;
    const min = Math.min(...data), max = Math.max(...data);
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / (max - min)) * h * 0.85 - h * 0.075;
        return `${x},${y}`;
    }).join(' ');
    const areaPath = `M 0,${h} L ${pts.split(' ').map((p, i) => i === 0 ? `0,${p.split(',')[1]}` : p).join(' L ')} L ${w},${h} Z`;
    const linePath = `M ${pts.split(' ').join(' L ')}`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={height} style={{ overflow: 'visible' }}>
            <defs>
                <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <motion.path
                d={areaPath}
                fill={`url(#sg-${color.replace('#','')})`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
            />
            <motion.path
                d={linePath}
                fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                style={{ vectorEffect: 'non-scaling-stroke' }}
            />
        </svg>
    );
}

/* ─── Card ──────────────────────────────────────────────── */
const Card = ({ children, className = '', style = {}, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay, ease: 'easeOut' }}
        className={`relative overflow-hidden ${className}`}
        style={{
            borderRadius: '24px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--glass-bg)',
            ...style
        }}
    >
        {children}
    </motion.div>
);

/* ─── Section Label ─────────────────────────────────────── */
const SLabel = ({ children }) => (
    <span className="block text-[9px] font-mono uppercase tracking-[0.35em] opacity-35 mb-3">{children}</span>
);

/* ─── SparklineCard — réplica pixel-perfect da imagem de referência ─── */
const SPARK_DATA = [
    { month: 'Nov',   value: 4200 },
    { month: 'Dec',   value: 3100 },
    { month: 'Jan',   value: 2345 },
    { month: 'Feb',   value: 3800 },
    { month: 'Mar',   value: 2900 },
    { month: 'April', value: 4100 },
];
const SPARK_ACTIVE_IDX = 2; // Janeiro destacado como na imagem

function SparklineCard({ theme, dynamicData }) {
    const isLight = theme === 'light';
    const isInvertedMode = true; // Forcing the logic requested

    // Card colors based on inversion:
    // Light App Mode -> Black Card
    // Dark App Mode -> White Card
    const cardIsBlack = isLight; 
    
    const textColor = cardIsBlack ? 'white' : '#050507';
    const subTextColor = cardIsBlack ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)';
    const dotInnerColor = cardIsBlack ? '#050507' : '#ffffff';
    const activeMonthBg = cardIsBlack ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    const chartData = (dynamicData && dynamicData.length > 0) ? dynamicData : SPARK_DATA;
    const [activeIdx, setActiveIdx] = useState(Math.min(SPARK_ACTIVE_IDX, chartData.length - 1));
    const svgRef = useRef(null);

    // Dimensoes do grafico
    const W = 320, H = 120;
    const vals = chartData.map(d => d.value);
    const minV = Math.min(...vals) * 0.8;
    const maxV = Math.max(...vals) * 1.1;
    const range = maxV - minV;

    const toX = i => (i / (chartData.length - 1)) * W;
    const toY = v => (1 - (v - minV) / range) * H;

    const points = chartData.map((d, i) => ({ x: toX(i), y: toY(d.value) }));

    const buildPath = (pts) => pts.reduce((acc, p, i) => {
        if (i === 0) return `M ${p.x},${p.y}`;
        const prev = pts[i - 1];
        const cp1x = (prev.x + p.x) / 2;
        return `${acc} C ${cp1x},${prev.y} ${cp1x},${p.y} ${p.x},${p.y}`;
    }, '');

    const linePath = buildPath(points);
    const areaPath = `${linePath} L ${W},${H} L 0,${H} Z`;

    const ap = points[activeIdx];
    const av = chartData[activeIdx]?.value || 0;

    const handlePointer = (e) => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const ratio = (clientX - rect.left) / rect.width;
        const idx = Math.round(ratio * (chartData.length - 1));
        setActiveIdx(Math.max(0, Math.min(chartData.length - 1, idx)));
    };

    return (
        <div className="w-full select-none mt-2">
            {/* History Row */}
            <div className="flex items-center justify-between px-1 mb-4">
                <span className="text-[12px] font-outfit font-medium" style={{ color: textColor, opacity: 0.6 }}>History</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer"
                     style={{
                        backgroundColor: cardIsBlack ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        borderColor: cardIsBlack ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                     }}>
                    <span className="text-[11px] font-outfit font-medium" style={{ color: textColor, opacity: 0.8 }}>{chartData[activeIdx]?.month || ''}</span>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-50">
                        <path d="M2.5 4L5 6.5L7.5 4" stroke={textColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>

            {/* Chart Area */}
            <div className="relative" style={{ height: `${H}px` }}>
                {/* Floating Tooltip Pill */}
                <motion.div
                    key={activeIdx}
                    initial={{ opacity: 0, y: 5, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute z-20 pointer-events-none flex flex-col items-center"
                    style={{
                        left: `${(ap.x / W) * 100}%`,
                        top: `${((ap.y - 45) / H) * 100}%`,
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className="px-4 py-2 rounded-xl text-[13px] font-outfit font-bold text-white shadow-2xl"
                         style={{ backgroundColor: '#22c55e', boxShadow: '0 8px 32px rgba(34,197,94,0.6)' }}>
                        $ {av.toLocaleString('en-US')}
                    </div>
                    {/* SVG Arrow Part */}
                    <div className="w-0 h-0" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #22c55e', marginTop: '-1px' }} />
                </motion.div>

                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${W} ${H}`}
                    preserveAspectRatio="none"
                    width="100%"
                    height="100%"
                    className="overflow-visible"
                    onMouseMove={handlePointer}
                    onTouchMove={handlePointer}
                >
                    <defs>
                        <linearGradient id="hc-area-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Dotted Vertical Indicator */}
                    <line x1={ap.x} y1={ap.y + 10} x2={ap.x} y2={H} stroke="white" strokeOpacity="0.1" strokeDasharray="3 3" />

                    {/* Area Fill */}
                    <path d={areaPath} fill="url(#hc-area-grad)" />

                    {/* Main Curve Line */}
                    <motion.path
                        d={linePath}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1 }}
                    />

                    {/* Interactive Active Dot — Layered like image */}
                    <g>
                        {/* Outer glow ring */}
                        <circle cx={ap.x} cy={ap.y} r={12} fill={cardIsBlack ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"} />
                        {/* Ring color depends on card theme */}
                        <circle cx={ap.x} cy={ap.y} r={9} fill={cardIsBlack ? "white" : "#050507"} />
                        {/* Dark inner hole */}
                        <circle cx={ap.x} cy={ap.y} r={7} fill={dotInnerColor} />
                        {/* Green glowing center */}
                        <circle cx={ap.x} cy={ap.y} r={3} fill="#22c55e" style={{ filter: 'drop-shadow(0 0 5px #22c55e)' }} />
                    </g>
                </svg>
            </div>

            {/* Months Row */}
            <div className="flex justify-between mt-4 px-1">
                {chartData.map((d, i) => {
                    const isActive = activeIdx === i;
                    return (
                        <div key={d.month} className="flex flex-col items-center">
                            <span 
                                className={`text-[10px] font-outfit transition-all duration-300`}
                                onClick={() => setActiveIdx(i)}
                                style={{ 
                                    cursor: 'pointer',
                                    padding: '4px 10px',
                                    borderRadius: '999px',
                                    backgroundColor: isActive ? activeMonthBg : 'transparent',
                                    color: isActive ? '#22c55e' : subTextColor,
                                    fontWeight: isActive ? '700' : '500'
                                }}
                            >
                                {d.month}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ─── Bar Chart (Income vs Expense) ────────────────────── */

function BarChart() {
    const [tooltip, setTooltip] = useState(null); // { index, x, income, expense }
    const [animated, setAnimated] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 200);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="relative w-full select-none mt-4" ref={ref} style={{ height: '130px' }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-5 flex flex-col justify-between pointer-events-none" style={{ width: '28px' }}>
                {['$50k', '$25k', '$0k'].map(l => (
                    <span key={l} className="text-[7px] font-mono opacity-20 text-right pr-1">{l}</span>
                ))}
            </div>

            {/* Bars container */}
            <div className="absolute left-7 right-0 top-0 bottom-5 flex items-end justify-between gap-1">
                {BAR_DATA.map((d, i) => {
                    const incH = (d.income / MAX_VAL) * 100;
                    const expH = (d.expense / MAX_VAL) * 100;
                    const isHov = tooltip?.index === i;
                    return (
                        <div
                            key={d.month}
                            className="flex-1 flex flex-col justify-end items-center gap-[2px] cursor-pointer"
                            style={{ height: '100%' }}
                            onMouseEnter={() => setTooltip({ index: i, ...d })}
                            onMouseLeave={() => setTooltip(null)}
                            onTouchStart={() => setTooltip(t => t?.index === i ? null : { index: i, ...d })}
                        >
                            {/* Tooltip */}
                            {isHov && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className="absolute bottom-full mb-1 flex flex-col items-center pointer-events-none z-10"
                                    style={{ left: `${(i / (BAR_DATA.length - 1)) * 100}%`, transform: 'translateX(-50%)' }}
                                >
                                    <div className="px-2.5 py-1.5 rounded-xl text-[8px] font-mono font-bold text-white whitespace-nowrap"
                                        style={{ backgroundColor: '#22c55e', boxShadow: '0 4px 16px rgba(34,197,94,0.4)' }}>
                                        R$ {d.income.toLocaleString('pt-BR')}
                                    </div>
                                    <div className="w-0 h-0" style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #22c55e' }} />
                                </motion.div>
                            )}

                            {/* Income bar (green, taller) */}
                            <div className="relative flex gap-[2px] items-end" style={{ height: '100%', width: '100%' }}>
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: animated ? `${incH}%` : 0 }}
                                    transition={{ duration: 0.8, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                                    className="flex-1 rounded-t-[4px]"
                                    style={{
                                        backgroundColor: isHov ? '#22c55e' : 'rgba(34,197,94,0.55)',
                                        boxShadow: isHov ? '0 0 12px rgba(34,197,94,0.5)' : 'none',
                                        alignSelf: 'flex-end',
                                        transition: 'background-color 0.2s, box-shadow 0.2s',
                                    }}
                                />
                                {/* Expense bar (dim) */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: animated ? `${expH}%` : 0 }}
                                    transition={{ duration: 0.8, delay: i * 0.07 + 0.05, ease: [0.16, 1, 0.3, 1] }}
                                    className="flex-1 rounded-t-[4px]"
                                    style={{
                                        backgroundColor: isHov ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)',
                                        alignSelf: 'flex-end',
                                        transition: 'background-color 0.2s',
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* X-axis months */}
            <div className="absolute left-7 right-0 bottom-0 flex justify-between">
                {BAR_DATA.map((d, i) => (
                    <span key={d.month} className="flex-1 text-center text-[7px] font-mono uppercase"
                        style={{ opacity: tooltip?.index === i ? 0.8 : 0.28, transition: 'opacity 0.2s' }}>
                        {d.month}
                    </span>
                ))}
            </div>
        </div>
    );
}

/* ─── Main Component ────────────────────────────────────── */
export default function CapitalViewNew({ onBack, theme }) {
    const isLight = theme === 'light';
    const [tab, setTab] = useState('overview');
    const [period, setPeriod] = useState('MES');
    const [transactions, setTransactions] = useState([]);
    const [goals, setGoals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState([]);

    // Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [showGoalForm, setShowGoalForm] = useState(false);
    const [newGoal, setNewGoal] = useState({ name: '', target_amount: '', category: 'Outros' });
    const [newTx, setNewTx] = useState({
        description: '',
        amount: '',
        type: 'out',
        category: 'LAZER'
    });

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!newTx.description || !newTx.amount) return;

        const res = await createTransaction({
            description: newTx.description,
            amount: parseFloat(newTx.amount),
            type: newTx.type,
            category: newTx.category,
            date: toLocalDateStr()
        });

        if (res) {
            setShowAddForm(false);
            setNewTx({ description: '', amount: '', type: 'out', category: 'LAZER' });
            // Refresh
            const data = await getTransactions(period);
            setTransactions(data);
        }
    };

    const handleAddGoal = async (e) => {
        e.preventDefault();
        if (!newGoal.name || !newGoal.target_amount) return;
        try {
            await createFinancialGoal({
                name: newGoal.name,
                target_amount: parseFloat(newGoal.target_amount),
                category: newGoal.category,
            });
            setShowGoalForm(false);
            setNewGoal({ name: '', target_amount: '', category: 'Outros' });
            const gls = await getGoals();
            setGoals(gls.map(g => ({
                id: g.id,
                name: g.name,
                current: g.current_amount,
                target: g.target_amount,
                progress: Math.round((g.current_amount / g.target_amount) * 100),
                color: CATEGORIES_COLORS[g.category] || '#22c55e'
            })));
        } catch (err) {
            console.error('createGoal:', err);
        }
    };

    const fetchCapitalData = async () => {
        setIsLoading(true);
        try {
            const txs = await getTransactions(period);
            setTransactions(txs);

            const gls = await getGoals();
            setGoals(gls.map(g => ({
                id: g.id,
                name: g.name,
                current: g.current_amount,
                target: g.target_amount,
                progress: Math.round((g.current_amount / g.target_amount) * 100),
                color: CATEGORIES_COLORS[g.category] || '#22c55e'
            })));

            // Fetch monthly summary for charts
            const monthly = await getMonthlyFinancialSummary(6);
            if (monthly && monthly.length > 0) {
                setMonthlyData(monthly.map(m => ({
                    month: new Date(m.month + '-01').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
                    value: Math.abs(m.net)
                })));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCapitalData();
    }, [period]);

    const totals = useMemo(() => {
        const income = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
        return { income, expense, balance: income - expense };
    }, [transactions]);

    const categoriesAggregation = useMemo(() => {
        const outTxs = transactions.filter(t => t.type === 'out');
        const map = {};
        let totalVal = 0;
        outTxs.forEach(t => {
            const cat = t.category || 'Outros';
            map[cat] = (map[cat] || 0) + t.amount;
            totalVal += t.amount;
        });

        return Object.keys(map).map(name => ({
            name,
            value: map[name],
            percent: totalVal > 0 ? Math.round((map[name] / totalVal) * 100) : 0,
            color: CATEGORIES_COLORS[name] || '#64748b',
            icon: CATEGORIES_ICONS[name] || MoreHorizontal
        })).sort((a, b) => b.value - a.value);
    }, [transactions]);

    const TABS = ['overview', 'gastos', 'metas'];

    // Inversion Logic
    const cardIsBlack = isLight;
    const cardBg = cardIsBlack ? '#050507' : '#FFFFFF';
    const cardBorder = cardIsBlack ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const cardShadow = cardIsBlack ? 'none' : '0 25px 60px -12px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1)';
    const headlineColor = 'var(--text-main)';

    return (
        <div
            className="min-h-full flex flex-col font-sans pb-10 pt-3 relative overflow-x-hidden"
            style={{ color: 'var(--text-main)' }}
        >
            {/* ── Ambient glow ── */}
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[100vw] rounded-full opacity-[0.05] blur-[120px]"
                style={{ background: 'radial-gradient(circle, #22c55e, transparent 70%)' }} />

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-1 mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-mono uppercase tracking-widest font-bold opacity-60 hover:opacity-100 transition-opacity active:scale-95"
                    style={{ borderColor: 'var(--border-color)' }}
                >
                    <ChevronLeft size={12} /> Voltar
                </button>
                <div className="flex items-center gap-2">
                    {isLoading && <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping"></div>}
                    <span className="text-[9px] font-mono opacity-30 uppercase tracking-[0.35em]">Sistema Financeiro</span>
                </div>
            </div>

            {/* ── Hero Balance Header (Outside) ── */}
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-10 mt-2"
                style={{ color: headlineColor }}
            >
                <p className="text-center text-[12px] font-outfit font-semibold tracking-[0.15em] mb-2 uppercase opacity-40">
                    {period === 'MES' ? 'SALDO DO MÊS' : `SALDO (${period})`}
                </p>
                <div className="flex items-baseline justify-center gap-2">
                    <span className="text-[28px] font-outfit font-bold opacity-30">R$</span>
                    <span className="font-outfit font-black leading-none"
                        style={{ 
                            fontSize: '62px', 
                            letterSpacing: '-0.02em', 
                            textShadow: isLight ? '0 0 30px rgba(0,0,0,0.05)' : '0 0 40px rgba(34,197,94,0.1)' 
                        }}>
                        <AnimCounter to={totals.balance} duration={1200} />
                    </span>
                </div>
            </motion.div>

            {/* ── Hero Data Card (Chart Only - Inverted) ── */}
            <Card delay={0.1} style={{ 
                padding: '0', 
                marginBottom: '20px',
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                boxShadow: cardShadow,
                overflow: 'visible' // Allow tooltip to float out if needed
            }}>
                <div className="px-6 py-8 relative rounded-[24px] overflow-hidden">
                    {/* Interactive sparkline section */}
                    <SparklineCard theme={theme} dynamicData={monthlyData} />
                </div>
            </Card>


            {/* ── Period Filter ── */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="flex gap-2 mb-5 px-0.5"
            >
                {['SEM', 'MES', '3M', '6M', 'ANO'].map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className="flex-1 py-1.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-widest transition-all active:scale-95"
                        style={period === p
                            ? { backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }
                            : { border: '1px solid var(--border-color)', color: 'var(--text-main)', opacity: 0.4 }
                        }
                    >
                        {p}
                    </button>
                ))}
            </motion.div>

            {/* ── Sub-tabs ── */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="flex gap-1.5 mb-5 px-0.5"
            >
                {['Visão Geral', 'Gastos', 'Metas'].map((t, i) => {
                    const key = TABS[i];
                    return (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className="flex-1 py-2 rounded-2xl text-[9px] font-mono uppercase tracking-widest font-bold transition-all active:scale-95"
                            style={tab === key
                                ? { backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }
                                : { border: '1px solid var(--border-color)', opacity: 0.45 }
                            }
                        >
                            {t}
                        </button>
                    );
                })}
            </motion.div>

            <AnimatePresence mode="wait">
                {/* ══ TAB: Overview ══════════════════════════════════════ */}
                {tab === 'overview' && (
                    <motion.div key="overview"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                        className="flex flex-col gap-3"
                    >
                        {/* Cash Flow */}
                        <Card delay={0.05} style={{ padding: '18px' }}>
                            <SLabel>Fluxo do Período</SLabel>
                            {[
                                { label: 'Receita',  value: totals.income, total: totals.income || 1, color: '#22c55e', Icon: ArrowUpRight },
                                { label: 'Despesa',  value: totals.expense, total: totals.income || 1, color: '#ef4444', Icon: ArrowDownRight },
                            ].map(({ label, value, total, color, Icon }) => (
                                <div key={label} className="mb-4 last:mb-0">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                                                <Icon size={13} color={color} />
                                            </div>
                                            <span className="text-[12px] font-mono font-bold">{label}</span>
                                        </div>
                                        <span className="text-[13px] font-mono font-black" style={{ color }}>
                                            R$ {value.toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((value / total) * 100, 100)}%` }}
                                            transition={{ duration: 1.1, delay: 0.4, ease: 'easeOut' }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: color }}
                                        />
                                    </div>
                                </div>
                            ))}
                            <div className="mt-4 pt-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--border-color)' }}>
                                <span className="text-[9px] font-mono opacity-35 uppercase tracking-widest">Saldo Líquido</span>
                                <span className="text-[22px] font-syncopate font-black" style={{ letterSpacing: '-0.02em' }}>R$ {totals.balance.toLocaleString('pt-BR')}</span>
                            </div>
                        </Card>

                        {/* Transactions */}
                        <Card delay={0.1} style={{ padding: '18px' }}>
                             <div className="flex justify-between items-center mb-4">
                                <SLabel>Transações Recentes</SLabel>
                                <button 
                                    onClick={() => setShowAddForm(true)}
                                    className="p-1.5 rounded-lg border border-current/10 hover:bg-current/5 transition-colors"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>

                            {showAddForm && (
                                <motion.form 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    onSubmit={handleAddTransaction}
                                    className="mb-6 p-4 rounded-2xl border border-current/20 bg-current/5 flex flex-col gap-3"
                                >
                                    <input 
                                        type="text" 
                                        placeholder="Descrição"
                                        className="w-full bg-transparent border-b border-current/10 py-1 text-xs font-mono uppercase focus:outline-none"
                                        value={newTx.description}
                                        onChange={e => setNewTx({...newTx, description: e.target.value})}
                                    />
                                    <div className="flex gap-3">
                                        <input 
                                            type="number" 
                                            placeholder="Valor"
                                            className="flex-1 bg-transparent border-b border-current/10 py-1 text-xs font-mono uppercase focus:outline-none"
                                            value={newTx.amount}
                                            onChange={e => setNewTx({...newTx, amount: e.target.value})}
                                        />
                                        <select 
                                            className="bg-transparent border-b border-current/10 py-1 text-[10px] font-mono uppercase focus:outline-none"
                                            value={newTx.type}
                                            onChange={e => setNewTx({...newTx, type: e.target.value})}
                                        >
                                            <option value="out" className="bg-black">Saída (-)</option>
                                            <option value="in" className="bg-black">Entrada (+)</option>
                                        </select>
                                    </div>
                                    <select 
                                        className="w-full bg-transparent border-b border-current/10 py-1 text-[10px] font-mono uppercase focus:outline-none"
                                        value={newTx.category}
                                        onChange={e => setNewTx({...newTx, category: e.target.value})}
                                    >
                                        {Object.keys(CATEGORIES_ICONS).map(cat => (
                                            <option key={cat} value={cat} className="bg-black">{cat}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2 mt-2">
                                        <button 
                                            type="submit"
                                            className="flex-1 py-1.5 bg-[#22c55e] text-black font-mono font-bold text-[10px] rounded-lg uppercase"
                                        >
                                            Confirmar
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setShowAddForm(false)}
                                            className="px-3 py-1.5 border border-current/20 font-mono text-[10px] rounded-lg uppercase"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </motion.form>
                            )}
                            <div className="flex flex-col">
                                {transactions.length === 0 ? (
                                    <div className="py-8 text-center opacity-30 text-[10px] font-mono uppercase tracking-widest">Nenhuma transação no período</div>
                                ) : (
                                    transactions.map((tx, i) => {
                                        const Icon = CATEGORIES_ICONS[tx.category] || DollarSign;
                                        const color = CATEGORIES_COLORS[tx.category] || '#22c55e';
                                        return (
                                            <motion.div
                                                key={tx.id}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.12 + i * 0.06 }}
                                                className="flex items-center gap-3 py-3"
                                                style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                                            >
                                                <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}>
                                                    <Icon size={15} color={color} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="block text-[12px] font-mono font-bold truncate uppercase">{tx.description || tx.category}</span>
                                                    <span className="block text-[9px] font-mono opacity-35 uppercase tracking-wider">{tx.category} · {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
                                                </div>
                                                <span className="text-[13px] font-mono font-black shrink-0" style={{ color: tx.type === 'in' ? '#22c55e' : '#ef4444' }}>
                                                    {tx.type === 'in' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR')}
                                                </span>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* ══ TAB: Gastos ════════════════════════════════════════ */}
                {tab === 'gastos' && (
                    <motion.div key="gastos"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                        className="flex flex-col gap-3"
                    >
                        {/* Donut-like visual */}
                        <Card delay={0} style={{ padding: '18px' }}>
                            <SLabel>Distribuição de Gastos</SLabel>

                            {/* Visual bar stack */}
                            <div className="flex w-full h-2.5 rounded-full overflow-hidden gap-[2px] mb-5">
                                {categoriesAggregation.map((c, i) => (
                                    <motion.div
                                        key={c.name}
                                        initial={{ flex: 0 }}
                                        animate={{ flex: c.percent }}
                                        transition={{ duration: 1, delay: 0.3 + i * 0.05, ease: 'easeOut' }}
                                        style={{ backgroundColor: c.color, borderRadius: '999px' }}
                                    />
                                ))}
                            </div>

                            {/* Category list */}
                            <div className="flex flex-col gap-3">
                                {categoriesAggregation.map((cat, i) => {
                                    const Icon = cat.icon;
                                    return (
                                        <motion.div
                                            key={cat.name}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 + i * 0.07 }}
                                            className="flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}15` }}>
                                                <Icon size={14} color={cat.color} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[11px] font-mono font-bold truncate uppercase">{cat.name}</span>
                                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                                        <span className="text-[9px] font-mono opacity-40">{cat.percent}%</span>
                                                        <span className="text-[11px] font-mono font-black">R$ {cat.value.toLocaleString('pt-BR')}</span>
                                                    </div>
                                                </div>
                                                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${cat.percent}%` }}
                                                        transition={{ duration: 1, delay: 0.4 + i * 0.06, ease: 'easeOut' }}
                                                        style={{ height: '100%', borderRadius: '999px', backgroundColor: cat.color }}
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            <div className="mt-5 pt-4 flex justify-between" style={{ borderTop: '1px solid var(--border-color)' }}>
                                <span className="text-[9px] font-mono opacity-35 uppercase tracking-widest">Total de Gastos</span>
                                <span className="text-[14px] font-mono font-black" style={{ color: '#ef4444' }}>R$ {totals.expense.toLocaleString('pt-BR')}</span>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* ══ TAB: Metas ═════════════════════════════════════════ */}
                {tab === 'metas' && (
                    <motion.div key="metas"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                        className="flex flex-col gap-3"
                    >
                        {goals.length === 0 ? (
                            <div className="py-20 text-center opacity-30 text-[10px] font-mono uppercase tracking-widest">Sem metas ativas no momento</div>
                        ) : (
                            goals.map((goal, i) => (
                                <Card key={goal.name} delay={i * 0.08} style={{ padding: '18px' }}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1 pr-3 text-left">
                                            <span className="text-[9px] font-mono opacity-30 uppercase tracking-widest block mb-1">Meta {i + 1}</span>
                                            <span className="text-[13px] font-mono font-black leading-tight uppercase">{goal.name}</span>
                                        </div>
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                                            style={{ background: `conic-gradient(${goal.color} ${goal.progress * 3.6}deg, rgba(255,255,255,0.06) 0deg)`, borderRadius: '50%', padding: '3px' }}
                                        >
                                            <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
                                                <span className="text-[10px] font-mono font-black" style={{ color: goal.color }}>{goal.progress}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(goal.progress, 100)}%` }}
                                            transition={{ duration: 1.2, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
                                            className="h-full rounded-full relative overflow-hidden"
                                            style={{ backgroundColor: goal.color }}
                                        >
                                            {/* Shimmer */}
                                            <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', animation: 'shimmerMove 2s infinite' }} />
                                        </motion.div>
                                    </div>

                                    <div className="flex justify-between items-center text-left">
                                        <div>
                                            <span className="text-[8px] font-mono opacity-30 block uppercase tracking-widest mb-0.5">Atingido</span>
                                            <span className="text-[13px] font-mono font-black" style={{ color: goal.color }}>
                                                R$ <AnimCounter to={goal.current} duration={1000} />
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] font-mono opacity-30 block uppercase tracking-widest mb-0.5">Meta</span>
                                            <span className="text-[13px] font-mono font-black opacity-50">
                                                R$ {goal.target.toLocaleString('pt-BR')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                                            <div className="h-full rounded-full" style={{ width: `${Math.min(goal.progress, 100)}%`, backgroundColor: goal.color }} />
                                        </div>
                                        <span className="text-[8px] font-mono opacity-40 shrink-0 uppercase">
                                            Faltam R$ {Math.max(0, goal.target - goal.current).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                </Card>
                            ))
                        )}

                        {showGoalForm ? (
                            <motion.form
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                onSubmit={handleAddGoal}
                                className="p-4 rounded-2xl border border-current/20 bg-current/5 flex flex-col gap-3"
                            >
                                <input
                                    type="text"
                                    placeholder="Nome da meta (ex: Viagem)"
                                    className="w-full bg-transparent border-b border-current/10 py-1 text-xs font-mono uppercase focus:outline-none"
                                    value={newGoal.name}
                                    onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                                />
                                <input
                                    type="number"
                                    placeholder="Valor alvo (R$)"
                                    className="w-full bg-transparent border-b border-current/10 py-1 text-xs font-mono uppercase focus:outline-none"
                                    value={newGoal.target_amount}
                                    onChange={e => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                                />
                                <select
                                    className="w-full bg-transparent border-b border-current/10 py-1 text-[10px] font-mono uppercase focus:outline-none"
                                    value={newGoal.category}
                                    onChange={e => setNewGoal({ ...newGoal, category: e.target.value })}
                                >
                                    {Object.keys(CATEGORIES_ICONS).map(cat => (
                                        <option key={cat} value={cat} className="bg-black">{cat}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2 mt-1">
                                    <button
                                        type="submit"
                                        className="flex-1 py-1.5 bg-[#22c55e] text-black font-mono font-bold text-[10px] rounded-lg uppercase"
                                    >
                                        Confirmar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowGoalForm(false)}
                                        className="px-3 py-1.5 border border-current/20 font-mono text-[10px] rounded-lg uppercase"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </motion.form>
                        ) : (
                            <button
                                onClick={() => setShowGoalForm(true)}
                                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-mono uppercase tracking-widest font-bold transition-all active:scale-95 hover:opacity-70"
                                style={{ border: '1px dashed var(--border-color)', opacity: 0.45 }}
                            >
                                <Plus size={13} /> Nova Meta Financeira
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes shimmerMove {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </div>
    );
}
