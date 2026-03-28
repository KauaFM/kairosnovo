import { ChevronLeft, ArrowUpRight, ArrowDownRight, Minus, Activity, DollarSign, Clock, Zap, Target, Camera, Receipt, Plus, TrendingUp, TrendingDown, RefreshCw, AlertCircle, PlusCircle, Wallet, Target as TargetIcon, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import ScrollReveal from '../ScrollReveal';
import DigitalNodeView from '../nodes/DigitalNodeView';
import SocialNodeView from '../nodes/SocialNodeView';
import SkillsNodeView from '../nodes/SkillsNodeView';
import EspiritualNodeView from '../nodes/EspiritualNodeView';
import { useState, useEffect } from 'react';

export const CapitalView = ({ node, onBack }) => {
    const [status, setStatus] = useState('loading');
    const [activeFilter, setActiveFilter] = useState('MES');
    const [activeCategory, setActiveCategory] = useState('Todos');

    useEffect(() => {
        const timer = setTimeout(() => {
            setStatus('success');
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    const retry = () => {
        setStatus('loading');
        setTimeout(() => setStatus('success'), 1200);
    };

    const AnimatedNumber = ({ value, duration = 1500 }) => {
        const [count, setCount] = useState(0);

        useEffect(() => {
            let startTime;
            let animationFrame;

            const animate = (time) => {
                if (!startTime) startTime = time;
                const progress = time - startTime;
                const percentage = Math.min(progress / duration, 1);
                // cubic-bezier(0.16, 1, 0.3, 1) approximation
                const t = percentage;
                const easeOut = 1 - Math.pow(1 - t, 4);
                setCount(Math.floor(easeOut * value));
                if (percentage < 1) {
                    animationFrame = requestAnimationFrame(animate);
                }
            };
            animationFrame = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationFrame);
        }, [value, duration]);

        return <>{count}</>;
    };

    const chartMonths = ["Out", "Nov", "Dez", "Jan", "Fev", "Mar"];
    const categories = [
        { name: "Moradia", value: 2200, percent: 45, color: "hsl(225, 55%, 55%)" },
        { name: "Alimentacao", value: 890, percent: 18, color: "hsl(152, 68%, 38%)" },
        { name: "Assinaturas", value: 340, percent: 7, color: "hsl(262, 60%, 55%)" },
        { name: "Transporte", value: 280, percent: 6, color: "hsl(32, 90%, 50%)" },
        { name: "Lazer", value: 210, percent: 4, color: "hsl(345, 78%, 55%)" },
        { name: "Outros", value: 900, percent: 19, color: "hsl(215, 15%, 60%)" },
    ];
    const goals = [
        { name: "Reserva de Emergencia", current: 20100, target: 30000, progress: 67 },
        { name: "Investimentos Mensais", current: 3870, target: 9000, progress: 43 },
        { name: "Aporte Anual", current: 8400, target: 30000, progress: 28 }
    ];
    const transactions = [
        { name: "Salario", category: "Receita", date: "01 Mar", time: "08h00", value: 8500, type: "in", color: "#22c55e" },
        { name: "Aluguel", category: "Moradia", date: "05 Mar", time: "10h30", value: 2200, type: "out", color: "#ef4444" },
        { name: "Mercado", category: "Alimentacao", date: "08 Mar", time: "14h15", value: 890, type: "out", color: "#ef4444" },
        { name: "Netflix", category: "Assinatura", date: "10 Mar", time: "00h00", value: 55, type: "out", color: "#ef4444" },
        { name: "Freelance", category: "Receita", date: "15 Mar", time: "16h00", value: 700, type: "in", color: "#22c55e" }
    ];

    const SkeletonZone2 = () => (
        <div className="w-full flex-1 flex flex-col z-20 gap-[12px]">
            {[180, 200, 240, 260].map((h, i) => (
                <div key={i} className="w-full animate-pulse overflow-hidden"
                    style={{ borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--glass-bg)', padding: '18px 20px', boxShadow: 'var(--glass-shadow)' }}>
                    <div className="h-2 w-24 rounded mb-6" style={{ backgroundColor: 'var(--border-color)' }} />
                    <div style={{ height: `${h}px`, backgroundColor: 'var(--glass-bg)', borderRadius: '12px' }} className="w-full" />
                </div>
            ))}
        </div>
    );

    const NewCard = ({ label, children, rightEl, index = 0, hideHeader = false }) => (
        <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
            className="w-full relative overflow-hidden"
            style={{ borderRadius: '24px', border: '1px solid var(--border-color)', backgroundColor: 'var(--glass-bg)', padding: '16px 16px', marginBottom: '12px', boxShadow: 'var(--glass-shadow)' }}>
            {!hideHeader && (
                <div className="flex justify-between items-center" style={{ marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</span>
                    {rightEl}
                </div>
            )}
            {children}
        </motion.div>
    );

    if (status === 'error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center font-sans z-0 relative" style={{ backgroundColor: 'transparent' }}>
                <div className="absolute top-[-300px] left-0 w-full h-[300px]" style={{ backgroundColor: 'transparent', zIndex: -1 }}></div>
                <div className="p-4 rounded-full mb-6 relative z-10" style={{ backgroundColor: 'var(--destructive-bg)' }}>
                    <AlertCircle size={32} style={{ color: 'var(--destructive-color)' }} />
                </div>
                <h3 className="text-lg font-bold mb-2 relative z-10" style={{ color: 'var(--text-main)' }}>Nao foi possivel carregar seus dados financeiros</h3>
                <button onClick={retry} className="flex items-center gap-2 px-6 py-3 mt-4 rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform relative z-10" style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}>
                    <RefreshCw size={14} /> Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col pb-10 pt-4 relative font-sans overflow-x-hidden z-0" style={{ backgroundColor: 'transparent', color: 'var(--text-main)' }}>
            <div className="absolute top-[-300px] left-0 w-full h-[300px]" style={{ backgroundColor: 'transparent', zIndex: -1 }}></div>
            <div className="flex items-center justify-between mb-4 z-20 px-2">
                <button onClick={onBack} className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-current/5 border border-current/10 active:scale-95 transition-all">
                    <ChevronLeft size={14} style={{ color: 'var(--text-main)' }} />
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-main)' }}>Voltar</span>
                </button>
                <div className="flex items-center gap-1.5 opacity-40">
                    <DollarSign size={10} />
                    <span style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Sistema Financeiro</span>
                </div>
            </div>

            {status === 'loading' && <SkeletonZone2 />}

            {status === 'empty' && (
                <div className="w-full relative z-20 px-4 pt-16 flex flex-col items-center flex-1">
                    <div className="p-6 rounded-full mb-6" style={{ backgroundColor: 'var(--glass-bg)' }}>
                        <Wallet size={48} style={{ color: 'var(--text-dim)' }} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-center" style={{ color: 'var(--text-main)' }}>Nenhum dado financeiro registrado</h3>
                    <p className="text-sm mb-10 max-w-xs text-center" style={{ color: 'var(--text-dim)' }}>Comece adicionando sua primeira transacao.</p>
                    <button className="flex items-center gap-2 px-8 py-4 text-white rounded-full font-bold text-sm uppercase tracking-widest hover:scale-105 transition-transform" style={{ backgroundColor: 'var(--success-color)', boxShadow: '0 4px 14px var(--success-bg)' }}>
                        Configurar Capital
                    </button>
                </div>
            )}

            {status === 'success' && (
                <div className="w-full flex-1 flex flex-col z-10 pb-[40px] px-0 px-2 sm:px-4">
                    {/* BLOCK 1 - HERO CARD */}
                    <NewCard index={0} hideHeader={true}>
                        <div className="flex flex-col items-center pt-2">
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '8px' }}>SALDO LÍQUIDO</span>
                             <div className="flex items-baseline justify-center" style={{ marginBottom: '4px' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', marginRight: '4px' }}>R$</span>
                                <span style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1, letterSpacing: '-0.04em' }}>
                                    <AnimatedNumber value={12451} duration={1500} />
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mb-6">
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)' }}>CRESCENTE</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success-color)', display: 'flex', alignItems: 'center' }}>
                                    <ArrowUpRight size={14} style={{ marginRight: '2px' }} /> 2.4%
                                </span>
                            </div>

                            <div className="flex justify-between w-full gap-2 mt-2">
                                <div className="flex-1 flex flex-col items-center justify-center p-3" style={{ border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: 'var(--glass-bg)' }}>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>PATRIMONIO</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>R$ <AnimatedNumber value={12451} duration={900} /></span>
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center p-3" style={{ border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: 'var(--glass-bg)' }}>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>RECEITA</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success-color)' }}>R$ <AnimatedNumber value={9200} duration={900} /></span>
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center p-3" style={{ border: '1px solid var(--border-color)', borderRadius: '16px', backgroundColor: 'var(--glass-bg)' }}>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>DESPESA</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--destructive-color)' }}>R$ <AnimatedNumber value={4820} duration={900} /></span>
                                </div>
                            </div>
                        </div>
                    </NewCard>

                    {/* Card A - Patrimony Chart */}
                    <NewCard label="EVOLUCAO PATRIMONIAL" index={1}>
                        <div className="flex gap-[8px] w-full" style={{ marginBottom: '16px' }}>
                            {['SEM', 'MES', '3M', '6M', 'ANO'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f)}
                                    style={activeFilter === f ? {
                                        padding: '4px 14px',
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        borderRadius: '999px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        backgroundColor: 'var(--text-main)',
                                        color: 'var(--bg-color)',
                                        border: '1px solid transparent'
                                    } : {
                                        padding: '4px 14px',
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        borderRadius: '999px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        backgroundColor: 'transparent',
                                        color: 'var(--text-dim)',
                                        border: '1px solid transparent'
                                    }}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <div className="w-full relative group overflow-visible" style={{ height: '140px', borderRadius: '14px', marginTop: '10px' }}>
                            <div className="absolute top-[-25px] left-[75%]" style={{ transform: 'translateX(-50%)', zIndex: 10 }}>
                                <div className="flex flex-col items-center backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-color)', borderRadius: '16px', padding: '6px 14px', border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>12.451</span>
                                    <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginTop: '2px', textTransform: 'uppercase', fontWeight: 600 }}>15 Mar</span>
                                </div>
                            </div>
                            <div className="absolute left-[75%] w-px z-0" style={{ height: '140px', borderLeft: '1px dashed var(--success-bg)', top: '0' }} />

                            <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible relative z-0" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="chartGradientObj" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--success-color)" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="var(--success-color)" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <motion.path
                                    initial={{ strokeDashoffset: 200, strokeDasharray: 200 }}
                                    animate={{ strokeDashoffset: 0 }}
                                    transition={{ duration: 1.3, ease: "easeInOut" }}
                                    d="M 0,35 C 10,32 20,28 30,22 C 40,16 50,14 60,11 C 70,8 85,5 95,2"
                                    fill="none"
                                    stroke="var(--success-color)"
                                    strokeWidth="2.5"
                                    vectorEffect="non-scaling-stroke"
                                    strokeLinecap="round"
                                />
                                <motion.path
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 1.3, delay: 0.1, ease: "easeInOut" }}
                                    d="M 0,35 C 10,32 20,28 30,22 C 40,16 50,14 60,11 C 70,8 85,5 95,2 L 95,40 L 0,40 Z"
                                    fill="url(#chartGradientObj)"
                                />
                            </svg>
                        </div>
                        <div className="flex justify-between px-1" style={{ marginTop: '8px' }}>
                            {chartMonths.map((m, i) => (
                                <span key={i} style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--text-dim)', textAlign: 'center', flex: 1 }}>{m}</span>
                            ))}
                        </div>
                    </NewCard>

                    {/* Card B - Monthly Cash Flow */}
                    <NewCard label="FLUXO DO MES" index={2}>
                        <div className="flex flex-col gap-[14px]">
                            {/* Receita */}
                            <div className="w-full">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-[10px]">
                                        <div className="w-[28px] h-[28px] rounded-[10px] flex items-center justify-center" style={{ backgroundColor: 'var(--success-bg)' }}>
                                            <ArrowUpRight size={14} style={{ color: 'var(--success-color)' }} />
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Receita</span>
                                    </div>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--success-color)' }}>R$ 9.200</span>
                                </div>
                                <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
                                    <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.1, delay: 0.6, ease: "easeOut" }} className="h-full rounded-full" style={{ backgroundColor: 'var(--success-color)' }} />
                                </div>
                            </div>

                            {/* Despesa */}
                            <div className="w-full">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-center gap-[10px]">
                                        <div className="w-[28px] h-[28px] rounded-[10px] flex items-center justify-center" style={{ backgroundColor: 'var(--destructive-bg)' }}>
                                            <ArrowDownRight size={14} style={{ color: 'var(--destructive-color)' }} />
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Despesa</span>
                                    </div>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--destructive-color)' }}>R$ 4.820</span>
                                </div>
                                <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
                                    <motion.div initial={{ width: 0 }} animate={{ width: '52%' }} transition={{ duration: 1.1, delay: 0.6, ease: "easeOut" }} className="h-full rounded-full" style={{ backgroundColor: 'var(--destructive-color)' }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '18px 0' }} />

                        <div className="flex flex-col">
                            <span style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-dim)', marginBottom: '2px' }}>SALDO LIQUIDO</span>
                            <div className="flex items-end justify-between">
                                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>R$ 4.380</span>
                                <span style={{ fontSize: '0.65rem', fontStyle: 'italic', color: 'var(--text-dim)', marginBottom: '4px' }}>este mes</span>
                            </div>
                        </div>
                    </NewCard>

                    {/* Card C - Spending by Category */}
                    <NewCard label="GASTOS POR CATEGORIA" index={3}>
                        <div className="flex gap-[8px] pb-[12px] overflow-x-auto scrollbar-none -mx-[8px] px-[8px]" style={{ marginBottom: '14px' }}>
                            {['Todos', 'Moradia', 'Alimentacao', 'Assinaturas', 'Transporte', 'Lazer'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => setActiveCategory(c)}
                                    style={activeCategory === c ? {
                                        height: '32px',
                                        padding: '0 16px',
                                        borderRadius: '999px',
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.04em',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: 'var(--accent-primary)',
                                        color: 'var(--accent-secondary)',
                                        border: '1px solid transparent'
                                    } : {
                                        height: '32px',
                                        padding: '0 16px',
                                        borderRadius: '999px',
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.04em',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: 'transparent',
                                        color: 'var(--text-dim)',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-[14px]">
                            {categories.map((cat, idx) => (
                                <div key={idx} className="flex justify-between items-center w-full">
                                    <div className="flex items-center w-[35%] flex-shrink-0">
                                        <div style={{ width: '8px', height: '8px', borderRadius: '999px', backgroundColor: cat.color, marginRight: '10px', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                                    </div>
                                    <div className="flex-1 px-[10px]">
                                        <div className="w-full overflow-hidden flex items-center" style={{ height: '4px', borderRadius: '999px', backgroundColor: 'var(--border-color)' }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${cat.percent}%` }}
                                                transition={{ duration: 1.1, ease: "easeOut", delay: 0.7 }}
                                                style={{ height: '100%', borderRadius: '999px', backgroundColor: cat.color }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end items-center w-[25%] flex-shrink-0 gap-[6px]">
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{cat.value}</span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-dim)' }}>{cat.percent}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </NewCard>

                    {/* Card D - Financial Goals */}
                    <NewCard label="METAS FINANCEIRAS" index={4}>
                        <div className="flex flex-col gap-[20px] mb-[20px]">
                            {goals.map((goal, idx) => {
                                const isGreen = goal.progress >= 50;
                                const isAmber = goal.progress >= 25 && goal.progress < 50;
                                const barColor = isGreen ? 'var(--success-color)' : isAmber ? 'var(--warning-color)' : 'var(--destructive-color)';
                                const textColor = isGreen ? 'var(--success-color)' : isAmber ? 'var(--warning-color)' : 'var(--destructive-color)';

                                return (
                                    <div key={idx} className="flex flex-col gap-[8px]">
                                        <div className="flex justify-between items-center">
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{goal.name}</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: textColor }}>{goal.progress}%</span>
                                        </div>
                                        <div className="w-full overflow-hidden" style={{ height: '6px', borderRadius: '999px', backgroundColor: 'var(--border-color)' }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${goal.progress}%` }}
                                                transition={{ duration: 1.1, ease: "easeOut", delay: 0.6 }}
                                                style={{
                                                    height: '100%',
                                                    borderRadius: '999px',
                                                    backgroundColor: barColor
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-dim)' }}>R$ {goal.current.toLocaleString('pt-BR')}</span>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-dim)' }}>R$ {goal.target.toLocaleString('pt-BR')}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <button className="w-full flex items-center justify-center transition-colors hover:bg-[var(--glass-bg)]"
                            style={{ height: '44px', borderRadius: '16px', border: '1px dashed var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em' }}>
                            Adicionar Meta
                        </button>
                    </NewCard>

                    {/* Card E - Transactions */}
                    <NewCard label="TRANSACOES RECENTES" rightEl={<span style={{ fontSize: '0.6rem', color: 'var(--success-color)', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VER TODAS</span>} index={5}>
                        <div className="flex flex-col -mx-[16px]">
                            {transactions.map((tx, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between items-center px-[16px]"
                                    style={{
                                        minHeight: '52px',
                                        borderBottom: idx !== transactions.length - 1 ? '1px solid var(--border-color)' : 'none'
                                    }}
                                >
                                    <div className="flex items-center gap-[10px]">
                                        <div className="flex items-center justify-center flex-shrink-0" style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: tx.type === 'in' ? 'var(--success-bg)' : 'var(--destructive-bg)' }}>
                                            {tx.category === 'Moradia' ? <Activity size={14} color="var(--destructive-color)" /> :
                                                tx.category === 'Alimentacao' ? <DollarSign size={14} color="var(--destructive-color)" /> :
                                                    tx.category === 'Assinatura' ? <Activity size={14} color="var(--destructive-color)" /> :
                                                        <DollarSign size={14} color={tx.type === 'in' ? 'var(--success-color)' : 'var(--destructive-color)'} />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{tx.name}</span>
                                            <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>{tx.category}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: tx.type === 'in' ? 'var(--success-color)' : 'var(--destructive-color)' }}>
                                            {tx.type === 'in' ? '+' : '-'} R$ {tx.value}
                                        </span>
                                        <span style={{ fontSize: '0.55rem', fontWeight: 500, opacity: 0.4 }}>{tx.date}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </NewCard>

                    {/* Card F - Heatmap */}
                    <NewCard label="CONSISTENCIA DE APORTES" index={6}>
                        <span style={{ fontSize: '0.65rem', fontStyle: 'italic', fontWeight: 500, color: 'var(--text-dim)', marginBottom: '16px', display: 'block', marginTop: '-10px' }}>ultimos 30 dias</span>

                        <div className="flex justify-between mb-2">
                            {['Mon', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(d => (
                                <span key={d} style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-dim)', textAlign: 'center', width: '28px', marginBottom: '6px' }}>{d}</span>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 place-items-center" style={{ gap: '6px' }}>
                            {Array.from({ length: 35 }).map((_, idx) => {
                                const delayOffset = idx * 0.015;
                                const intensities = [0, 0, 0.25, 0.55, 1];
                                const intensity = intensities[Math.floor(Math.random() * intensities.length)];
                                const isGreen = intensity > 0;

                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.2, delay: 0.4 + delayOffset, ease: "easeOut" }}
                                        className="group relative"
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '6px',
                                            backgroundColor: isGreen ? `color-mix(in srgb, var(--success-color) ${intensity * 100}%, transparent)` : 'var(--border-color)',
                                        }}
                                    >
                                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-1 pointer-events-none">
                                            <div className="bg-gray-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
                                                {isGreen ? 'Aporte Registrado' : 'Sem Aporte'}
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>

                        <div className="flex items-center" style={{ marginTop: '16px', gap: '14px' }}>
                            <div className="flex items-center gap-[6px]">
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--border-color)' }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-dim)' }}>Sem registro</span>
                            </div>
                            <div className="flex items-center gap-[6px]">
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'color-mix(in srgb, var(--success-color) 25%, transparent)' }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-dim)' }}>Pequeno</span>
                            </div>
                            <div className="flex items-center gap-[6px]">
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'color-mix(in srgb, var(--success-color) 55%, transparent)' }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-dim)' }}>Medio</span>
                            </div>
                            <div className="flex items-center gap-[6px]">
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success-color)' }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-dim)' }}>Grande</span>
                            </div>
                        </div>
                    </NewCard>

                </div>
            )}
        </div>
    );
};

export const BioFisicoView = ({ node, onBack }) => {
    const deep = node?.deep || {};

    return (
        <div className="animate-in slide-in-from-right-8 duration-500 w-full pb-10 block font-sans" style={{ color: 'var(--text-main)' }}>

            <button onClick={onBack} className="flex items-center gap-2 mb-8 opacity-40 hover:opacity-100 transition-opacity">
                <ChevronLeft size={16} />
                <span className="text-[10px] font-syncopate font-bold uppercase tracking-widest">VOLTAR</span>
            </button>

            <div className="mb-10">
                <h2 className="text-[10px] font-mono opacity-40 tracking-[0.4em] uppercase mb-2">Node Expandido</h2>
                <h1 className="text-3xl font-syncopate font-black tracking-widest uppercase">{node.title}</h1>
            </div>

            {/* Main Biological Status */}
            <ScrollReveal delay={0.1} className="w-full glass-panel p-8 rounded-[32px] mb-6 block relative overflow-hidden" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}>
                <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Activity size={120} />
                </div>

                <div className="flex justify-between items-start mb-10 relative z-10">
                    <div>
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40 block mb-2">Score de Prontidão</span>
                        <div className="flex items-baseline">
                            <span className="text-7xl font-space font-black tracking-tighter opacity-90">{deep.energiaDiaria}</span>
                            <span className="text-xl font-space opacity-30 ml-2">/100</span>
                        </div>
                    </div>
                </div>

                {/* Submetrics grid */}
                <div className="grid grid-cols-2 gap-y-6  relative z-10 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <div>
                        <span className="text-[8px] font-mono tracking-[0.3em] uppercase opacity-30 block mb-1">Gordura Corporal</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-space font-bold opacity-80">{deep.gordura}</span>
                            <span className="text-xs font-mono opacity-50">%</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[8px] font-mono tracking-[0.3em] uppercase opacity-30 block mb-1">Peso Base</span>
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-2xl font-space font-bold opacity-80">{deep.peso}</span>
                            <span className="text-xs font-mono opacity-50">KG</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-[8px] font-mono tracking-[0.3em] uppercase opacity-30 block mb-1">VFC (HRV)</span>
                        <div className="flex items-baseline gap-1 text-[#22c55e]">
                            <span className="text-2xl font-space font-bold">{deep.hrv}</span>
                            <span className="text-xs font-mono opacity-50">ms</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[8px] font-mono tracking-[0.3em] uppercase opacity-30 block mb-1">Condição Atual</span>
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-sm font-space font-bold opacity-80 uppercase tracking-widest leading-tight">{deep.estadoCorp}</span>
                        </div>
                    </div>
                </div>
            </ScrollReveal>

            {/* GitHub-style matrix of training */}
            <ScrollReveal delay={0.2} className="w-full glass-panel p-6 rounded-[32px] mb-6 block relative overflow-hidden" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)', backgroundColor: 'var(--glass-bg)' }}>
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40 block mb-6">Matriz de Treino (30 Dias)</span>

                <div className="flex flex-wrap gap-2 w-full justify-center opacity-80">
                    {(deep.historicoTreinoMensal || []).map((treinou, idx) => (
                        <div key={idx} className={`w-4 h-4 rounded-sm border ${treinou ? 'bg-[#22c55e]/60 border-[#22c55e]' : 'bg-current/5 border-transparent'}`} style={{ borderColor: treinou ? '' : 'var(--border-color)' }}></div>
                    ))}
                </div>
            </ScrollReveal>

            {/* Recovery Metrics */}
            <ScrollReveal delay={0.3} className="w-full glass-panel p-6 rounded-[32px] mb-6 block relative overflow-hidden" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)', backgroundColor: 'var(--glass-bg)' }}>
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40 block mb-6">Recuperação Neural (Sono)</span>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center p-4 bg-current/5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
                        <span className="text-3xl font-space font-black mb-1 opacity-90">{deep.sonoHoras} <span className="text-xs opacity-40">h</span></span>
                        <span className="text-[8px] font-mono tracking-widest uppercase opacity-40 text-center">Tempo<br />Total</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-current/5 rounded-2xl border" style={{ borderColor: 'var(--border-color)' }}>
                        <span className="text-3xl font-space font-black mb-1 text-[#a855f7] drop-shadow-sm">{deep.sonoQualidade} <span className="text-xs opacity-40">/100</span></span>
                        <span className="text-[8px] font-mono tracking-widest uppercase opacity-40 text-center">Score<br />Noturno</span>
                    </div>
                </div>
            </ScrollReveal>
        </div>
    );
};

export const BaseNodeView = ({ node, onBack }) => {
    // A universal high-end fallback for Cognitivo, Frequencia, Dominio, Rede, Algoritmo, Upgrade.
    const isUp = node.trendDir === 'up';
    const isDown = node.trendDir === 'down';
    const trendColorClass = isUp ? 'text-[#22c55e]' : isDown ? 'text-red-500' : 'text-current opacity-50';

    return (
        <div className="animate-in slide-in-from-right-8 duration-500 w-full pb-10 block font-sans" style={{ color: 'var(--text-main)' }}>

            <button onClick={onBack} className="flex items-center gap-2 mb-8 opacity-40 hover:opacity-100 transition-opacity">
                <ChevronLeft size={16} />
                <span className="text-[10px] font-syncopate font-bold uppercase tracking-widest">VOLTAR</span>
            </button>

            <div className="mb-10">
                <h2 className="text-[10px] font-mono opacity-40 tracking-[0.4em] uppercase mb-2">Node Expandido</h2>
                <h1 className="text-3xl font-syncopate font-black tracking-widest uppercase">{node.title}</h1>
            </div>

            <ScrollReveal delay={0.1} className="w-full glass-panel p-8 rounded-[32px] mb-6 block relative overflow-hidden" style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)', backgroundColor: 'var(--glass-bg)' }}>
                {/* Header: Status */}
                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                        <span className="text-[9px] font-mono opacity-40 uppercase tracking-[0.2em]">{node.subtitle}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] opacity-60">{node.state}</span>
                    </div>
                </div>

                {/* Main Score & Trend */}
                <div className="flex justify-between items-end mb-8 relative z-10">
                    <div className="flex items-baseline gap-1">
                        <span className="text-7xl font-outfit font-black tracking-tighter opacity-90">{node.score}</span>
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
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 mb-8 pt-8 border-t relative z-10" style={{ borderColor: 'var(--border-color)' }}>
                    {node.subMetrics.map(sub => (
                        <div key={sub.label} className="flex flex-col">
                            <span className="text-[8px] font-mono uppercase tracking-[0.2em] opacity-30 mb-1.5">{sub.label}</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-space font-black opacity-80">{sub.value}</span>
                                <span className="text-[9px] font-mono opacity-40">{sub.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollReveal>

            {/* Factors */}
            <ScrollReveal delay={0.2} className="flex flex-col gap-6 p-6 rounded-[32px] border relative z-10" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', boxShadow: 'var(--glass-shadow)' }}>
                {/* Positives */}
                <div className="flex flex-col gap-3">
                    <span className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold text-[#22c55e] opacity-80 mb-2 border-b border-current/5 pb-2">Fatores Sistêmicos (+)</span>
                    {node.factors.pos.map(f => (
                        <div key={f} className="flex items-start gap-2">
                            <span className="text-xs opacity-50 text-[#22c55e]">›</span>
                            <span className="text-[10px] font-mono uppercase tracking-[0.15em] opacity-70 leading-tight mt-0.5">{f}</span>
                        </div>
                    ))}
                </div>

                {/* Negatives */}
                <div className="flex flex-col gap-3 mt-4">
                    <span className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold text-red-500 opacity-80 mb-2 border-b border-current/5 pb-2">Alertas de Regressão (-)</span>
                    {node.factors.crit.map(f => (
                        <div key={f} className="flex items-start gap-2">
                            <span className="text-xs opacity-50 text-red-500">›</span>
                            <span className="text-[10px] font-mono uppercase tracking-[0.15em] opacity-70 leading-tight mt-0.5">{f}</span>
                        </div>
                    ))}
                </div>
            </ScrollReveal>
        </div>
    );
};

export const ActiveNodeDashboard = ({ node, onBack }) => {
    switch (node.id) {
        case 'Capital': return <CapitalView node={node} onBack={onBack} />;
        case 'BioFisico': return <BioFisicoView node={node} onBack={onBack} />;
        case 'Digital': return <DigitalNodeView node={node} onBack={onBack} />;
        case 'Social': return <SocialNodeView node={node} onBack={onBack} />;
        case 'Skills': return <SkillsNodeView node={node} onBack={onBack} />;
        case 'Espiritual': return <EspiritualNodeView node={node} onBack={onBack} />;
        default: return <BaseNodeView node={node} onBack={onBack} />;
    }
}
