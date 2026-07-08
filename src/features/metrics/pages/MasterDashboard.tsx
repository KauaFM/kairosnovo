import { useEffect, useRef, useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Sparkles } from 'lucide-react';
import type { DomainKey, Period } from '../types/metrics.types';
import { PERIOD_LABELS } from '../types/metrics.types';
import { VaultMetricsCard } from '../components/VaultMetricsCard';
import { GoalsHubCard } from '../components/GoalsHubCard';
import { HabitsHubCard } from '../components/HabitsHubCard';
import { AttributionFeedCard } from '../components/AttributionFeedCard';
import { getDashboard, getDailyMetrics } from '../../../services/db';
import { useRealtimeSync } from '../../../hooks/useRealtimeSync';

/* ────────────────────────────────────────────────
 *  ORVAX Core — pilares reais (5 dimensões).
 *  Tudo alimentado por daily_metrics via get_dashboard RPC.
 * ──────────────────────────────────────────────── */

type Pillars = {
  disciplina: number;
  consistencia: number;
  foco: number;
  energia: number;
  evolucao: number;
};

type Dashboard = {
  pillars: Pillars;
  deltas: Pillars;
  xp_total: number;
  xp_7d: number;
  tasks_7d: number;
  habits_7d: number;
  streak: number;
  today: { xp: number; tasks_done: number; habits_done: number };
  has_data: boolean;
};

const EMPTY: Dashboard = {
  pillars:      { disciplina: 0, consistencia: 0, foco: 0, energia: 0, evolucao: 0 },
  deltas:       { disciplina: 0, consistencia: 0, foco: 0, energia: 0, evolucao: 0 },
  xp_total: 0, xp_7d: 0, tasks_7d: 0, habits_7d: 0, streak: 0,
  today: { xp: 0, tasks_done: 0, habits_done: 0 },
  has_data: false,
};

const PILLAR_LABELS: Record<keyof Pillars, string> = {
  disciplina:   'Disciplina',
  consistencia: 'Consistência',
  foco:         'Foco',
  energia:      'Energia',
  evolucao:     'Evolução',
};

function palette(dark: boolean) {
  return {
    grid:        dark ? 'rgba(255,255,255,0.04)' : '#f4f4f5',
    tick:        dark ? 'rgba(255,255,255,0.25)' : '#a1a1aa',
    tooltipBg:   dark ? '#09090b' : '#fafafa',
    tooltipBdr:  dark ? '#27272a' : '#e4e4e7',
    radarGrid:   dark ? 'rgba(255,255,255,0.07)' : '#e4e4e7',
    radarStroke: dark ? '#fafafa' : '#0a0a0a',
    radarFill:   dark ? '#fafafa' : '#0a0a0a',
    radarPrev:   dark ? 'rgba(255,255,255,0.18)' : '#a1a1aa',
  };
}

/* ── Sparkline ──────────────────────────── */
function Spark({ data, isDark }: { data: number[]; isDark: boolean }) {
  const w = 56, h = 18;
  if (data.length < 2) return <div className="text-[8px] font-mono text-zinc-400">—</div>;
  const mn = Math.min(...data), mx = Math.max(...data);
  const rng = mx - mn || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / rng) * (h - 2) - 1}`)
    .join(' ');
  return (
    <svg width={w} height={h} className="block shrink-0">
      <polyline points={pts} fill="none"
        stroke={isDark ? 'rgba(255,255,255,0.45)' : '#52525b'} strokeWidth={1.2} />
    </svg>
  );
}

/* ── Delta ─────────────────────────────── */
function Delta({ value }: { value: number }) {
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'neutral';
  const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
      <Icon size={10} strokeWidth={1.8} />
      {Math.abs(value)}
    </span>
  );
}

/* ── Module wrapper ─────────────────────── */
function Mod({
  title, children, onClick, className = '',
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`
        rounded-[28px] p-5 relative overflow-hidden
        border border-zinc-200/80 dark:border-zinc-800/80
        bg-white dark:bg-zinc-950/80
        ${onClick ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all duration-200' : ''}
        ${className}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.2em] text-zinc-400/80 dark:text-zinc-500/80">
          {title}
        </span>
        {onClick && <ChevronRight size={12} strokeWidth={1.6} className="text-zinc-300/50 dark:text-zinc-600/50" />}
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════
 *  MAIN COMPONENT
 * ══════════════════════════════════════════════════ */
interface Props {
  isDark: boolean;
  period: Period;
  onPeriodChange: (p: Period) => void;
  onDomainClick: (key: DomainKey) => void;
  onOpenLog?: () => void;
}

export function MasterDashboard({ isDark, period, onPeriodChange, onOpenLog }: Props) {
  const C = palette(isDark);

  const [dash, setDash] = useState<Dashboard>(EMPTY);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { subscribeToDailyMetrics, subscribeToXpLog } = useRealtimeSync();
  const unsubRef = useRef<Array<() => void>>([]);

  const load = async () => {
    const [d, h] = await Promise.all([
      getDashboard(),
      getDailyMetrics(30),
    ]);
    setDash(d ?? EMPTY);
    setHistory(h ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const u1 = subscribeToDailyMetrics(() => load());
    const u2 = subscribeToXpLog(() => load());
    if (u1) unsubRef.current.push(u1);
    if (u2) unsubRef.current.push(u2);
    return () => {
      unsubRef.current.forEach(u => u?.());
      unsubRef.current = [];
    };
  }, [subscribeToDailyMetrics, subscribeToXpLog]);

  // Agregado para Score Global (média dos 5 pilares)
  const { pillars, deltas } = dash;
  const scoreGlobal = Math.round(
    (pillars.disciplina + pillars.consistencia + pillars.foco + pillars.energia + pillars.evolucao) / 5
  );
  const scorePrev = Math.round(
    ((pillars.disciplina - deltas.disciplina) +
     (pillars.consistencia - deltas.consistencia) +
     (pillars.foco - deltas.foco) +
     (pillars.energia - deltas.energia) +
     (pillars.evolucao - deltas.evolucao)) / 5
  );
  const scoreVar = scorePrev > 0
    ? +((scoreGlobal - scorePrev) / scorePrev * 100).toFixed(1)
    : 0;

  const radarData = (Object.keys(PILLAR_LABELS) as Array<keyof Pillars>).map((k) => ({
    domain: PILLAR_LABELS[k],
    current: pillars[k],
    previous: Math.max(0, pillars[k] - deltas[k]),
  }));

  // Sparklines dos pilares (últimos 30d)
  const sparkFor = (key: keyof Pillars) =>
    history.map((d) => Number(d[key] ?? 0) * 20).slice(-14);

  return (
    <div className="flex flex-col gap-3 pb-6 px-1">

      {/* ── System Header ─────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2 px-1 mb-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-900 dark:text-zinc-100 opacity-80 pl-1">
          Dashboard
        </span>
        <div className="flex items-center gap-3">
          {onOpenLog && (
            <button
              onClick={onOpenLog}
              className="h-7 px-3.5 flex items-center justify-center gap-1.5 rounded-[12px] border border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e] hover:text-black transition-all duration-300 active:scale-95"
            >
              <span className="text-[9px] font-outfit font-black uppercase tracking-widest">+ Log Diário</span>
            </button>
          )}
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900/80 p-1 rounded-[14px] border border-zinc-200/50 dark:border-zinc-800/50">
            {(['week', 'month', '3m', '6m', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`
                  px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider
                  rounded-[10px] transition-all duration-300
                  ${period === p
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'}
                `}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Hero: Score Global + Streak + XP ──────────────────────── */}
      <div className="rounded-[28px] border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/80 p-6 text-center relative overflow-hidden">
        <span className="text-[8px] font-mono font-semibold uppercase tracking-[0.25em] text-zinc-400/60 dark:text-zinc-500/60">
          Score Global
        </span>

        {loading ? (
          <div className="mt-3 h-[60px] flex items-center justify-center text-[10px] font-mono text-zinc-400">
            carregando…
          </div>
        ) : !dash.has_data ? (
          <div className="mt-4 flex flex-col items-center gap-2">
            <Sparkles size={22} className="text-zinc-400" strokeWidth={1.3} />
            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 max-w-[280px] leading-relaxed">
              Sem dados ainda. Conclua 1 tarefa ou hábito pra ativar seus pilares.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-3 flex items-baseline justify-center gap-1">
              <span className="text-[52px] font-outfit font-black text-zinc-900 dark:text-zinc-100 leading-none">
                {scoreGlobal}
              </span>
              <span className="text-[16px] font-outfit text-zinc-300/60 dark:text-zinc-600/60">/100</span>
            </div>
            {scorePrev > 0 && (
              <div className="mt-2">
                <Delta value={scoreVar} />
                <span className="ml-1 text-[8px] font-mono text-zinc-400/60 dark:text-zinc-500/60">% vs 7d anteriores</span>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-center gap-8 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
          {[
            { label: 'Streak', value: `${dash.streak}d` },
            { label: 'XP 7d',  value: dash.xp_7d },
            { label: 'Hoje',   value: `+${dash.today.xp}` },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <span className="block text-[7px] font-mono uppercase tracking-[0.2em] text-zinc-400/50 dark:text-zinc-500/50 mb-0.5">{s.label}</span>
              <span className="text-[13px] font-outfit font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hábitos de Hoje (check-in rápido) ───────────────────── */}
      <HabitsHubCard isDark={isDark} />

      {/* ── Mapa de Equilíbrio (Radar dos 5 pilares) ────────────── */}
      <Mod title="Mapa de Equilíbrio">
        <div className="flex items-center gap-5 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
            <span className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Atual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 border-t border-dashed border-zinc-300 dark:border-zinc-600" />
            <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">7d atrás</span>
          </div>
        </div>
        <div className="h-[260px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke={C.radarGrid} strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="domain"
                tick={{
                  fill: isDark ? 'rgba(255,255,255,0.45)' : '#52525b',
                  fontSize: 10, fontWeight: 600,
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}
                tickLine={false}
              />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar name="7d atrás" dataKey="previous" stroke={C.radarPrev}
                fill="none" strokeWidth={1} strokeDasharray="4 3" />
              <Radar name="Atual" dataKey="current" stroke={C.radarStroke}
                fill={C.radarFill} fillOpacity={0.15} strokeWidth={1.5} />
              <Tooltip
                contentStyle={{
                  background: C.tooltipBg,
                  border: `1px solid ${C.tooltipBdr}`,
                  borderRadius: 10, fontSize: 10, padding: '6px 10px',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}
                itemStyle={{ color: isDark ? '#d4d4d8' : '#3f3f46', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Mod>

      {/* ── Pilares em detalhe ─────────────────────── */}
      <Mod title="Pilares // 7D">
        <div className="flex flex-col -mx-1">
          {(Object.keys(PILLAR_LABELS) as Array<keyof Pillars>).map((k, i, arr) => (
            <div
              key={k}
              className={`
                flex items-center gap-2 py-3 px-2 rounded-2xl
                ${i < arr.length - 1 ? 'border-b border-zinc-100/60 dark:border-zinc-800/30' : ''}
              `}
            >
              <span className="w-[72px] text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500/70 dark:text-zinc-400/70 truncate text-left">
                {PILLAR_LABELS[k]}
              </span>
              <div className="flex-1 h-[3px] rounded-full bg-zinc-100 dark:bg-zinc-800/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pillars[k]}%`,
                    background: 'linear-gradient(90deg, #a1a1aa, #52525b)',
                  }}
                />
              </div>
              <span className="w-[36px] text-right text-[11px] font-outfit font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                {pillars[k]}
              </span>
              <Delta value={deltas[k]} />
              <Spark data={sparkFor(k)} isDark={isDark} />
            </div>
          ))}
        </div>
      </Mod>

      {/* ── Vetor de Progresso (Metas) ───────────────── */}
      <GoalsHubCard isDark={isDark} />

      {/* ── Métricas do Cofre ─────────────────── */}
      <VaultMetricsCard isDark={isDark} />

      {/* ── Atribuição: de ONDE veio cada ganho de XP ── */}
      <AttributionFeedCard isDark={isDark} limit={15} />

      {/* ── System Footer ────────────────────── */}
      <div className="flex items-center justify-between pt-2 px-1">
        <span className="text-[7px] font-mono text-zinc-300/60 dark:text-zinc-600/60 tracking-wider">
          SYNC {new Date().toLocaleDateString('pt-BR')}{' '}
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-[7px] font-mono text-zinc-300/40 dark:text-zinc-600/40 tracking-wider">ORVAX SYS v2.1</span>
      </div>
    </div>
  );
}
