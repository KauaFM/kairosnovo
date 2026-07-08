// =============================================================
// ORVAX · Life OS — Universal Pillar Snapshot (Tela 1)
// =============================================================
import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { ChevronLeft, ArrowDownRight, ArrowUpRight, Minus, ChevronRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { AnimatedScore } from '../mind/AnimatedScore';
import type { PillarScoreData, PillarDiagnosis } from '../../data/pillarIntelTypes';
import type { PillarIntelConfig } from '../../data/pillarIntelConfig';

const PAGE_BG = 'bg-zinc-50 dark:bg-zinc-950';
const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_LABEL = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED = 'text-zinc-400 dark:text-zinc-500';
const CARD_HERO = 'rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.07] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)]';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.15 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } };
const tensionReveal = { hidden: { opacity: 0, y: 8, filter: 'blur(4px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.6, ease: 'easeOut', delay: 0.8 } } };
const storyReveal = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut', delay: 1.2 } } };

type IconKey = keyof typeof Icons;
function Icon({ name, ...props }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const Comp = (Icons[name as IconKey] as React.ComponentType<any>) || Icons.Circle;
  return <Comp {...props} />;
}

interface Props { data: PillarScoreData; diagnosis: PillarDiagnosis; config: PillarIntelConfig; onAnalyze: () => void; onBack: () => void; }

export function PillarSnapshot({ data, diagnosis, config, onAnalyze, onBack }: Props) {
  const { score, trend7d, sparkline7d } = data;
  const isNeg = trend7d < 0;
  const TrendIcon = isNeg ? ArrowDownRight : trend7d > 0 ? ArrowUpRight : Minus;
  const sparkData = sparkline7d.map((v, i) => ({ i, v }));
  const statusColor = diagnosis.status === 'critical' ? '#ef4444' : diagnosis.status === 'declining' ? '#eab308' : (diagnosis.status === 'excellent' || diagnosis.status === 'improving') ? '#22c55e' : '#71717a';
  const statusText = config.statusLabels[diagnosis.status] ?? diagnosis.status.toUpperCase();

  return (
    <div className={`${PAGE_BG} min-h-screen w-full pb-12`}>
      <header className="px-5 pt-6 pb-2 flex items-center gap-3">
        <button type="button" onClick={onBack} className={`w-10 h-10 -ml-1 rounded-full flex items-center justify-center shrink-0 ${T_LABEL} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`} aria-label="Voltar"><ChevronLeft size={20} strokeWidth={2.2} /></button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.accent}15` }}><Icon name={config.icon} size={16} style={{ color: config.accent }} /></div>
          <h1 className={`text-[18px] font-bold tracking-tight ${T_STRONG}`}>{config.label}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
          <span className={`text-[9px] font-mono tracking-[0.2em] uppercase ${T_MUTED}`}>{statusText}</span>
        </div>
      </header>

      <motion.section className="px-5 mt-4" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className={`${CARD_HERO} p-6 md:p-7`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL}`}>Score {config.label}</p>
              <div className="mt-3"><AnimatedScore value={score} className="text-[64px] md:text-[80px]" delay={200} /></div>
            </div>
            <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.3 }}
              className={['inline-flex items-center gap-1 px-3 h-8 rounded-full text-[12px] font-mono font-bold tabular-nums shrink-0 mt-2',
                isNeg ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                : trend7d > 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700',
              ].join(' ')}>
              <TrendIcon size={14} strokeWidth={2.2} />{trend7d > 0 ? '+' : ''}{trend7d}% 7d
            </motion.span>
          </div>
          <motion.div className="mt-5 h-12 -mx-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.5 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs><linearGradient id={`pillar-snap-${config.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={config.accent} stopOpacity={0.4} /><stop offset="100%" stopColor={config.accent} stopOpacity={0} /></linearGradient></defs>
                <Area type="natural" dataKey="v" stroke={config.accent} strokeWidth={2.5} fill={`url(#pillar-snap-${config.key})`} isAnimationActive animationDuration={1200} animationBegin={400} dot={false} activeDot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </motion.div>

        <motion.div variants={tensionReveal} className={`${CARD_HERO} p-5 mt-3`} style={{ borderLeft: `3px solid ${statusColor}` }}>
          <p className={`text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED} mb-2 flex items-center gap-1.5`}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />Diagnóstico</p>
          <p className={`text-[15px] leading-relaxed font-semibold ${T_STRONG}`}>{diagnosis.snapshotDiagnosis}</p>
        </motion.div>

        <motion.div variants={storyReveal} className="mt-4 px-1">
          <p className={`text-[20px] md:text-[24px] font-bold leading-snug tracking-tight ${T_STRONG}`}>
            {diagnosis.snapshotStory.split(' ').map((word, i) => {
              const isKw = ['queda', 'caindo', 'crítico', 'necessária'].some(kw => word.toLowerCase().includes(kw));
              return <span key={i} style={isKw ? { color: '#ef4444' } : undefined}>{word}{' '}</span>;
            })}
          </p>
        </motion.div>

        <motion.button type="button" onClick={onAnalyze} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.4 }}
          className="mt-6 w-full flex items-center justify-between gap-3 h-14 px-5 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border border-white/10 dark:border-zinc-200 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.99]">
          <span className="flex items-center gap-2"><Icon name={config.icon} size={18} /><span className="text-[13px] font-bold tracking-wide">Analisar em detalhes</span></span>
          <ChevronRight size={18} className="opacity-50" />
        </motion.button>
      </motion.section>
      <p className={`mt-8 px-5 text-center text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>· snapshot atualizado agora ·</p>
    </div>
  );
}
