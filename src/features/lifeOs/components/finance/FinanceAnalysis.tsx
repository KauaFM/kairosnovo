// =============================================================
// ORVAX · Life OS — Finance Analysis (Tela 2)
// Radar + Income/Expense + Categories + Heatmap + Patterns
// =============================================================
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Wallet, Compass, Target, Sparkles, TrendingUp, Activity, AlertTriangle, BarChart3 } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { FinanceIntelData, FinanceDiagnosis, FinanceRadarAxis } from '../../data/financeTypes';
import { FINANCE_ACCENT } from '../../data/financeMockData';

const PAGE_BG = 'bg-zinc-50 dark:bg-zinc-950';
const CARD = 'rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800';
const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED = 'text-zinc-400 dark:text-zinc-500';
const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const blockReveal = { hidden: { opacity: 0, y: 20 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' } }) };

function SmallHead({ title, sub, icon, alert }: { title: string; sub?: string; icon: React.ReactNode; alert?: boolean }) {
  return (<div>
    <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${alert ? 'text-rose-500 font-bold' : T_LABEL} flex items-center gap-1.5`}>{icon}{title}</p>
    {sub && <p className={`text-[9px] font-mono tracking-wider ${T_MUTED} mt-0.5`}>{sub}</p>}
  </div>);
}
function InsightBanner({ text, alert }: { text: string; alert?: boolean }) {
  return (<div className={['mt-3 px-3 py-2.5 rounded-xl text-[12px] leading-relaxed font-medium', alert ? `bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 ${T_STRONG}` : `bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 ${T_NORMAL}`].join(' ')}>
    {alert && <AlertTriangle size={12} className="inline mr-1.5 text-rose-500" />}{text}
  </div>);
}

const HEAT_TONES = ['bg-zinc-200 dark:bg-zinc-800/60', 'bg-amber-200 dark:bg-amber-900', 'bg-amber-400 dark:bg-amber-700', 'bg-amber-500', 'bg-amber-600 dark:bg-amber-400'];

interface Props { data: FinanceIntelData; diagnosis: FinanceDiagnosis; onDepth: () => void; onBack: () => void; }

export function FinanceAnalysis({ data, diagnosis, onDepth, onBack }: Props) {
  const { radar, incomeSeries30d, heatmap90d, categories } = data;
  const ins = diagnosis.analysisInsights;
  const worstAx = useMemo(() => radar.reduce((w: FinanceRadarAxis, ax: FinanceRadarAxis) => (ax.current - ax.previous) < (w.current - w.previous) ? ax : w, radar[0]), [radar]);
  const lowSavings = data.savingsRate < 0.2;

  return (
    <div className={`${PAGE_BG} min-h-screen w-full pb-12`}>
      <header className="px-5 pt-6 pb-2 flex items-center gap-3">
        <button type="button" onClick={onBack} className={`w-10 h-10 -ml-1 rounded-full flex items-center justify-center shrink-0 ${T_LABEL} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`} aria-label="Voltar"><ChevronLeft size={20} strokeWidth={2.2} /></button>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FINANCE_ACCENT }} />Financeiro · Análise</p>
          <h1 className={`mt-1 text-[24px] font-bold leading-tight tracking-tight ${T_STRONG}`}>Análise profunda</h1>
        </div>
      </header>

      <div className="px-5 mt-4 space-y-3">
        {/* RADAR */}
        <motion.div custom={0} variants={blockReveal} initial="hidden" animate="show" className={`${CARD} p-5`}>
          <SmallHead title="Mapa financeiro" sub="Poupança · controle · consistência · investimento · dívida" icon={<Compass size={11} style={{ color: FINANCE_ACCENT }} />} />
          <div className="h-[240px] mt-2">
            <ResponsiveContainer>
              <RadarChart data={radar.map(a => ({ axis: a.axis, current: a.current, previous: a.previous }))} outerRadius="72%">
                <PolarGrid stroke="rgba(113,113,122,0.15)" />
                <PolarAngleAxis dataKey="axis" tick={({ x, y, payload }: any) => {
                  const isWorst = payload.value === worstAx.axis;
                  return <text x={x} y={y} textAnchor="middle" fontSize={isWorst ? 11 : 9} fontFamily="ui-monospace, monospace" fill={isWorst ? '#ef4444' : '#71717a'} fontWeight={isWorst ? 700 : 400}>{payload.value}</text>;
                }} />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar name="anterior" dataKey="previous" stroke="rgba(113,113,122,0.4)" strokeDasharray="3 3" strokeWidth={1} fill="transparent" isAnimationActive={false} />
                <Radar name="atual" dataKey="current" stroke={FINANCE_ACCENT} strokeWidth={2} fill={FINANCE_ACCENT} fillOpacity={0.18} isAnimationActive animationDuration={1200} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <InsightBanner text={ins.radar} alert={worstAx.current - worstAx.previous < -3} />
        </motion.div>

        {/* INCOME vs EXPENSE */}
        <motion.div custom={1} variants={blockReveal} initial="hidden" animate="show" className={`${CARD} p-5`}>
          <SmallHead title="Receita vs Despesa · 30d" sub="Fluxo diário" icon={<TrendingUp size={11} style={{ color: FINANCE_ACCENT }} />} />
          <div className="h-[180px] mt-3 -mx-1">
            <ResponsiveContainer>
              <AreaChart data={incomeSeries30d} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="fin-inc-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={FINANCE_ACCENT} stopOpacity={0.3} /><stop offset="100%" stopColor={FINANCE_ACCENT} stopOpacity={0} /></linearGradient>
                  <linearGradient id="fin-exp-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(113,113,122,0.12)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fontFamily: 'monospace', fill: '#71717a' }} axisLine={false} tickLine={false} interval={6} />
                <YAxis tick={{ fontSize: 8, fontFamily: 'monospace', fill: '#71717a' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#fafafa' }} />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5} fill="url(#fin-exp-grad)" dot={false} isAnimationActive animationDuration={1200} />
                <Area type="natural" dataKey="income" stroke={FINANCE_ACCENT} strokeWidth={2.5} fill="url(#fin-inc-grad)" dot={false} activeDot={{ r: 4, fill: FINANCE_ACCENT, stroke: '#18181b', strokeWidth: 2 }} isAnimationActive animationDuration={1400} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-5 text-[9px] font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1.5 font-bold" style={{ color: FINANCE_ACCENT }}><span className="w-4 h-[2px] rounded-full" style={{ background: FINANCE_ACCENT }} /> receita</span>
            <span className="flex items-center gap-1.5 text-rose-500"><span className="w-4 border-t border-dashed border-rose-500" /> despesa</span>
          </div>
          <InsightBanner text={ins.income} />
        </motion.div>

        {/* CATEGORIES */}
        <motion.div custom={2} variants={blockReveal} initial="hidden" animate="show" className={`${CARD} p-5`}>
          <SmallHead title="Top Categorias" sub="Onde seu dinheiro vai" icon={<BarChart3 size={11} style={{ color: FINANCE_ACCENT }} />} />
          <ul className="mt-3 space-y-2">
            {categories.map((cat, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cat.color }} />
                <span className={`flex-1 text-[12px] font-medium ${T_STRONG} truncate`}>{cat.label}</span>
                <div className="w-24 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden shrink-0">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: cat.color }} initial={{ width: 0 }} animate={{ width: `${cat.pct}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }} />
                </div>
                <span className={`text-[11px] font-mono tabular-nums font-bold ${T_LABEL} w-14 text-right`}>{fmtBRL(cat.value)}</span>
              </li>
            ))}
          </ul>
          <InsightBanner text={ins.categories} />
        </motion.div>

        {/* HEATMAP */}
        <motion.div custom={3} variants={blockReveal} initial="hidden" animate="show" className={`${CARD} p-5`}>
          <SmallHead title="Consistência · 90 dias" sub="Dias com registro financeiro" icon={<Activity size={11} style={{ color: FINANCE_ACCENT }} />} />
          <div className="mt-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <div className="inline-grid grid-flow-col grid-rows-7 gap-[3px]">
              {(() => {
                const hm = heatmap90d;
                const first = new Date(hm[0]?.date || new Date());
                const pad = first.getDay();
                const padded: (typeof hm[0] | null)[] = [...Array(pad).fill(null), ...hm];
                const weeks: typeof padded[] = [];
                for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
                return weeks.flatMap((w, ci) =>
                  Array.from({ length: 7 }).map((_, ri) => {
                    const cell = w[ri];
                    if (!cell) return <div key={`${ci}-${ri}`} className="w-2.5 h-2.5" />;
                    return <motion.div key={`${ci}-${ri}`} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (ci * 7 + ri) * 0.003, duration: 0.2 }} className={`w-2.5 h-2.5 rounded-sm transition-transform hover:scale-150 ${HEAT_TONES[cell.level]}`} />;
                  })
                );
              })()}
            </div>
          </div>
          <InsightBanner text={ins.heatmap} />
        </motion.div>

        {/* PATTERNS */}
        <motion.div custom={4} variants={blockReveal} initial="hidden" animate="show" className={`${CARD} p-5`}>
          <SmallHead title="Padrões detectados" sub="Interpretação automática" icon={<Sparkles size={11} style={{ color: FINANCE_ACCENT }} />} />
          <ul className="mt-3 space-y-2">
            {data.aiPatterns.map((pattern, i) => (
              <li key={i} className={`flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 ${i === 0 ? 'ring-1 ring-amber-500/20' : ''}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${i === 0 ? 'text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}
                  style={i === 0 ? { backgroundColor: FINANCE_ACCENT } : undefined}>
                  <span className="text-[11px] font-mono font-bold">{i + 1}</span>
                </div>
                <p className={`text-[12px] leading-relaxed font-medium ${i === 0 ? T_STRONG : T_NORMAL}`}>{pattern}</p>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* CTA */}
        <motion.button type="button" onClick={onDepth} custom={5} variants={blockReveal} initial="hidden" animate="show"
          className="w-full flex items-center justify-between gap-3 h-14 px-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border border-white/10 dark:border-zinc-200 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.99]">
          <span className="flex items-center gap-2"><Target size={18} /><span className="text-[13px] font-bold tracking-wide">Ver análise profunda</span></span>
          <ChevronRight size={18} className="opacity-50" />
        </motion.button>
      </div>

      <p className={`mt-6 px-5 text-center text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>· análise gerada automaticamente ·</p>
    </div>
  );
}
