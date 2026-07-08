// =============================================================
// ORVAX · Life OS — Body Analysis (Tela 2)
// Radar + Treino 30d + Sono 30d + Heatmap + Nutrição donut
// =============================================================
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Dumbbell, Moon, Activity, Compass, Target, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { BodyData, BodyDiagnosis, BodyRadarAxis } from '../../data/bodyTypes';
import { BODY_ACCENT } from '../../data/bodyMockData';

const PAGE_BG = 'bg-zinc-50 dark:bg-zinc-950';
const CARD = 'rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800';
const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED = 'text-zinc-400 dark:text-zinc-500';

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

const HEAT_TONES = ['bg-zinc-200 dark:bg-zinc-800/60', 'bg-green-200 dark:bg-green-900', 'bg-green-400 dark:bg-green-700', 'bg-green-500', 'bg-green-600 dark:bg-green-400'];

interface Props { data: BodyData; diagnosis: BodyDiagnosis; onDepth: () => void; onBack: () => void; }

export function BodyAnalysis({ data, diagnosis, onDepth, onBack }: Props) {
  const { radar, workoutSeries30d, sleepSeries30d, heatmap90d, nutrition, workoutLog } = data;
  const ins = diagnosis.analysisInsights;
  const worstAx = useMemo(() => radar.reduce((w: BodyRadarAxis, ax: BodyRadarAxis) => (ax.current - ax.previous) < (w.current - w.previous) ? ax : w, radar[0]), [radar]);
  const sleepAvg = sleepSeries30d.length > 0 ? sleepSeries30d.reduce((s, p) => s + p.value, 0) / sleepSeries30d.length : 7;
  const sleepBad = sleepAvg < 7;

  return (
    <div className={`${PAGE_BG} min-h-screen w-full pb-12`}>
      <header className="px-5 pt-6 pb-2 flex items-center gap-3">
        <button type="button" onClick={onBack} className={`w-10 h-10 -ml-1 rounded-full flex items-center justify-center shrink-0 ${T_LABEL} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`} aria-label="Voltar"><ChevronLeft size={20} strokeWidth={2.2} /></button>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BODY_ACCENT }} />Corpo · Análise</p>
          <h1 className={`mt-1 text-[24px] font-bold leading-tight tracking-tight ${T_STRONG}`}>Análise profunda</h1>
        </div>
      </header>

      <div className="px-5 mt-4 space-y-3">
        {/* RADAR */}
        <motion.div custom={0} variants={blockReveal} initial="hidden" animate="show" className={`${CARD} p-5`}>
          <SmallHead title="Mapa corporal" sub="Força · resistência · sono · nutrição · recuperação" icon={<Compass size={11} style={{ color: BODY_ACCENT }} />} />
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
                <Radar name="atual" dataKey="current" stroke={BODY_ACCENT} strokeWidth={2} fill={BODY_ACCENT} fillOpacity={0.18} isAnimationActive animationDuration={1200} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <InsightBanner text={ins.radar} alert={worstAx.current - worstAx.previous < -5} />
        </motion.div>

        {/* TREINO 30D */}
        <motion.div custom={1} variants={blockReveal} initial="hidden" animate="show" className={`${CARD} p-5`}>
          <SmallHead title="Treinos · 30 dias" sub="Duração diária (min) + média 7d" icon={<Dumbbell size={11} style={{ color: BODY_ACCENT }} />} />
          <div className="h-[180px] mt-3 -mx-1">
            <ResponsiveContainer>
              <AreaChart data={workoutSeries30d} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="body-wrk-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BODY_ACCENT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={BODY_ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(113,113,122,0.12)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fontFamily: 'monospace', fill: '#71717a' }} axisLine={false} tickLine={false} interval={6} />
                <YAxis domain={[0, 'auto']} tick={{ fontSize: 8, fontFamily: 'monospace', fill: '#71717a' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#fafafa' }} />
                <Area type="monotone" dataKey="avg" stroke="rgba(113,113,122,0.4)" strokeDasharray="4 3" strokeWidth={1.2} fill="none" dot={false} isAnimationActive={false} />
                <Area type="natural" dataKey="value" stroke={BODY_ACCENT} strokeWidth={2.5} fill="url(#body-wrk-grad)" dot={false} activeDot={{ r: 4, fill: BODY_ACCENT, stroke: '#18181b', strokeWidth: 2 }} isAnimationActive animationDuration={1400} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <InsightBanner text={ins.workout} />
        </motion.div>

        {/* SONO 30D */}
        <motion.div custom={2} variants={blockReveal} initial="hidden" animate="show" className={sleepBad ? `rounded-2xl bg-white dark:bg-zinc-900 border-2 border-rose-300 dark:border-rose-900/50 p-5` : `${CARD} p-5`}>
          <SmallHead title="Sono · 30 dias" sub="Horas dormidas + média 7d" icon={<Moon size={11} style={{ color: sleepBad ? '#f43f5e' : BODY_ACCENT }} />} alert={sleepBad} />
          <div className="h-[180px] mt-3 -mx-1">
            <ResponsiveContainer>
              <AreaChart data={sleepSeries30d} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="body-slp-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sleepBad ? '#f43f5e' : '#8b5cf6'} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={sleepBad ? '#f43f5e' : '#8b5cf6'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(113,113,122,0.12)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fontFamily: 'monospace', fill: '#71717a' }} axisLine={false} tickLine={false} interval={6} />
                <YAxis domain={[4, 10]} tick={{ fontSize: 8, fontFamily: 'monospace', fill: '#71717a' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.96)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#fafafa' }} />
                <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="4 3" strokeWidth={1} strokeOpacity={0.5} label={{ value: '7h', position: 'right', fill: '#22c55e', fontSize: 9, fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="avg" stroke="rgba(113,113,122,0.4)" strokeDasharray="4 3" strokeWidth={1.2} fill="none" dot={false} isAnimationActive={false} />
                <Area type="natural" dataKey="value" stroke={sleepBad ? '#f43f5e' : '#8b5cf6'} strokeWidth={2.5} fill="url(#body-slp-grad)" dot={false} activeDot={{ r: 4, fill: sleepBad ? '#f43f5e' : '#8b5cf6', stroke: '#18181b', strokeWidth: 2 }} isAnimationActive animationDuration={1400} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <InsightBanner text={ins.sleep} alert={sleepBad} />
        </motion.div>

        {/* HEATMAP */}
        <motion.div custom={3} variants={blockReveal} initial="hidden" animate="show" className={`${CARD} p-5`}>
          <SmallHead title="Consistência · 90 dias" sub="Dias com treino" icon={<Activity size={11} style={{ color: BODY_ACCENT }} />} />
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
                    return <motion.div key={`${ci}-${ri}`} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (ci * 7 + ri) * 0.003, duration: 0.2 }} className={`w-2.5 h-2.5 rounded-sm transition-transform hover:scale-150 ${HEAT_TONES[cell.level]}`} title={`${cell.date} · nv ${cell.level}`} />;
                  })
                );
              })()}
            </div>
          </div>
          <InsightBanner text={ins.heatmap} />
        </motion.div>

        {/* NUTRIÇÃO DONUT */}
        <motion.div custom={4} variants={blockReveal} initial="hidden" animate="show" className={`${CARD} p-5`}>
          <SmallHead title="Macros · 7d" sub="Distribuição nutricional" icon={<Sparkles size={11} style={{ color: BODY_ACCENT }} />} />
          <div className="h-[160px] relative mt-2">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={nutrition} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={2} isAnimationActive animationDuration={1000} startAngle={90} endAngle={-270}>
                  {nutrition.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className={`text-[22px] font-mono font-bold tabular-nums leading-none ${T_STRONG}`}>100%</span>
              <span className={`text-[9px] font-mono tracking-widest uppercase ${T_MUTED} mt-0.5`}>macros</span>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {nutrition.map((d, i) => (<li key={i} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
              <span className={`flex-1 text-[11px] ${T_NORMAL} truncate`}>{d.label}</span>
              <span className={`text-[11px] font-mono tabular-nums font-bold ${T_LABEL}`}>{d.value}%</span>
            </li>))}
          </ul>
          <InsightBanner text={ins.nutrition} />
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
