// =============================================================
// ORVAX · Life OS — Mental Deep Dive (flagship template)
//
// Padrão de profundidade · 3 tiers visuais com storytelling primeiro:
//   Tier 1 · Anchor + status (score 74/100, trend, story)
//   Tier 2 · Análise visual (radar · line · heatmap · donut · IA)
//   Tier 3 · Verdade profunda (correlações · sankey · timeline · ação)
//
// Single accent #10B981 · light/dark · zero placeholder.
// Este arquivo é o template para os outros 8 deep dives.
// =============================================================
import React, { useMemo } from 'react';
import {
  ChevronLeft, Brain, TrendingUp, Activity, Compass, Sparkles, Moon,
  Smartphone, Coffee, Dumbbell, Target, Clock, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Sankey } from '../charts/primitives/Sankey';
import type { SankeyNode, SankeyLink } from '../charts/primitives/Sankey';
import { ExecutionTimeline } from '../charts/primitives/ExecutionTimeline';
import type { TimelineBlock } from '../charts/primitives/ExecutionTimeline';
import { AIInsight } from '../insights/AIInsight';

const EMERALD = '#10B981';

const PAGE_BG  = 'bg-zinc-50 dark:bg-zinc-950';
const CARD_HERO = [
  'rounded-3xl',
  'bg-white dark:bg-zinc-900',
  'border border-zinc-200 dark:border-white/[0.07]',
  'shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)]',
].join(' ');
const CARD = [
  'rounded-2xl',
  'bg-white dark:bg-zinc-900',
  'border border-zinc-200 dark:border-zinc-800',
].join(' ');
const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';
const T_ACCENT = 'text-emerald-600 dark:text-emerald-400';

// =============================================================
// MOCK DATA · determinístico
// =============================================================
const MENTAL_SCORE = 74;        // Tela 1 score
const TREND_PCT    = +12;       // semana vs semana anterior

// Radar · 4 fatores
const RADAR_DATA = [
  { axis: 'Foco',      atual: 78, anterior: 64 },
  { axis: 'Clareza',   atual: 71, anterior: 68 },
  { axis: 'Humor',     atual: 76, anterior: 70 },
  { axis: 'Calma',     atual: 65, anterior: 58 }, // inverso de ansiedade
];

// Mood evolution · 14 dias
function buildMoodSeries(days = 14) {
  const out: { d: string; mood: number; }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const wave   = Math.sin((i + 2) / 2.4) * 1.2;
    const drift  = (days - i) * 0.06;
    const jitter = ((i * 7) % 5) * 0.18;
    const mood   = Math.max(3, Math.min(10, +(6.4 + wave + drift + jitter).toFixed(1)));
    out.push({ d: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, mood });
  }
  return out;
}
const MOOD_SERIES = buildMoodSeries(14);

// Heatmap · 90 dias de consistência mental
function buildHeatmap(days = 90) {
  const out: { d: string; level: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const wave = Math.sin((i + 5) / 6.5);
    const dow  = d.getDay();
    const weekendPenalty = (dow === 0 || dow === 6) ? -1 : 0;
    const base = wave > 0.4 ? 3 : wave > 0 ? 2 : wave > -0.4 ? 1 : 0;
    const jitter = ((i * 7 + 3) % 11 > 8) ? 1 : 0;
    const level = Math.max(0, Math.min(4, base + weekendPenalty + jitter));
    out.push({ d: d.toISOString().slice(0, 10), level });
  }
  return out;
}
const HEAT = buildHeatmap(90);

// Donut · distribuição de tempo mental
const DONUT_DATA = [
  { name: 'Foco profundo',   value: 14.2, color: EMERALD },
  { name: 'Recuperação',     value: 8.5,  color: '#14b8a6' },
  { name: 'Distração leve',  value: 6.0,  color: '#71717a' },
  { name: 'Drenado',         value: 3.3,  color: '#f43f5e' },
];

// Correlações
const CORRELATIONS = [
  { factor: 'Sono > 7h',       impact: '+32%', metric: 'foco', tone: 'pos' as const, icon: <Moon size={13} /> },
  { factor: 'Telefone > 3h',   impact: '−24%', metric: 'humor', tone: 'neg' as const, icon: <Smartphone size={13} /> },
  { factor: 'Treino na manhã', impact: '+18%', metric: 'clareza', tone: 'pos' as const, icon: <Dumbbell size={13} /> },
];

// Sankey data · onde o tempo mental "vaza"
const SANKEY_NODES: SankeyNode[][] = [
  [{ id: 'time-block', label: 'Tempo livre' }],
  [
    { id: 'social',  label: 'Redes' },
    { id: 'study',   label: 'Estudo' },
    { id: 'rest',    label: 'Descanso' },
    { id: 'project', label: 'Projeto' },
  ],
  [
    { id: 'lost',    label: 'Foco perdido' },
    { id: 'gain',    label: 'Foco ganho' },
  ],
];
const SANKEY_LINKS: SankeyLink[] = [
  { source: 'time-block', target: 'social',  value: 4.2 },
  { source: 'time-block', target: 'study',   value: 2.5 },
  { source: 'time-block', target: 'rest',    value: 2.0 },
  { source: 'time-block', target: 'project', value: 3.5 },
  { source: 'social',  target: 'lost', value: 4.0, drain: true },
  { source: 'rest',    target: 'gain', value: 1.8 },
  { source: 'study',   target: 'gain', value: 2.5 },
  { source: 'project', target: 'gain', value: 3.5 },
  { source: 'social',  target: 'gain', value: 0.2 },
];

// Execution timeline · dia de hoje
const TIMELINE: TimelineBlock[] = [
  { start: 6.5, end: 7,   label: 'Despertar',   tone: 'productive', meta: '30m · meditação' },
  { start: 7,   end: 8.5, label: 'Treino',      tone: 'productive', meta: '1h30 · força' },
  { start: 9,   end: 12,  label: 'Deep Work',   tone: 'productive', meta: '3h · projeto Atlas' },
  { start: 12,  end: 13,  label: 'Almoço',      tone: 'neutral',    meta: '1h' },
  { start: 13,  end: 14.5,label: 'Redes',       tone: 'drain',      meta: '1h30 · scroll' },
  { start: 14.5, end: 17, label: 'Estudo',      tone: 'productive', meta: '2h30 · leitura técnica' },
  { start: 17,  end: 19,  label: 'Família',     tone: 'productive', meta: '2h · presença' },
  { start: 19,  end: 20,  label: 'Jantar',      tone: 'neutral',    meta: '1h' },
  { start: 20,  end: 22,  label: 'Streaming',   tone: 'drain',      meta: '2h · série' },
  { start: 22,  end: 23,  label: 'Sono prep',   tone: 'productive', meta: '1h · journaling' },
];

// =============================================================
// MAIN
// =============================================================
interface Props {
  onBack: () => void;
}

export function MentalDeepDive({ onBack }: Props) {
  const status = useMemo(() => {
    if (MENTAL_SCORE >= 70) return { label: 'BOM', color: 'emerald', dot: 'bg-emerald-500' };
    if (MENTAL_SCORE >= 50) return { label: 'MÉDIO', color: 'amber', dot: 'bg-amber-500' };
    return { label: 'CRÍTICO', color: 'rose', dot: 'bg-rose-500' };
  }, []);

  return (
    <div className={[PAGE_BG, 'min-h-screen w-full pb-12'].join(' ')}>
      {/* HEADER */}
      <DeepDiveHeader onBack={onBack} />

      {/* TIER 1 · Anchor + Score + Status + Story */}
      <section className="px-5 mt-2">
        <div className={[CARD_HERO, 'p-6 md:p-7'].join(' ')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}>
                <span className={['w-1.5 h-1.5 rounded-full', status.dot].join(' ')} />
                Score Mental · {status.label}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`font-mono text-[64px] md:text-[80px] leading-none font-bold tabular-nums tracking-tighter ${T_STRONG}`}>
                  {MENTAL_SCORE}
                </span>
                <span className={`text-[18px] font-mono ${T_LABEL}`}>/100</span>
              </div>
            </div>
            <DeltaPill value={TREND_PCT} />
          </div>

          {/* Storytelling · NÃO é "13% foco" — é "Você está evoluindo há 7 dias" */}
          <p className={`mt-5 text-[14px] leading-relaxed font-medium ${T_NORMAL}`}>
            <span className="text-emerald-500 font-bold">Você está evoluindo há 7 dias.</span>{' '}
            Seu foco está acima da média e a clareza vem ganhando densidade.
            O ponto fraco continua sendo a calma — ansiedade base ainda alta nas tardes.
          </p>

          {/* mini sparkline visual · 14 dias */}
          <div className="mt-4 h-10 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOOD_SERIES} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="mental-mini" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={EMERALD} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={EMERALD} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <Area
                  type="natural"
                  dataKey="mood"
                  stroke={EMERALD}
                  strokeWidth={2}
                  fill="url(#mental-mini)"
                  isAnimationActive
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* TIER 2 · Header */}
      <SectionLabel className="px-5 mt-6" icon={<Activity size={11} className="text-emerald-500" />}>
        Tier 2 · Análise visual
      </SectionLabel>

      {/* RADAR */}
      <section className="px-5 mt-2">
        <div className={[CARD, 'p-5'].join(' ')}>
          <SmallHead
            title="Mapa de equilíbrio"
            sub="Foco · clareza · humor · calma"
            icon={<Compass size={11} className="text-emerald-500" />}
          />
          <div className="h-[230px] mt-2">
            <ResponsiveContainer>
              <RadarChart data={RADAR_DATA} outerRadius="72%">
                <PolarGrid stroke="rgba(113,113,122,0.15)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#71717a' }}
                />
                <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                <Radar
                  name="anterior"
                  dataKey="anterior"
                  stroke="rgba(113,113,122,0.4)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  fill="transparent"
                  isAnimationActive={false}
                />
                <Radar
                  name="atual"
                  dataKey="atual"
                  stroke={EMERALD}
                  strokeWidth={2}
                  fill={EMERALD}
                  fillOpacity={0.18}
                  isAnimationActive
                  animationDuration={1100}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex items-center justify-center gap-5 text-[9px] font-mono uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-zinc-500">
              <span className="w-4 h-px border-t border-dashed border-zinc-500" /> 7d atrás
            </span>
            <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
              <span className="w-4 h-[2px] rounded-full bg-emerald-500" /> hoje
            </span>
          </div>
        </div>
      </section>

      {/* MOOD LINE */}
      <section className="px-5 mt-3">
        <div className={[CARD, 'p-5'].join(' ')}>
          <SmallHead
            title="Humor · 14 dias"
            sub="linha tracejada · alvo de 7"
            icon={<TrendingUp size={11} className="text-emerald-500" />}
          />
          <div className="h-[180px] mt-2 -mx-1">
            <ResponsiveContainer>
              <AreaChart data={MOOD_SERIES} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="mental-mood-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={EMERALD} stopOpacity={0.4} />
                    <stop offset="60%"  stopColor={EMERALD} stopOpacity={0.10} />
                    <stop offset="100%" stopColor={EMERALD} stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(113,113,122,0.12)" vertical={false} />
                <XAxis
                  dataKey="d"
                  tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#71717a' }}
                  axisLine={false} tickLine={false}
                  minTickGap={20}
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#71717a' }}
                  axisLine={false} tickLine={false}
                  width={20}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(24,24,27,0.96)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 14, padding: '8px 12px',
                    fontFamily: 'monospace', fontSize: 11, color: '#fafafa',
                  }}
                  formatter={(v: number) => [`${v}/10`, 'Humor']}
                />
                <ReferenceLine y={7} stroke={EMERALD} strokeDasharray="4 3" strokeWidth={1.2} strokeOpacity={0.5} />
                <Area
                  type="natural"
                  dataKey="mood"
                  stroke={EMERALD}
                  strokeWidth={3}
                  fill="url(#mental-mood-grad)"
                  dot={false}
                  activeDot={{ r: 5, stroke: EMERALD, strokeWidth: 2, fill: '#18181b' }}
                  isAnimationActive
                  animationDuration={1400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* HEATMAP + DONUT (lado a lado em md, stack em mobile) */}
      <section className="px-5 mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={[CARD, 'p-5'].join(' ')}>
          <SmallHead
            title="Consistência · 90d"
            sub="dias com check-in mental"
            icon={<Activity size={11} className="text-emerald-500" />}
          />
          <Heatmap data={HEAT} />
        </div>

        <div className={[CARD, 'p-5'].join(' ')}>
          <SmallHead
            title="Distribuição mental · 7d"
            sub="onde sua mente foi"
            icon={<Brain size={11} className="text-emerald-500" />}
          />
          <DonutMental />
        </div>
      </section>

      {/* AI INSIGHT */}
      <section className="px-5 mt-3">
        <AIInsight
          tone="warning"
          story="Seu humor cai 24% nos dias em que você passa mais de 3h no celular. O padrão é mais forte às terças e quintas."
          correlation="celular > 3h → humor −24% · ansiedade +18%"
          action="Reduza 1h de tela hoje à noite"
          actionLabel="Aplicar agora"
        />
      </section>

      {/* TIER 3 · Header */}
      <SectionLabel className="px-5 mt-7" icon={<Sparkles size={11} className="text-emerald-500" />}>
        Tier 3 · Verdade profunda
      </SectionLabel>

      {/* CORRELAÇÕES strip */}
      <section className="px-5 mt-2">
        <div className={[CARD, 'p-5'].join(' ')}>
          <SmallHead
            title="Correlações detectadas"
            sub="o que está movendo você"
            icon={<Compass size={11} className="text-emerald-500" />}
          />
          <ul className="mt-3 space-y-2">
            {CORRELATIONS.map((c, i) => (
              <li key={i} className={[
                'flex items-center gap-3 p-3 rounded-xl',
                'bg-zinc-50 dark:bg-zinc-800/40',
                'border border-zinc-200 dark:border-zinc-800',
              ].join(' ')}>
                <div className={[
                  'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                  c.tone === 'pos'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                ].join(' ')}>
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-semibold ${T_STRONG}`}>{c.factor}</p>
                  <p className={`text-[10px] font-mono tracking-wider ${T_MUTED}`}>impacto · {c.metric}</p>
                </div>
                <span className={[
                  'text-[14px] font-bold tabular-nums shrink-0 flex items-center gap-1',
                  c.tone === 'pos' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                ].join(' ')}>
                  {c.tone === 'pos' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {c.impact}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SANKEY · onde a vida vaza */}
      <section className="px-5 mt-3">
        <div className={[CARD, 'p-5'].join(' ')}>
          <SmallHead
            title="Onde sua atenção foi"
            sub="tempo livre → atividade → resultado mental"
            icon={<Activity size={11} className="text-emerald-500" />}
          />
          <div className="mt-3">
            <Sankey columns={SANKEY_NODES} links={SANKEY_LINKS} height={220} />
          </div>
          <p className={`mt-3 text-[10.5px] font-mono leading-relaxed ${T_LABEL}`}>
            Linhas grossas = mais tempo. Cinza tracejado = vazamento (atenção que não voltou em foco).
          </p>
        </div>
      </section>

      {/* EXECUTION TIMELINE */}
      <section className="px-5 mt-3">
        <div className={[CARD, 'p-5'].join(' ')}>
          <SmallHead
            title="Timeline do dia · hoje"
            sub="06h → 24h · agora marcado"
            icon={<Clock size={11} className="text-emerald-500" />}
          />
          <div className="mt-3">
            <ExecutionTimeline blocks={TIMELINE} startHour={6} endHour={24} />
          </div>
        </div>
      </section>

      {/* AÇÃO · O que fazer agora */}
      <section className="px-5 mt-3">
        <div className={[
          'rounded-3xl p-5',
          'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-zinc-900',
          'border border-emerald-200 dark:border-emerald-900/50',
        ].join(' ')}>
          <p className={`text-[10px] font-mono tracking-[0.22em] uppercase text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1.5`}>
            <Target size={10} />
            O que fazer agora
          </p>
          <h3 className={`text-[18px] font-bold leading-snug ${T_STRONG}`}>
            Durma 1h mais cedo hoje. Amanhã, treine antes de abrir o celular.
          </h3>
          <p className={`mt-2 text-[12px] leading-relaxed ${T_NORMAL}`}>
            Esses 2 ajustes simples atacam diretamente os 2 padrões negativos detectados.
            Em 7 dias, o sistema vai medir o efeito real.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <ActionPill icon={<Moon size={13} />} label="Dormir 23h" />
            <ActionPill icon={<Dumbbell size={13} />} label="Treinar 6:45h" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <p className={`mt-6 px-5 text-center text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>
        · esse app está te observando · não está te julgando ·
      </p>
    </div>
  );
}

// =============================================================
// SUB-COMPONENTS
// =============================================================
function DeepDiveHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="px-5 pt-6 pb-2 flex items-start gap-3">
      <button
        type="button"
        onClick={onBack}
        className={`w-10 h-10 -ml-1 rounded-full flex items-center justify-center shrink-0 mt-1
          ${T_LABEL} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800
          hover:bg-zinc-100 dark:hover:bg-zinc-800
          transition-colors`}
        aria-label="Voltar"
      >
        <ChevronLeft size={20} strokeWidth={2.2} />
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Pilar
        </p>
        <h1 className={`mt-1 text-[36px] md:text-[44px] font-bold leading-[0.95] tracking-tight ${T_STRONG}`}>
          Mente
        </h1>
        <p className={`mt-1.5 text-[12px] font-mono tracking-wide ${T_MUTED}`}>
          Foco · clareza · humor · calma
        </p>
      </div>
    </header>
  );
}

function SectionLabel({
  children, icon, className,
}: { children: React.ReactNode; icon: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}>
        {icon}{children}
      </p>
    </div>
  );
}

function SmallHead({
  title, sub, icon,
}: { title: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div>
      <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}>
        {icon}{title}
      </p>
      {sub && <p className={`text-[9px] font-mono tracking-wider ${T_MUTED} mt-0.5`}>{sub}</p>}
    </div>
  );
}

function DeltaPill({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={[
      'inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-mono font-bold tabular-nums shrink-0',
      positive
        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50',
    ].join(' ')}>
      {positive ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );
}

function ActionPill({
  icon, label,
}: { icon: React.ReactNode; label: string }) {
  return (
    <div className={[
      'flex items-center gap-2 h-10 px-3 rounded-xl',
      'bg-white dark:bg-zinc-900',
      'border border-emerald-300 dark:border-emerald-900/50',
    ].join(' ')}>
      <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
        {icon}
      </div>
      <span className={`text-[12px] font-semibold ${T_STRONG}`}>{label}</span>
    </div>
  );
}

// =============================================================
// Heatmap inline · 90 dias compactos
// =============================================================
function Heatmap({ data }: { data: { d: string; level: number }[] }) {
  const TONES = [
    'bg-zinc-200 dark:bg-zinc-800/60',
    'bg-emerald-200 dark:bg-emerald-900',
    'bg-emerald-400 dark:bg-emerald-700',
    'bg-emerald-500',
    'bg-emerald-600 dark:bg-emerald-400',
  ];
  // Agrupar por semanas (colunas), 7 dias por coluna (linhas)
  const weeks: Array<typeof data> = [];
  if (data.length) {
    const first = new Date(data[0].d);
    const pad = first.getDay();
    const padded: ({d:string;level:number}|null)[] = [...Array(pad).fill(null), ...data];
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7) as { d: string; level: number }[]);
    }
  }
  const activeDays = data.filter(d => d.level > 0).length;
  return (
    <div className="mt-3">
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="inline-grid grid-flow-col grid-rows-7 gap-[3px]">
          {weeks.flatMap((w, ci) =>
            Array.from({ length: 7 }).map((_, ri) => {
              const cell = w[ri];
              if (!cell) return <div key={`${ci}-${ri}`} className="w-2.5 h-2.5" />;
              return (
                <div
                  key={`${ci}-${ri}`}
                  className={['w-2.5 h-2.5 rounded-sm transition-transform hover:scale-150', TONES[cell.level]].join(' ')}
                  title={`${cell.d} · nv ${cell.level}`}
                />
              );
            }),
          )}
        </div>
      </div>
      <p className={`mt-3 text-[10px] font-mono tracking-wider ${T_MUTED}`}>
        <span className={`text-emerald-500 font-bold`}>{activeDays}/{data.length}</span> dias com check-in
      </p>
    </div>
  );
}

// =============================================================
// Donut · distribuição mental
// =============================================================
function DonutMental() {
  const total = DONUT_DATA.reduce((s, d) => s + d.value, 0);
  return (
    <div className="mt-2">
      <div className="h-[150px] relative">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={DONUT_DATA}
              dataKey="value"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={2}
              isAnimationActive
              animationDuration={1000}
              startAngle={90}
              endAngle={-270}
            >
              {DONUT_DATA.map((d, i) => (
                <Cell key={i} fill={d.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'rgba(24,24,27,0.96)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 14, padding: '8px 12px',
                fontFamily: 'monospace', fontSize: 11, color: '#fafafa',
              }}
              formatter={(v: number) => [`${v.toFixed(1)}h`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`text-[20px] font-mono font-bold tabular-nums leading-none ${T_STRONG}`}>
            {total.toFixed(1)}h
          </span>
          <span className={`text-[9px] font-mono tracking-widest uppercase ${T_MUTED} mt-0.5`}>
            7d
          </span>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {DONUT_DATA.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className={`flex-1 text-[11px] ${T_NORMAL} truncate`}>{d.name}</span>
            <span className={`text-[11px] font-mono tabular-nums ${T_LABEL}`}>{d.value.toFixed(1)}h</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
