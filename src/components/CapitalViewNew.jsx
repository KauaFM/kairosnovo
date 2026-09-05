import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    TrendingUp, TrendingDown, Target, Plus, ChevronRight, ChevronLeft, Calendar, Search, 
    Filter, ArrowRight, ArrowUpRight, ArrowDownRight, MoreVertical, 
    PiggyBank, CreditCard, DollarSign, Wallet, ShoppingBag, Coffee, Home,
    Car, Zap, Utensils, Briefcase, Minus, ChevronDown, CheckCircle2, History,
    ShoppingCart, Tv, Smile, MoreHorizontal, Activity, Trash2, X, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTransactions, getGoals, createTransaction, createFinancialGoal, getMonthlyFinancialSummary, deleteTransaction, deleteFinancialGoal, updateFinancialGoalProgress } from '../services/db';
import { supabase } from '../lib/supabase';
import { isIncomeTx, isExpenseTx } from '../lib/txType';
import { alertDialog } from '../lib/dialog';

import { toLocalDateStr, monthLabelFromYYYYMM } from '../utils/dateUtils';
import { inferirCategoria, inferirValor } from '../utils/categoryInference';
import { useLang } from '../i18n/LanguageContext';
import { useCompassPillar } from '../features/metrics/compass/hooks/useCompassData';
import { PillarLayered } from '../features/metrics/compass/components/PillarLayered';

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

    const format = (v) => {
        return v.toLocaleString('pt-BR');
    };

    return <>{prefix}{format(val)}{suffix}</>;
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
    const [showDropdown, setShowDropdown] = useState(false);
    const svgRef = useRef(null);

    // Synchronize activeIdx if chartData length changes
    useEffect(() => {
        if (activeIdx >= chartData.length) {
            setActiveIdx(Math.max(0, chartData.length - 1));
        }
    }, [chartData.length, activeIdx]);

    // Dimensoes do grafico
    const W = 320, H = 120;
    const vals = chartData.map(d => d.value);
    const minV = Math.min(...vals) * 0.8;
    const maxV = Math.max(...vals) * 1.1;
    const range = maxV - minV;

    const toX = i => chartData.length > 1 ? (i / (chartData.length - 1)) * W : W / 2;
    const toY = v => range > 0 ? (1 - (v - minV) / range) * H : H / 2;

    const points = chartData.map((d, i) => ({ x: toX(i), y: toY(d.value) }));

    const buildPath = (pts) => pts.reduce((acc, p, i) => {
        if (i === 0) return `M ${p.x},${p.y}`;
        const prev = pts[i - 1];
        const cp1x = (prev.x + p.x) / 2;
        return `${acc} C ${cp1x},${prev.y} ${cp1x},${p.y} ${p.x},${p.y}`;
    }, '');

    const linePath = buildPath(points);
    const areaPath = `${linePath} L ${W},${H} L 0,${H} Z`;

    const safeIdx = Math.max(0, Math.min(activeIdx, chartData.length - 1));
    const ap = points[safeIdx] || { x: 0, y: 0 };
    const av = chartData[safeIdx]?.value || 0;

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
            <div className="flex items-center justify-between px-1 mb-4 z-30 relative">
                <span className="text-[12px] font-outfit font-medium" style={{ color: textColor, opacity: 0.6 }}>History</span>
                <div className="relative z-30">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all hover:opacity-80"
                         onClick={(e) => { e.stopPropagation(); setShowDropdown(!showDropdown); }}
                         style={{
                            backgroundColor: cardIsBlack ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                            borderColor: cardIsBlack ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                         }}>
                        <span className="text-[11px] font-outfit font-bold" style={{ color: textColor, opacity: 0.9 }}>{chartData[activeIdx]?.month || ''}</span>
                        <ChevronDown size={12} color={textColor} className="opacity-50" style={{ transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                    
                    <AnimatePresence>
                        {showDropdown && (
                            <motion.div 
                                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-[110%] p-1.5 rounded-[16px] shadow-2xl border overflow-hidden backdrop-blur-xl"
                                style={{
                                    backgroundColor: cardIsBlack ? 'rgba(15,15,15,0.9)' : 'rgba(255,255,255,0.9)',
                                    borderColor: cardIsBlack ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                                    minWidth: '110px'
                                }}
                            >
                                {chartData.map((d, index) => (
                                    <div 
                                        key={d.month}
                                        onClick={() => {
                                            setActiveIdx(index);
                                            setShowDropdown(false);
                                        }}
                                        className="px-3 py-2 rounded-xl text-[11px] font-outfit cursor-pointer flex justify-between items-center transition-all"
                                        style={{ 
                                            color: index === activeIdx ? '#22c55e' : textColor,
                                            fontWeight: index === activeIdx ? '800' : '500',
                                            backgroundColor: index === activeIdx ? (cardIsBlack ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)') : 'transparent'
                                        }}
                                    >
                                        {d.month}
                                        {index === activeIdx && <Check size={12} color="#22c55e" strokeWidth={3} />}
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
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
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'drop-shadow(0px 8px 10px rgba(34,197,94,0.35))' }}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1 }}
                    />

                    {/* Interactive Active Dot — Layered like image */}
                    <g>
                        {/* Outer glow aura */}
                        <circle cx={ap.x} cy={ap.y} r={16} fill="#22c55e" opacity="0.15" style={{ filter: 'blur(4px)' }} />
                        {/* The thick ring */}
                        <circle cx={ap.x} cy={ap.y} r={6} fill={dotInnerColor} stroke={cardIsBlack ? "white" : "#050507"} strokeWidth="2.5" />
                        {/* The centered green indicator */}
                        <circle cx={ap.x} cy={ap.y} r={2.5} fill="#22c55e" />
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

/* ─── Main Component ────────────────────────────────────── */
export default function CapitalViewNew({ onBack, theme }) {
    const { t: tr, lang } = useLang();
    const catL = (c) => { const k = 'capital.cats.' + c; const v = tr(k); return v === k ? c : v; };
    const isLight = theme === 'light';
    const [tab, setTab] = useState('overview');
    const [period, setPeriod] = useState('MES');
    const [transactions, setTransactions] = useState([]);
    const [goals, setGoals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState([]);

    // Compass Pillar Data
    const { data: pillarData } = useCompassPillar('finance');

    // Form State
    const [showAddForm, setShowAddForm] = useState(false);
    const [showGoalForm, setShowGoalForm] = useState(false);
    const [newGoal, setNewGoal] = useState({ name: '', target_amount: '', category: 'Outros' });
    // 'LAZER' (maiúsculo) não é nenhuma das 7 categorias reais — quem não
    // tocava no seletor salvava numa categoria fantasma, que aparecia como
    // uma fatia separada de 'Lazer' no gráfico. O padrão agora é válido.
    const [newTx, setNewTx] = useState({
        description: '',
        amount: '',
        type: 'out',
        category: 'Outros'
    });
    // A categoria atual veio de palpite do app (e não da escolha da pessoa)?
    // Enquanto for palpite, o app pode continuar corrigindo sozinho; assim
    // que ela toca num botão, a escolha dela manda e o app para de mexer.
    const [catSugerida, setCatSugerida] = useState(false);

    // Enquanto a pessoa digita, o app deduz a categoria: primeiro pelo que
    // ELA já classificou antes, depois por um dicionário de termos comuns.
    // Sem chamada de IA — é instantâneo e não custa nada.
    const handleDescricaoChange = (valor) => {
        const proximo = { ...newTx, description: valor };
        if (catSugerida || newTx.category === 'Outros') {
            const palpite = inferirCategoria(valor, transactions);
            if (palpite) {
                proximo.category = palpite;
                // "salário", "freela": além da categoria, é entrada de dinheiro
                if (palpite === 'Receita') proximo.type = 'in';
                setCatSugerida(true);
            }
        }
        setNewTx(proximo);
    };

    // Valor de despesa que se repete (Netflix, aluguel). Só vira DICA no
    // placeholder, nunca preenche sozinho: errar em silêncio num campo de
    // dinheiro cria lançamento errado que ninguém percebe.
    const valorRecorrente = inferirValor(newTx.description, transactions);

    const limparFormTx = () => {
        setNewTx({ description: '', amount: '', type: 'out', category: 'Outros' });
        setCatSugerida(false);
    };

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
            limparFormTx();
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
                name: g.title || g.name || tr('capital.newGoal'),
                current: g.current_amount || 0,
                target: g.target_amount,
                progress: Math.round(((g.current_amount || 0) / g.target_amount) * 100),
                color: CATEGORIES_COLORS[g.category] || CATEGORIES_COLORS['Outros'] || '#22c55e'
            })));
        } catch (err) {
            console.error('createGoal Error:', err);
            alertDialog({ message: tr('lo.dbErrGoal', { msg: err.message }), danger: true });
            // Local Presentation Fallback so the UI updates and feels responsive to the user
            setShowGoalForm(false);
            setGoals(prev => [...prev, {
                id: Math.random(),
                name: newGoal.name,
                current: 0,
                target: parseFloat(newGoal.target_amount),
                progress: 0,
                color: CATEGORIES_COLORS[newGoal.category] || '#22c55e'
            }]);
            setNewGoal({ name: '', target_amount: '', category: 'Outros' });
        }
    };

    const handleDeleteTransaction = async (id, e) => {
        if (e) e.stopPropagation();
        if (window.confirm(tr('capital.confirmDeleteTx'))) {
            try {
                await deleteTransaction(id);
                setTransactions(prev => prev.filter(t => t.id !== id));
            } catch (err) {
                console.error('Delete tx error:', err);
                // Fallback local se falhar por banco
                setTransactions(prev => prev.filter(t => t.id !== id));
            }
        }
    };

    const handleDeleteGoal = async (id, e) => {
        if (e) e.stopPropagation();
        if (window.confirm(tr('capital.confirmDeleteGoal'))) {
            try {
                await deleteFinancialGoal(id);
                setGoals(prev => prev.filter(g => g.id !== id));
            } catch (err) {
                console.error('Delete goal error:', err);
                // Fallback local se falhar por banco
                setGoals(prev => prev.filter(g => g.id !== id));
            }
        }
    };

    const handleAddFundsToGoal = async (id, currentProgress, target, e) => {
        if (e) e.stopPropagation();
        const amountStr = window.prompt(tr('capital.depositPrompt'));
        if (!amountStr) return;
        const amount = parseFloat(amountStr.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) return alertDialog({ message: tr('capital.invalidAmount'), danger: true });

        try {
            await updateFinancialGoalProgress(id, amount);
            // Update local state instantly
            setGoals(prev => prev.map(g => {
                if (g.id === id) {
                    const newCurrent = g.current + amount;
                    return {
                        ...g,
                        current: newCurrent,
                        progress: Math.min(100, Math.round((newCurrent / g.target) * 100))
                    };
                }
                return g;
            }));
        } catch (err) {
            console.error('Add funds error:', err);
            alertDialog({ message: tr('lo.dbErrFunds', { msg: err.message }), danger: true });
            // Local fallback
            setGoals(prev => prev.map(g => {
                if (g.id === id) {
                    const newCurrent = g.current + amount;
                    return {
                        ...g,
                        current: newCurrent,
                        progress: Math.min(100, Math.round((newCurrent / g.target) * 100))
                    };
                }
                return g;
            }));
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
                name: g.title || g.name || tr('capital.newGoal'),
                current: g.current_amount || 0,
                target: g.target_amount,
                progress: Math.round(((g.current_amount || 0) / g.target_amount) * 100),
                color: CATEGORIES_COLORS[g.category] || CATEGORIES_COLORS['Outros'] || '#22c55e'
            })));

            // Fetch monthly summary for charts
            const monthly = await getMonthlyFinancialSummary(6);
            if (monthly && monthly.length > 0) {
                // Antes: new Date(m.month + '-01') interpreta a string como
                // meia-noite UTC; em Brasília (UTC-3) isso cai no dia anterior,
                // e perto da virada do mês o gráfico mostrava o MÊS ERRADO
                // (ex.: agosto rotulado como julho). monthLabelFromYYYYMM lê o
                // número do mês direto da string, sem passar por Date nenhum.
                setMonthlyData(monthly.map(m => ({
                    month: monthLabelFromYYYYMM(m.month, lang),
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

    // Realtime sync — quando transações ou metas mudam em outra aba/dispositivo
    useEffect(() => {
        const ch = supabase
            .channel(`capital-sync-${Math.random().toString(36).slice(2, 8)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                fetchCapitalData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_goals' }, () => {
                fetchCapitalData();
            })
            .subscribe();
        return () => { ch.unsubscribe(); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const totals = useMemo(() => {
        const income = transactions.filter(isIncomeTx).reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const expense = transactions.filter(isExpenseTx).reduce((sum, t) => sum + Number(t.amount || 0), 0);
        return { income, expense, balance: income - expense };
    }, [transactions]);

    const categoriesAggregation = useMemo(() => {
        const outTxs = transactions.filter(isExpenseTx);
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

    const TABS = ['overview', 'gastos', 'metas', 'metricas'];

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
                    <span className="text-[9px] font-mono opacity-30 uppercase tracking-[0.35em]">{tr('capital.title')}</span>
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
                    {period === 'MES' ? tr('capital.balanceMonth') : tr('capital.balancePeriod', { period })}
                </p>
                <div className="flex items-baseline justify-center gap-1.5 px-4 overflow-hidden w-full">
                    <span className="text-[18px] md:text-[24px] font-outfit font-bold opacity-30 shrink-0">R$</span>
                    <span className="font-outfit font-black leading-none"
                        style={{ 
                            fontSize: 
                                String(totals.balance.toLocaleString('pt-BR')).length > 15 ? '24px' :
                                String(totals.balance.toLocaleString('pt-BR')).length > 12 ? '32px' :
                                String(totals.balance.toLocaleString('pt-BR')).length > 9 ? '42px' :
                                String(totals.balance.toLocaleString('pt-BR')).length > 6 ? '52px' : '62px',
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
            {/* ── Period Filter ── */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="mb-6 flex justify-center"
            >
                <div className="flex bg-zinc-100 dark:bg-black/40 p-1 rounded-2xl border border-zinc-200/50 dark:border-white/5 w-full max-w-[340px] shadow-inner">
                    {['SEM', 'MES', '3M', '6M', 'ANO'].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`flex-1 py-1.5 rounded-[12px] text-[9px] font-mono font-bold uppercase tracking-widest transition-all duration-300 ${period === p ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}
                        >
                            {tr('capital.period.' + p)}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* ── Sub-tabs ── */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="flex gap-2 mb-6 px-1.5"
            >
                {[tr('capital.tabOverview'), tr('capital.tabExpenses'), tr('capital.tabGoals'), tr('capital.tabMetrics')].map((t, i) => {
                    const key = TABS[i];
                    return (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex-1 py-2.5 rounded-2xl text-[9px] font-outfit uppercase tracking-widest font-bold transition-all duration-300 active:scale-95 ${tab === key ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/10' : 'bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800/80'}`}
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
                            <SLabel>{tr('capital.periodFlow')}</SLabel>
                            {[
                                { label: tr('capital.income'),  value: totals.income, total: totals.income || 1, color: '#22c55e', Icon: ArrowUpRight },
                                { label: tr('capital.expense'),  value: totals.expense, total: totals.income || 1, color: '#ef4444', Icon: ArrowDownRight },
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
                                <span className="text-[9px] font-mono opacity-35 uppercase tracking-widest">{tr('capital.netBalance')}</span>
                                <span className="text-[22px] font-syncopate font-black" style={{ letterSpacing: '-0.02em' }}>R$ {totals.balance.toLocaleString('pt-BR')}</span>
                            </div>
                        </Card>

                        {/* Transactions */}
                        <Card delay={0.1} style={{ padding: '18px' }}>
                             <div className="flex justify-between items-center mb-4">
                                <SLabel>{tr('capital.recentTx')}</SLabel>
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
                                    className="mb-8 p-5 rounded-[24px] border border-zinc-200/50 dark:border-white/5 bg-zinc-50 dark:bg-black/20 flex flex-col gap-4 shadow-sm"
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[8px] font-mono font-bold uppercase tracking-widest opacity-40 ml-1">{tr('capital.description')}</label>
                                        <input 
                                            type="text" 
                                            placeholder={tr('capital.descPh')}
                                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-[11px] font-mono uppercase focus:outline-none focus:border-[#22c55e] dark:focus:border-[#22c55e] transition-colors"
                                            value={newTx.description}
                                            onChange={e => handleDescricaoChange(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex flex-col gap-1.5 flex-1">
                                            <label className="text-[8px] font-mono font-bold uppercase tracking-widest opacity-40 ml-1">{tr('capital.amount')}</label>
                                            <input 
                                                type="number" 
                                                placeholder={valorRecorrente ? valorRecorrente.toFixed(2).replace('.', ',') : '0,00'}
                                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-[11px] font-mono font-bold focus:outline-none focus:border-[#22c55e] dark:focus:border-[#22c55e] transition-colors"
                                                value={newTx.amount}
                                                onChange={e => setNewTx({...newTx, amount: e.target.value})}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5 shrink-0 justify-end">
                                            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl h-[38px] border border-zinc-200 dark:border-zinc-800">
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => { e.preventDefault(); setNewTx({...newTx, type: 'out'}); }}
                                                    className={`px-3 flex items-center justify-center text-[9px] font-mono font-bold uppercase rounded-lg transition-all ${newTx.type === 'out' ? 'bg-[#ef4444] text-white shadow-sm' : 'text-zinc-500 opacity-60 hover:opacity-100'}`}
                                                >
                                                    Saída
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => { e.preventDefault(); setNewTx({...newTx, type: 'in'}); }}
                                                    className={`px-3 flex items-center justify-center text-[9px] font-mono font-bold uppercase rounded-lg transition-all ${newTx.type === 'in' ? 'bg-[#22c55e] text-black shadow-sm' : 'text-zinc-500 opacity-60 hover:opacity-100'}`}
                                                >
                                                    Entrada
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 mt-1">
                                        <div className="flex items-center gap-2 ml-1">
                                            <label className="text-[8px] font-mono font-bold uppercase tracking-widest opacity-40">{tr('capital.category')}</label>
                                            {/* Deixa claro que foi o app que escolheu — e que dá pra trocar */}
                                            {catSugerida && (
                                                <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-[#22c55e] opacity-90">
                                                    {tr('capital.autoSuggested')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.keys(CATEGORIES_ICONS).map(cat => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setNewTx({...newTx, category: cat}); setCatSugerida(false); }}
                                                    className={`px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${newTx.category === cat ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-md' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                                                >
                                                    {catL(cat)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-3 pt-4 border-t border-zinc-200/50 dark:border-white/5">
                                        <button 
                                            type="button"
                                            onClick={() => { setShowAddForm(false); limparFormTx(); }}
                                            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[10px] rounded-xl uppercase font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 py-2 bg-[#22c55e] border border-[#22c55e] text-black font-mono font-black tracking-widest text-[10px] rounded-xl uppercase hover:bg-[#1fb154] hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all active:scale-[0.98]"
                                        >
                                            Confirmar
                                        </button>
                                    </div>
                                </motion.form>
                            )}
                            <div className="flex flex-col">
                                {transactions.length === 0 ? (
                                    <div className="py-8 text-center opacity-30 text-[10px] font-mono uppercase tracking-widest">{tr('capital.noTxPeriod')}</div>
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
                                                    <span className="block text-[12px] font-mono font-bold truncate uppercase">{tx.description || tx.name || catL(tx.category)}</span>
                                                    <span className="block text-[9px] font-mono opacity-35 uppercase tracking-wider">{catL(tx.category)} · {new Date(tx.date || tx.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[13px] font-mono font-black" style={{ color: isIncomeTx(tx) ? '#22c55e' : '#ef4444' }}>
                                                        {isIncomeTx(tx) ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR')}
                                                    </span>
                                                    <button onClick={(e) => handleDeleteTransaction(tx.id, e)} className="p-1.5 opacity-30 hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title={tr('lo.deleteTx')}>
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
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
                            <SLabel>{tr('capital.expenseDist')}</SLabel>

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
                                <span className="text-[9px] font-mono opacity-35 uppercase tracking-widest">{tr('capital.totalExpenses')}</span>
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
                            <div className="py-20 text-center opacity-30 text-[10px] font-mono uppercase tracking-widest">{tr('capital.noActiveGoals')}</div>
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
                                            <span className="text-[8px] font-mono opacity-30 block uppercase tracking-widest mb-0.5">{tr('capital.reached')}</span>
                                            <span className="text-[13px] font-mono font-black" style={{ color: goal.color }}>
                                                R$ <AnimCounter to={goal.current} duration={1000} />
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] font-mono opacity-30 block uppercase tracking-widest mb-0.5">{tr('capital.goal')}</span>
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
                                        <div className="flex items-center gap-1 ml-1 shrink-0">
                                            <button onClick={(e) => handleAddFundsToGoal(goal.id, goal.progress, goal.target, e)} className="p-1.5 text-[#22c55e] bg-[#22c55e]/10 hover:bg-[#22c55e]/20 rounded-lg transition-all active:scale-95" title={tr('lo.deposit')}>
                                                <Plus size={11} strokeWidth={3.5} />
                                            </button>
                                            <button onClick={(e) => handleDeleteGoal(goal.id, e)} className="p-1.5 opacity-30 hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title={tr('lo.deleteGoal')}>
                                                <Trash2 size={11} />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}

                        {showGoalForm ? (
                            <motion.form
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                onSubmit={handleAddGoal}
                                className="mb-4 p-5 rounded-[24px] border border-zinc-200/50 dark:border-white/5 bg-zinc-50 dark:bg-black/20 flex flex-col gap-4 shadow-sm"
                            >
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[8px] font-mono font-bold uppercase tracking-widest opacity-40 ml-1">{tr('capital.goalName')}</label>
                                    <input
                                        type="text"
                                        placeholder={tr('capital.goalNamePh')}
                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-[11px] font-mono uppercase focus:outline-none focus:border-[#22c55e] dark:focus:border-[#22c55e] transition-colors"
                                        value={newGoal.name}
                                        onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[8px] font-mono font-bold uppercase tracking-widest opacity-40 ml-1">{tr('capital.targetAmount')}</label>
                                    <input
                                        type="number"
                                        placeholder="0,00"
                                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-[11px] font-mono font-bold focus:outline-none focus:border-[#22c55e] dark:focus:border-[#22c55e] transition-colors"
                                        value={newGoal.target_amount}
                                        onChange={e => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                                    />
                                </div>
                                <div className="flex flex-col gap-2 mt-1">
                                    <label className="text-[8px] font-mono font-bold uppercase tracking-widest opacity-40 ml-1">{tr('capital.relatedCategory')}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.keys(CATEGORIES_ICONS).map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); setNewGoal({ ...newGoal, category: cat }); }}
                                                className={`px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${newGoal.category === cat ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-md' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3 pt-4 border-t border-zinc-200/50 dark:border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setShowGoalForm(false)}
                                        className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[10px] rounded-xl uppercase font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 bg-[#22c55e] border border-[#22c55e] text-black font-mono font-black tracking-widest text-[10px] rounded-xl uppercase hover:bg-[#1fb154] hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all active:scale-[0.98]"
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </motion.form>
                        ) : (
                            <button
                                onClick={() => setShowGoalForm(true)}
                                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[9px] font-mono uppercase tracking-widest font-bold transition-all active:scale-95 hover:opacity-70"
                                style={{ border: '1px dashed var(--border-color)', opacity: 0.45 }}
                            >
                                <Plus size={13} /> {tr('capital.newFinancialGoal')}
                            </button>
                        )}
                    </motion.div>
                )}

                {/* ══ TAB: Métricas (Pilar) ═════════════════════════════════ */}
                {tab === 'metricas' && (
                    <motion.div key="metricas"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
                        className="flex flex-col"
                    >
                        {pillarData ? (
                            <PillarLayered data={pillarData} onBack={() => {}} hideNav={true} />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                <Activity className="animate-spin mb-4" />
                                <span className="text-[10px] font-mono tracking-widest uppercase">{tr('capital.extracting')}</span>
                            </div>
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
