// =============================================================
// ORVAX · Life OS — Body Depth (Tela 3)
// Prioridade + correlações + timeline + previsão + ações
// =============================================================
import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { ChevronLeft, Target, Activity, AlertTriangle, Compass, Clock, Sparkles, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { ExecutionTimeline } from '../charts/primitives/ExecutionTimeline';
import { ScatterCorrelation } from '../charts/ScatterCorrelation';
import type { BodyData, BodyDiagnosis } from '../../data/bodyTypes';
import { BODY_ACCENT } from '../../data/bodyMockData';

const PAGE_BG = 'bg-zinc-50 dark:bg-zinc-950';
const CARD = 'rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800';
const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED = 'text-zinc-400 dark:text-zinc-500';

const blockReveal = { hidden: { opacity: 0, y: 20 }, show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' } }) };

function SmallHead({ title, sub, icon }: { title: string; sub?: string; icon: React.ReactNode }) {
  return (<div>
    <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}>{icon}{title}</p>
    {sub && <p className={`text-[9px] font-mono tracking-wider ${T_MUTED} mt-0.5`}>{sub}</p>}
  </div>);
}

type IconKey = keyof typeof Icons;
function ResolveIcon({ name, ...props }: { name: string; size?: number; className?: string }) {
  const Comp = (Icons[name as IconKey] as React.ComponentType<any>) || Icons.Circle;
  return <Comp {...props} />;
}

interface Props { data: BodyData; diagnosis: BodyDiagnosis; onBack: () => void; }

export function BodyDepth({ data, diagnosis, onBack }: Props) {
  const { timeline24h, workoutLog } = data;
  const { priority, actions, predictions, predictionNarrative, patterns, topCorrelations, depthNarrative, drivers } = diagnosis;

  return (
    <div className={`${PAGE_BG} min-h-screen w-full pb-12`}>
      <header className="px-5 pt-6 pb-2 flex items-center gap-3">
        <button type="button" onClick={onBack} className={`w-10 h-10 -ml-1 rounded-full flex items-center justify-center shrink-0 ${T_LABEL} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`} aria-label="Voltar"><ChevronLeft size={20} strokeWidth={2.2} /></button>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BODY_ACCENT }} />Corpo · Profundidade</p>
          <h1 className={`mt-1 text-[24px] font-bold leading-tight tracking-tight ${T_STRONG}`}>Verdade profunda</h1>
        </div>
      </header>

      <div className="px-5 mt-4 space-y-3">
        {/* PRIORIDADE */}
        <motion.div custom={0} variants={blockReveal} initial="hidden" animate="show"
          className="rounded-3xl p-6 overflow-hidden relative bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-zinc-900 border-2 border-rose-300 dark:border-rose-900/50 shadow-lg">
          <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-rose-500 animate-ping" style={{ animationDuration: '3s' }} />
          </div>
          <div className="relative">
            <p className="text-[10px] font-mono tracking-[0.22em] uppercase text-rose-700 dark:text-rose-300 flex items-center gap-1.5 mb-4"><AlertTriangle size={12} />Prioridade do dia</p>
            <p className={`text-[12px] font-mono tracking-wider uppercase ${T_MUTED} mb-1`}>Seu maior desafio hoje:</p>
            <h2 className={`text-[28px] md:text-[32px] font-bold leading-tight tracking-tight ${T_STRONG}`}>{priority.problem}</h2>
            <p className={`mt-2 text-[13px] leading-relaxed ${T_NORMAL}`}>{priority.problemDetail}</p>
            <div className="mt-5 pt-4 border-t border-rose-200 dark:border-rose-900/40">
              <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_MUTED} mb-2`}>Ação recomendada:</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: BODY_ACCENT }}>
                  <ResolveIcon name={priority.actionIcon} size={18} />
                </div>
                <p className={`text-[15px] font-bold leading-snug ${T_STRONG}`}>{priority.action}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CORRELAÇÕES */}
        <motion.div custom={1} variants={blockReveal} initial="hidden" animate="show" className={`${CARD} p-5`}>
          <SmallHead title="Correlações detectadas" sub="As 2 mais relevantes" icon={<Compass size={11} style={{ color: BODY_ACCENT }} />} />
          <ul className="mt-3 space-y-2">
            {drivers.filter(d => d.tone === 'negative').slice(0, 3).map((d, i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${d.tone === 'positive' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                  <ResolveIcon name={d.icon} size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-semibold ${T_STRONG}`}>{d.factor}</p>
                  <p className={`text-[10px] font-mono tracking-wider ${T_MUTED}`}>impacto · {d.metric}</p>
                </div>
                <span className={`text-[14px] font-bold tabular-nums shrink-0 flex items-center gap-0.5 ${d.tone === 'positive' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {d.tone === 'positive' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {d.impact > 0 ? '+' : ''}{d.impact}%
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-4">
            {topCorrelations.map((corr, i) => (
              <div key={i}>
                <p className={`text-[11px] font-semibold mb-1 ${T_STRONG}`}>{corr.xLabel} impacta {corr.yLabel.toLowerCase()}</p>
                <ScatterCorrelation data={corr.data} xLabel={corr.xLabel} yLabel={corr.yLabel} accent={BODY_ACCENT} pearson={corr.pearson} height={160} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* TIMELINE */}
        <motion.div custom={2} variants={blockReveal} initial="hidden" animate="show" className={`${CARD} p-5`}>
          <SmallHead title="Timeline do dia" sub="05h → 24h · padrões corporais" icon={<Clock size={11} style={{ color: BODY_ACCENT }} />} />
          <div className="mt-3"><ExecutionTimeline blocks={timeline24h} startHour={5} endHour={24} /></div>
          {patterns.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}><Zap size={10} style={{ color: BODY_ACCENT }} />Padrões detectados</p>
              {patterns.map((tp, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${tp.type === 'peak_performance' ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40' : tp.type === 'streak' ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40' : 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white ${tp.type === 'peak_performance' ? 'bg-emerald-500' : tp.type === 'streak' ? 'bg-blue-500' : 'bg-rose-500'}`}>
                    {tp.type === 'peak_performance' ? <Target size={14} /> : tp.type === 'streak' ? <Activity size={14} /> : <AlertTriangle size={14} />}
                  </div>
                  <p className={`text-[12px] font-semibold leading-snug ${T_STRONG}`}>{tp.description}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* TREINOS RECENTES */}
        <motion.div custom={3} variants={blockReveal} initial="hidden" animate="show" className={`${CARD} p-5`}>
          <SmallHead title="Log de treinos · 7d" sub="Tipo · duração · intensidade" icon={<Activity size={11} style={{ color: BODY_ACCENT }} />} />
          <ul className="mt-3 space-y-2">
            {workoutLog.map((w, i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${BODY_ACCENT}20`, color: BODY_ACCENT }}>
                  <span className="text-[11px] font-mono font-bold">{w.intensity}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-semibold ${T_STRONG}`}>{w.type}</p>
                  <p className={`text-[10px] font-mono tracking-wider ${T_MUTED}`}>{w.duration}min · {new Date(w.date).toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                </div>
                <div className="h-1.5 w-20 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden shrink-0">
                  <div className="h-full rounded-full" style={{ width: `${w.intensity * 10}%`, backgroundColor: w.intensity >= 8 ? BODY_ACCENT : w.intensity >= 5 ? '#3b82f6' : '#71717a' }} />
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* PREVISÃO */}
        <motion.div custom={4} variants={blockReveal} initial="hidden" animate="show"
          className="rounded-2xl p-5 overflow-hidden bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-zinc-900 border border-amber-200 dark:border-amber-900/50">
          <SmallHead title="Previsão · 7 dias" sub="Se nada mudar" icon={<Sparkles size={11} className="text-amber-600 dark:text-amber-400" />} />
          {predictions.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {predictions.slice(0, 4).map((p, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-amber-200/50 dark:border-amber-900/30">
                  {p.direction === 'down' ? <ArrowDownRight size={14} className="text-rose-500 shrink-0" /> : <ArrowUpRight size={14} className="text-emerald-500 shrink-0" />}
                  <div className="min-w-0">
                    <p className={`text-[10px] font-mono tracking-wider uppercase ${T_MUTED} truncate`}>{p.metric}</p>
                    <p className={`text-[14px] font-bold tabular-nums ${p.direction === 'down' ? 'text-rose-600' : 'text-emerald-600'}`}>{p.delta > 0 ? '+' : ''}{p.delta}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <motion.p className={`mt-4 text-[15px] leading-relaxed font-bold ${T_STRONG}`}
            initial={{ opacity: 0, filter: 'blur(4px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ delay: 0.6, duration: 0.6 }}>
            {predictionNarrative}
          </motion.p>
        </motion.div>

        {/* AÇÕES */}
        <motion.div custom={5} variants={blockReveal} initial="hidden" animate="show"
          className="rounded-3xl p-5 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-zinc-900 border border-green-200 dark:border-green-900/50">
          <p className="text-[10px] font-mono tracking-[0.22em] uppercase mb-4 flex items-center gap-1.5" style={{ color: BODY_ACCENT }}><Target size={10} />O que fazer agora</p>
          <div className="space-y-2">
            {actions.map((action, i) => (
              <motion.button key={i} type="button" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.15, duration: 0.3 }}
                className={`w-full flex items-center gap-3 h-12 px-4 rounded-xl text-left bg-white dark:bg-zinc-900 border transition-all ${action.urgency === 'high' ? 'border-green-300 dark:border-green-900/50 hover:border-green-500' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'} active:scale-[0.99]`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: action.urgency === 'high' ? BODY_ACCENT : '#71717a' }}>
                  <ResolveIcon name={action.icon} size={14} />
                </div>
                <span className={`text-[13px] font-semibold ${T_STRONG}`}>{action.label}</span>
                {action.urgency === 'high' && <span className="ml-auto text-[8px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300">urgente</span>}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      <p className={`mt-6 px-5 text-center text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>· seu corpo fala · aprenda a ouvir ·</p>
    </div>
  );
}
