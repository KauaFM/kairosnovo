// =============================================================
// ORVAX · Life OS — LifeMetricsOverview (v8 · Emerald Premium)
//
// Light/Dark mode respeitado em todos os cards.
// Única cor de destaque = Verde Esmeralda Puro (#10B981).
//
// Regras absolutas:
//   · bg da página   → bg-zinc-50  dark:bg-zinc-950  (MetricsPage)
//   · cards hero     → bg-white  dark:bg-zinc-900   border-zinc-200 dark:border-white/[0.07]  rounded-3xl
//   · cards bento    → bg-white  dark:bg-zinc-950   border-zinc-200 dark:border-white/5        rounded-2xl
//   · accent texto   → text-emerald-600 dark:text-emerald-400
//   · accent gráfico → #10B981 (hex direto no recharts)
//   · NENHUMA cor categórica (sem vermelho, azul, roxo nos cards)
//
// Ordem das seções (mobile-first · scroll):
//   1. Header minimalista (bom dia · nome · XP)
//   2. Creation Hub      (10 pilares · quick-actions)
//   3. Mapa de Equilíbrio Vital (Radar · linhas neon only)
//   4. Métricas Transversais   (streak · consistência · score)
//   5. Progresso Multianual    (AreaChart 36 meses)
//   6. Matriz de Performance   (Bento 2-col · 10 pilares sincronizados)
//   7. Execution Map           (heatmap 365 dias · verde esmeralda)
// =============================================================
import React, { useMemo, useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import {
  Activity, ArrowUpRight, ArrowDownRight, Minus,
  Bell, ChevronRight,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, YAxis, XAxis, Tooltip,
} from 'recharts';
import type { PillarKey } from '../../types';
import { PILLARS, getPillar } from '../../pillars';
import {
  mockOrvaxState, getPillarState, ORVAX_ACCENT,
} from '../../state/mockOrvaxState';
import { getPillarTelaUm, STATUS_DOT } from '../../state/pillarTelaUm';
import OmniActionCenter from '../creation/OmniActionCenter';

// ─────────────────────────────────────────────────────────────
// Design tokens (todos os valores fixos do tema escuro)
// ─────────────────────────────────────────────────────────────
const ACCENT = ORVAX_ACCENT; // #10B981

// Cards hero (Radar · Transversal · MultiYear · ExecMap · Header)
const CARD_HERO = [
  'relative rounded-3xl',
  'bg-white dark:bg-zinc-900',
  'border border-zinc-200 dark:border-white/[0.07]',
  'shadow-[0_2px_0_0_rgba(255,255,255,0.04)_inset,0_4px_24px_-8px_rgba(0,0,0,0.08)]',
  'dark:shadow-[0_2px_0_0_rgba(255,255,255,0.04)_inset,0_16px_40px_-20px_rgba(0,0,0,0.8)]',
  'transition-all duration-200',
].join(' ');

// Cards do Bento Grid (10 pilares)
const CARD_BENTO = [
  'relative rounded-2xl',
  'bg-white dark:bg-zinc-950',
  'border border-zinc-200 dark:border-white/5',
  'shadow-sm dark:shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]',
  'transition-all duration-200',
].join(' ');

// Texto — dual-theme
const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-600 dark:text-zinc-300';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';
const T_ACCENT = 'text-emerald-600 dark:text-emerald-400';  // destaque positivo em texto

// Hook reativo — detecta toggle do darkMode via MutationObserver
function useIsDark(): boolean {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' &&
          document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const el  = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

type IconName = keyof typeof Icons;
const IconOf = (n?: string): React.ComponentType<any> => {
  const K = (n || 'Circle') as IconName;
  return (Icons[K] as React.ComponentType<any>) || Icons.Circle;
};

// ─────────────────────────────────────────────────────────────
interface Props {
  onOpenPillar?:   (p: PillarKey) => void;
  onOpenCreation?: () => void;
  onOpenProfile?:  () => void;
  onOpenNotifs?:   () => void;
}

// =============================================================
// MAIN
// =============================================================
export default function LifeMetricsOverview({
  onOpenPillar, onOpenCreation, onOpenProfile, onOpenNotifs,
}: Props) {
  const S = mockOrvaxState;

  return (
    <section className={`w-full space-y-4 ${T_NORMAL}`}>

      {/* 1 · HEADER */}
      <ExecutiveHeader
        name={S.user.name}
        xp={S.user.xpTotal}
        xpDelta={S.user.xpWeekDelta}
        level={S.user.level}
        notifs={S.user.notifications}
        onProfile={onOpenProfile}
        onNotifs={onOpenNotifs}
      />

      {/* 2 · OMNI-ACTION CENTER · trigger inline + modal próprio */}
      <OmniActionCenter
        onAction={(payload) => {
          // Hook para persistência futura (Supabase, Realtime, etc.)
          // eslint-disable-next-line no-console
          console.info('[OmniAction]', payload);
        }}
      />

      {/* 3 · MAPA DE EQUILÍBRIO */}
      <UnifiedRadarCard />

      {/* 4 · MÉTRICAS TRANSVERSAIS */}
      <TransversalMetricsCard />

      {/* 5 · PROGRESSO MULTIANUAL */}
      <MultiYearProgressCard />

      {/* 6 · MATRIZ DE PERFORMANCE */}
      <PerformanceMatrix onOpenPillar={onOpenPillar} />

      {/* 7 · EXECUTION MAP */}
      <GlobalExecutionMap />

      <p className={`pt-1 pb-2 text-center text-[9px] font-mono tracking-[0.22em] ${T_MUTED}`}>
        · bato o olho · entendo a vida · clico pra aprofundar ·
      </p>
    </section>
  );
}

// =============================================================
// 1 · Header minimalista
// =============================================================
function ExecutiveHeader({
  name, xp, xpDelta, level, notifs, onProfile, onNotifs,
}: {
  name: string; xp: number; xpDelta: number; level: number; notifs: number;
  onProfile?: () => void; onNotifs?: () => void;
}) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <header className={[CARD_HERO, 'px-5 py-4 flex items-center gap-3'].join(' ')}>
      {/* avatar */}
      <button
        type="button"
        onClick={onProfile}
        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center
          bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10
          text-zinc-700 dark:text-zinc-200
          text-[13px] font-mono font-bold
          hover:border-emerald-500/50 transition-colors`}
        aria-label="Perfil"
      >
        {name.slice(0, 1).toUpperCase()}
      </button>

      {/* saudação + nome */}
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>
          {greeting}
        </p>
        <h1 className={`text-[16px] font-semibold leading-tight truncate ${T_STRONG}`}>
          {name}
          <span className={`ml-2 text-[10px] font-mono tracking-wider ${T_MUTED}`}>
            LV {level}
          </span>
        </h1>
      </div>

      {/* XP counter */}
      <div className="flex flex-col items-end shrink-0">
        <span className={`text-[9px] font-mono tracking-widest uppercase ${T_MUTED}`}>XP</span>
        <span className={`font-mono text-[15px] font-semibold tabular-nums leading-none mt-0.5 ${T_STRONG}`}>
          {xp.toLocaleString('pt-BR')}
        </span>
        <span className={`mt-0.5 text-[10px] font-mono font-semibold tabular-nums ${T_ACCENT}`}>
          +{xpDelta} sem
        </span>
      </div>

      {/* notificações */}
      <button
        type="button"
        onClick={onNotifs}
        className={`relative w-9 h-9 shrink-0 rounded-full flex items-center justify-center
          bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 ${T_LABEL}
          hover:border-zinc-300 dark:hover:border-white/20 transition-colors`}
        aria-label="Notificações"
      >
        <Bell size={14} />
        {notifs > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full
              text-[8px] font-mono font-bold flex items-center justify-center text-zinc-950"
            style={{ background: ACCENT }}
          >
            {notifs}
          </span>
        )}
      </button>
    </header>
  );
}

// =============================================================
// 3 · Mapa de Equilíbrio Vital — Radar 10 pilares
// Apenas linha neon, fill ultra-translúcido, teia de aranha sutil
// =============================================================
function UnifiedRadarCard() {
  const isDark = useIsDark();

  const data = useMemo(() => PILLARS.map((p) => {
    const st  = getPillarState(p.key);
    const max = Math.max(1, st.radarWeek.current, st.radarWeek.previous);
    return {
      label:    p.short,
      atual:    Math.round((st.radarWeek.current  / max) * 100),
      anterior: Math.round((st.radarWeek.previous / max) * 100),
    };
  }), []);

  // O radar vive sempre dentro do card escuro, mas respeitamos o hook
  // para caso o usuário esteja no modo claro sistêmico.
  const gridStroke     = isDark ? 'rgba(255,255,255,0.08)' : '#e4e4e7';
  const anteriorStroke = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
  const tickFill       = isDark ? '#52525b' : '#a1a1aa';

  return (
    <div className={[CARD_HERO, 'p-5'].join(' ')}>
      <div className="flex items-center justify-between mb-2">
        <MiniLabel icon={<Icons.Hexagon size={10} className={T_ACCENT} />}>
          Mapa de Equilíbrio Vital
        </MiniLabel>
        <span className={`text-[9px] font-mono tracking-widest uppercase ${T_MUTED}`}>
          10 pilares · 7d
        </span>
      </div>

      <div className="w-full h-[240px]">
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke={gridStroke} />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fontSize: 8, fontFamily: 'ui-monospace, monospace', fill: tickFill }}
            />
            <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />

            {/* semana anterior · tracejado neutro · fill zero */}
            <Radar
              name="anterior"
              dataKey="anterior"
              stroke={anteriorStroke}
              strokeDasharray="3 3"
              strokeWidth={0.8}
              fill="transparent"
              isAnimationActive={false}
            />
            {/* semana atual · linha neon · fill ultra-sutil */}
            <Radar
              name="atual"
              dataKey="atual"
              stroke={ACCENT}
              strokeWidth={1.6}
              strokeLinejoin="round"
              fill={ACCENT}
              fillOpacity={0.08}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* legenda inline */}
      <div className="flex items-center justify-center gap-5 mt-1">
        <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-zinc-600">
          <span className="w-4 h-px border-t border-dashed border-zinc-600 inline-block" />
          anterior
        </span>
        <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider" style={{ color: ACCENT }}>
          <span className="w-4 h-[1.5px] inline-block rounded-full" style={{ background: ACCENT }} />
          atual
        </span>
      </div>
    </div>
  );
}

// =============================================================
// 4 · Métricas Transversais
// =============================================================
function TransversalMetricsCard() {
  const g = mockOrvaxState.global;
  return (
    <div className={[CARD_HERO, 'p-5'].join(' ')}>
      <div className="flex items-center justify-between mb-4">
        <MiniLabel icon={<Icons.Layers size={10} className={T_ACCENT} />}>
          Métricas Transversais
        </MiniLabel>
        <span className={`text-[9px] font-mono tracking-widest uppercase ${T_MUTED}`}>
          visão geral
        </span>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* streak */}
        <div>
          <p className={`text-[9px] font-mono tracking-widest uppercase ${T_MUTED}`}>
            Streak Global
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`font-mono text-[34px] font-semibold tracking-tight leading-none tabular-nums ${T_ACCENT}`}>
              {g.streak}
            </span>
            <span className={`text-[11px] font-mono tracking-wider uppercase ${T_MUTED}`}>d</span>
          </div>
          <p className={`mt-1 text-[9px] font-mono tracking-wider ${T_MUTED}`}>
            execução consecutiva
          </p>
        </div>

        {/* consistência */}
        <div>
          <p className={`text-[9px] font-mono tracking-widest uppercase ${T_MUTED}`}>
            Consistência
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`font-mono text-[34px] font-semibold tracking-tight leading-none tabular-nums ${T_STRONG}`}>
              {g.consistency}
            </span>
            <span className={`text-[16px] font-mono leading-none ${T_MUTED}`}>%</span>
          </div>
          <p className={`mt-1 text-[9px] font-mono tracking-wider ${T_MUTED}`}>
            {g.activeDays7}/7 dias ativos
          </p>
          <div className="mt-3 h-0.5 rounded-full overflow-hidden bg-zinc-200 dark:bg-white/5">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${g.consistency}%`, background: ACCENT }}
            />
          </div>
        </div>
      </div>

      {/* score global */}
      <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
        <div>
          <p className={`text-[9px] font-mono tracking-widest uppercase ${T_MUTED}`}>
            Score Global
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`font-mono text-[22px] font-semibold tracking-tight leading-none tabular-nums ${T_STRONG}`}>
              {g.scoreGlobal.toLocaleString('pt-BR')}
            </span>
            <span className={`text-[10px] font-mono tracking-wider uppercase ${T_MUTED}`}>xp</span>
          </div>
        </div>
        <DeltaInline value={g.scoreDelta} suffix="xp · sem" />
      </div>
    </div>
  );
}

// =============================================================
// 5 · Progresso Multianual — AreaChart 36 meses
// =============================================================
function MultiYearProgressCard() {
  const isDark = useIsDark();
  const data   = mockOrvaxState.multiYear;
  const last   = data[data.length - 1].v;
  const first  = data[0].v;
  const growth = Math.round(((last - first) / Math.max(1, first)) * 100);
  const tickFill = isDark ? '#52525b' : '#a1a1aa';

  return (
    <div className={[CARD_HERO, 'p-5'].join(' ')}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <MiniLabel icon={<Icons.TrendingUp size={10} className={T_ACCENT} />}>
            Progresso Multianual
          </MiniLabel>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`font-mono text-[24px] font-semibold tracking-tight leading-none tabular-nums ${T_STRONG}`}>
              {last.toLocaleString('pt-BR')}
            </span>
            <DeltaBadge value={growth} />
          </div>
          <p className={`mt-1 text-[9px] font-mono tracking-wider ${T_MUTED}`}>
            score mensal · 36 meses · 2024 → 2026
          </p>
        </div>
        <span className={`text-[9px] font-mono tracking-widest uppercase pt-0.5 ${T_MUTED}`}>
          macro
        </span>
      </div>

      <div className="h-36 md:h-44 -mx-1 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 2, left: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={ACCENT} stopOpacity={0.30} />
                <stop offset="60%"  stopColor={ACCENT} stopOpacity={0.06} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="key"
              interval={11}
              tickFormatter={(v: string) => v.slice(0, 4)}
              tick={{ fontSize: 9, fill: tickFill, fontFamily: 'ui-monospace, monospace' }}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
            />
            <YAxis hide domain={['dataMin - 80', 'dataMax + 80']} />
            <Tooltip
              cursor={{ stroke: ACCENT, strokeOpacity: 0.25 }}
              contentStyle={{
                background: 'rgba(9,9,11,0.96)',
                border: `1px solid ${ACCENT}30`,
                borderRadius: 10,
                fontSize: 11,
                fontFamily: 'ui-monospace, monospace',
                color: '#fafafa',
                padding: '6px 10px',
              }}
              formatter={(val: number) => [`${val.toLocaleString('pt-BR')} xp`, 'score']}
              labelFormatter={(v) => String(v)}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={ACCENT}
              strokeWidth={1.6}
              fill="url(#areaGrad)"
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                if (payload.month !== 0) return <g key={index} />;
                return (
                  <circle key={index} cx={cx} cy={cy} r={2.5}
                    fill={ACCENT} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
                );
              }}
              activeDot={{ r: 3.5, fill: ACCENT, stroke: ACCENT }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// =============================================================
// 6 · Matriz de Performance — Bento 2-col · 10 pilares
// =============================================================
function PerformanceMatrix({ onOpenPillar }: { onOpenPillar?: (p: PillarKey) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between px-1 pb-3">
        <MiniLabel icon={<Activity size={10} className={T_ACCENT} />}>
          Matriz de Performance
        </MiniLabel>
        <span className={`text-[9px] font-mono tracking-widest uppercase ${T_MUTED}`}>
          toque pra aprofundar
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        {PILLARS.map((p) => (
          <PillarCard
            key={p.key}
            pillarKey={p.key}
            onClick={() => onOpenPillar?.(p.key)}
          />
        ))}
      </div>
    </div>
  );
}

function PillarCard({ pillarKey, onClick }: { pillarKey: PillarKey; onClick?: () => void }) {
  const pillar    = getPillar(pillarKey);
  const Icon      = IconOf(pillar.icon);
  const st        = getPillarState(pillarKey);
  const tela1     = getPillarTelaUm(pillarKey);
  const shortName = pillar.label.split(/[· ]/)[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        CARD_BENTO,
        'group text-left w-full p-4 flex flex-col gap-3',
        'hover:border-emerald-500/30 active:scale-[0.99]',
        'dark:hover:shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_8px_24px_-12px_rgba(16,185,129,0.20)]',
      ].join(' ')}
    >
      {/* topo: ícone + nome + status dot + seta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={13} className={`${T_LABEL} shrink-0`} strokeWidth={1.8} />
          <span className={`text-[10px] font-mono tracking-wider uppercase ${T_LABEL} truncate`}>
            {shortName}
          </span>
          <span
            className={['w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[tela1.status]].join(' ')}
            title={tela1.status}
          />
        </div>
        <ChevronRight
          size={12}
          className="text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0"
        />
      </div>

      {/* score 0-100 + delta · padrão Tela 1 */}
      <div className="flex-1">
        <div className="flex items-baseline gap-1">
          <span className={`font-mono text-[26px] md:text-[30px] font-bold tracking-tight leading-none tabular-nums ${T_STRONG}`}>
            {tela1.score}
          </span>
          <span className={`text-[11px] font-mono ${T_MUTED}`}>/100</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
          <DeltaBadge value={tela1.trendPct} />
          <span className={`${T_MUTED} truncate`}>{tela1.subtitle}</span>
        </div>
      </div>

      {/* sparkline verde neon */}
      <div className="h-9 -mx-1 -mb-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={st.sparkline.map((v, i) => ({ i, v }))}
            margin={{ top: 3, right: 2, bottom: 2, left: 2 }}
          >
            <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
            <Line
              type="monotone"
              dataKey="v"
              stroke={ACCENT}
              strokeOpacity={0.85}
              strokeWidth={1.3}
              strokeLinecap="round"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
}

// =============================================================
// 7 · Execution Map — 365 dias · verde esmeralda
// Escala GitHub-style com tons de emerald (#10B981 base)
// =============================================================
const EXEC_TONES = [
  'bg-zinc-200 dark:bg-zinc-800/60',   // nv 0 · vazio
  'bg-emerald-200 dark:bg-emerald-900',// nv 1 · muito fraco
  'bg-emerald-400 dark:bg-emerald-700',// nv 2 · fraco
  'bg-emerald-500 dark:bg-emerald-500',// nv 3 · médio
  'bg-[#10B981] dark:bg-[#34d399]',    // nv 4 · máximo · emerald
];

function GlobalExecutionMap() {
  const heat       = mockOrvaxState.heat365;
  const activeDays = heat.filter(d => d.c > 0).length;
  const streak     = mockOrvaxState.global.streak;

  const cols = useMemo(() => {
    const first = new Date(heat[0].d + 'T12:00:00');
    const pad   = first.getDay();
    const padded: (typeof heat[number] | null)[] = [
      ...Array(pad).fill(null),
      ...heat,
    ];
    const c: (typeof heat[number] | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      const week = padded.slice(i, i + 7);
      while (week.length < 7) week.push(null);
      c.push(week);
    }
    return c;
  }, [heat]);

  return (
    <div className={[CARD_HERO, 'p-5'].join(' ')}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <MiniLabel icon={<Icons.Grid3x3 size={10} className={T_ACCENT} />}>
            Execution Map
          </MiniLabel>
          <p className={`mt-1.5 text-[13px] font-medium ${T_STRONG}`}>
            Últimos 365 dias
          </p>
          <p className={`mt-0.5 text-[9px] font-mono tracking-wider ${T_MUTED}`}>
            {activeDays} dias executados · streak {streak}d
          </p>
        </div>
        <LegendIntensity />
      </div>

      {/* grid scrollável */}
      <div className="mt-4 -mx-2 px-2 overflow-x-auto
        [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="inline-grid grid-flow-col grid-rows-7 gap-[3px] pb-0.5">
          {cols.flatMap((week, ci) =>
            week.map((day, ri) => (
              <ExecCell key={`${ci}-${ri}`} day={day} />
            ))
          )}
        </div>
      </div>

      <div className={`mt-3 flex items-center justify-between text-[9px] font-mono tracking-widest uppercase ${T_MUTED}`}>
        <span>365d atrás</span>
        <span>hoje</span>
      </div>
    </div>
  );
}

function ExecCell({ day }: { day: { d: string; c: number } | null }) {
  if (!day) return <div className="w-3 h-3 rounded-sm bg-transparent" />;
  return (
    <div
      title={`${day.d} · nível ${day.c}`}
      className={[
        'w-3 h-3 rounded-sm transition-transform hover:scale-125 cursor-default',
        EXEC_TONES[day.c],
      ].join(' ')}
    />
  );
}

function LegendIntensity() {
  return (
    <div className="flex items-center gap-1.5 pt-1">
      <span className={`text-[8px] font-mono tracking-widest uppercase ${T_MUTED}`}>menos</span>
      <div className="flex items-center gap-[3px]">
        {[0, 1, 2, 3, 4].map(lv => (
          <div key={lv} className={['w-2.5 h-2.5 rounded-sm', EXEC_TONES[lv]].join(' ')} />
        ))}
      </div>
      <span className={`text-[8px] font-mono tracking-widest uppercase ${T_MUTED}`}>mais</span>
    </div>
  );
}

// =============================================================
// Átomos de tipografia
// =============================================================
function MiniLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.24em] ${T_LABEL}`}>
      {icon}{children}
    </span>
  );
}

// Δ em linha (hero cards)
function DeltaInline({ value, suffix }: { value: number; suffix?: string }) {
  const Arrow = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const sign  = value > 0 ? '+' : '';
  const cls   = value > 0 ? T_ACCENT : value < 0 ? T_LABEL : T_MUTED;
  return (
    <p className="flex items-center gap-1 text-[10px] font-mono tracking-wider">
      <Arrow size={10} strokeWidth={2.2} className={cls} />
      <span className={`tabular-nums font-semibold ${cls}`}>{sign}{value}</span>
      {suffix && <span className={T_MUTED}>· {suffix}</span>}
    </p>
  );
}

// Δ badge (bento cards)
function DeltaBadge({ value }: { value: number }) {
  const Arrow = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  const sign  = value > 0 ? '+' : '';
  const cls   = value > 0 ? T_ACCENT : value < 0 ? 'text-zinc-500' : T_MUTED;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono font-semibold tabular-nums ${cls}`}>
      <Arrow size={9} strokeWidth={2.5} />{sign}{value}%
    </span>
  );
}
