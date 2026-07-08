// =============================================================
// ORVAX · Life OS — Relationships Deep Dive (gold-standard bespoke)
//
// Padrão de profundidade · três tiers visuais:
//   1. Anchor metric        → 38h Tempo de Qualidade · este mês
//   2. Distribuição (bar)   → Família vs Amigos vs Networking
//   3. Trend (line+area)    → Energia pós-interação · 14 dias
//   4. Métricas secundárias → Pessoas, Eventos, Streak, Qualidade média
//   5. Interações recentes  → lista narrativa
//
// Single accent: #10B981. Light/Dark · borders sutis · zero categorical color.
// =============================================================
import React, { useMemo } from 'react';
import {
  ChevronLeft, Users, Heart, Coffee, Sparkles,
  Calendar, Phone, TrendingUp, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
  ReferenceLine, Cell,
} from 'recharts';

const EMERALD = '#10B981';

// Tokens · alinhados com o resto do app
const PAGE_BG  = 'bg-zinc-50 dark:bg-zinc-950';
const CARD     = [
  'rounded-3xl',
  'bg-white dark:bg-zinc-900',
  'border border-zinc-200 dark:border-white/[0.07]',
  'shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] dark:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)]',
].join(' ');
const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';
const T_ACCENT = 'text-emerald-600 dark:text-emerald-400';

// =============================================================
// MOCK DATA · determinístico · zero placeholder
// =============================================================
interface CategoryRow {
  label: string;
  hours: number;
  pct:   number;
  icon:  React.ReactNode;
}

interface InteractionRow {
  id:        string;
  name:      string;
  type:      'Família' | 'Companheira' | 'Amigo' | 'Networking';
  hours:     number;
  daysAgo:   number;
  quality:   number;     // 0..10
}

interface DaySatisfaction { d: string; energy: number; satisfaction: number; }

function pad2(n: number) { return String(n).padStart(2, '0'); }
function daysAgoStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

function buildSatisfactionSeries(days = 14): DaySatisfaction[] {
  // Curva senoidal determinística + drift positivo + ruído pseudo-aleatório
  const out: DaySatisfaction[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const wave  = Math.sin((i + 2) / 2.6) * 1.3;
    const drift = (days - i) * 0.05;
    const jitter = ((i * 7 + 3) % 5) * 0.18;
    const energy        = Math.max(3, Math.min(10, +(6.4 + wave + drift + jitter).toFixed(1)));
    const satisfaction  = Math.max(3, Math.min(10, +(6.8 + wave * 0.9 + drift + jitter * 0.8).toFixed(1)));
    out.push({ d: daysAgoStr(i), energy, satisfaction });
  }
  return out;
}

const CATEGORIES: CategoryRow[] = [
  { label: 'Família',    hours: 22, pct: 0, icon: <Heart   size={13} /> },
  { label: 'Amigos',     hours: 11, pct: 0, icon: <Coffee  size={13} /> },
  { label: 'Networking', hours:  5, pct: 0, icon: <Users   size={13} /> },
];
const TOTAL_HOURS = CATEGORIES.reduce((s, c) => s + c.hours, 0); // 38h
CATEGORIES.forEach(c => c.pct = Math.round((c.hours / TOTAL_HOURS) * 100));

const RECENT: InteractionRow[] = [
  { id: 'r1', name: 'Mariana',     type: 'Companheira', hours: 4.5, daysAgo: 0, quality: 10 },
  { id: 'r2', name: 'Mãe',         type: 'Família',     hours: 2.5, daysAgo: 1, quality:  9 },
  { id: 'r3', name: 'Equipe Atlas',type: 'Networking',  hours: 3.0, daysAgo: 1, quality:  6 },
  { id: 'r4', name: 'João',        type: 'Amigo',       hours: 1.2, daysAgo: 2, quality:  8 },
  { id: 'r5', name: 'Pai',         type: 'Família',     hours: 1.0, daysAgo: 3, quality:  9 },
  { id: 'r6', name: 'Pedro',       type: 'Amigo',       hours: 0.8, daysAgo: 4, quality:  7 },
  { id: 'r7', name: 'Mentor',      type: 'Networking',  hours: 1.5, daysAgo: 5, quality:  8 },
];

const SECONDARY = {
  peopleContacted: 14,
  eventsThisMonth: 4,
  socialStreak:    12,
  avgQuality:      8.2,
};

const TYPE_TONE: Record<InteractionRow['type'], string> = {
  'Família':     'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
  'Companheira': 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50',
  'Amigo':       'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700',
  'Networking':  'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700',
};

// =============================================================
// MAIN
// =============================================================
interface Props {
  onBack: () => void;
}

export function RelationshipsDeepDive({ onBack }: Props) {
  const series = useMemo(() => buildSatisfactionSeries(14), []);
  const avgEnergy = useMemo(
    () => +(series.reduce((s, d) => s + d.energy, 0) / series.length).toFixed(1),
    [series],
  );
  const trend = useMemo(() => {
    const lastWeek = series.slice(-7).reduce((s, d) => s + d.energy, 0) / 7;
    const prevWeek = series.slice(0, 7).reduce((s, d) => s + d.energy, 0) / 7;
    return +(((lastWeek - prevWeek) / prevWeek) * 100).toFixed(0);
  }, [series]);

  return (
    <div className={[PAGE_BG, 'min-h-screen w-full pb-12'].join(' ')}>
      {/* HEADER */}
      <DeepDiveHeader onBack={onBack} />

      {/* ANCHOR · single hero metric */}
      <section className="px-5 mt-2">
        <div className={[CARD, 'p-6 md:p-8'].join(' ')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} mb-2 flex items-center gap-1.5`}>
                <Sparkles size={10} className="text-emerald-500" />
                Tempo de Qualidade
              </p>
              <div className="flex items-baseline gap-2">
                <span className={`font-mono text-[64px] md:text-[80px] leading-none font-bold tabular-nums tracking-tighter ${T_STRONG}`}>
                  {TOTAL_HOURS}
                </span>
                <span className={`text-[18px] font-mono ${T_LABEL}`}>h</span>
              </div>
              <p className={`mt-1 text-[12px] font-mono tracking-wide ${T_MUTED}`}>
                este mês · interações com qualidade ≥ 7
              </p>
            </div>
            <DeltaPill value={trend} />
          </div>

          {/* mini barra compacta com a divisão das 3 categorias */}
          <div className="mt-5 flex h-1.5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            {CATEGORIES.map((c, i) => (
              <div
                key={c.label}
                className="h-full transition-all"
                style={{
                  width: `${c.pct}%`,
                  backgroundColor: EMERALD,
                  opacity: 1 - i * 0.25,
                }}
                title={`${c.label} · ${c.pct}%`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] font-mono tracking-wider">
            {CATEGORIES.map((c, i) => (
              <span key={c.label} className={`flex items-center gap-1 ${T_LABEL}`}>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: EMERALD, opacity: 1 - i * 0.25 }}
                />
                {c.label.toUpperCase()} {c.pct}%
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* TIER 1 · Bar chart · distribuição por categoria */}
      <section className="px-5 mt-4">
        <div className={[CARD, 'p-5'].join(' ')}>
          <SectionHead
            title="Distribuição do tempo"
            sub="onde foram suas 38h"
            icon={<Users size={11} className="text-emerald-500" />}
          />
          <div className="h-[200px] mt-3">
            <ResponsiveContainer>
              <BarChart
                data={CATEGORIES.map((c, i) => ({ ...c, opacity: 1 - i * 0.25 }))}
                margin={{ top: 12, right: 8, bottom: 4, left: 4 }}
                barCategoryGap="32%"
              >
                <CartesianGrid stroke="rgba(113,113,122,0.12)" vertical={false} />
                <XAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#71717a' }}
                  tickFormatter={(v: string) => v.toUpperCase()}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#71717a' }}
                  tickFormatter={(v: number) => `${v}h`}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(16,185,129,0.06)' }}
                  contentStyle={{
                    background: 'rgba(24,24,27,0.96)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 14,
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#fafafa',
                  }}
                  formatter={(v: number) => [`${v}h`, 'tempo']}
                />
                <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                  {CATEGORIES.map((c, i) => (
                    <Cell key={c.label} fill={EMERALD} fillOpacity={1 - i * 0.25} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mini-rankings textual */}
          <div className="mt-3 space-y-1.5">
            {CATEGORIES.map((c, i) => (
              <div key={c.label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                  {c.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-[12px] font-semibold ${T_STRONG}`}>{c.label}</span>
                    <span className={`text-[12px] font-mono tabular-nums ${T_NORMAL}`}>
                      {c.hours}h<span className={T_MUTED}> · {c.pct}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${c.pct}%`,
                        backgroundColor: EMERALD,
                        opacity: 1 - i * 0.25,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIER 2 · Line chart · energia pós-interação */}
      <section className="px-5 mt-4">
        <div className={[CARD, 'p-5'].join(' ')}>
          <div className="flex items-start justify-between gap-3 mb-1">
            <SectionHead
              title="Energia pós-interação"
              sub="14 dias · escala 0–10"
              icon={<TrendingUp size={11} className="text-emerald-500" />}
            />
            <div className="text-right shrink-0">
              <p className={`font-mono text-[24px] font-bold tabular-nums leading-none ${T_STRONG}`}>
                {avgEnergy}<span className={`text-[14px] ${T_MUTED}`}>/10</span>
              </p>
              <p className={`mt-0.5 text-[10px] font-mono tracking-wider uppercase ${T_LABEL}`}>
                média
              </p>
            </div>
          </div>

          <div className="h-[200px] mt-2 -mx-1">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="rel-energy-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={EMERALD} stopOpacity={0.40} />
                    <stop offset="55%"  stopColor={EMERALD} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={EMERALD} stopOpacity={0.00} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(113,113,122,0.12)" vertical={false} />
                <XAxis
                  dataKey="d"
                  tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={20}
                />
                <YAxis
                  domain={[0, 10]}
                  tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(24,24,27,0.96)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 14,
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#fafafa',
                  }}
                  formatter={(v: number, k: string) => [`${v}/10`, k === 'energy' ? 'Energia' : 'Satisfação']}
                  labelFormatter={(v) => `dia ${v}`}
                />
                <ReferenceLine y={7} stroke={EMERALD} strokeDasharray="4 3" strokeWidth={1.2} strokeOpacity={0.5} />
                <Area
                  type="natural"
                  dataKey="energy"
                  stroke={EMERALD}
                  strokeWidth={3}
                  fill="url(#rel-energy-grad)"
                  dot={false}
                  activeDot={{ r: 5, stroke: EMERALD, strokeWidth: 2, fill: '#18181b' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className={`mt-2 text-[10px] font-mono tracking-wider ${T_MUTED}`}>
            linha tracejada · meta de 7 · você está {avgEnergy >= 7 ? 'acima' : 'abaixo'} dela
          </p>
        </div>
      </section>

      {/* TIER 3 · Métricas secundárias */}
      <section className="px-5 mt-4">
        <SectionHead
          title="Métricas secundárias"
          sub="o quadro completo"
          icon={<Sparkles size={11} className="text-emerald-500" />}
          inline
        />
        <div className="mt-2 grid grid-cols-2 gap-3">
          <SecondaryMetric
            icon={<Phone size={14} />}
            label="Pessoas contatadas"
            value={`${SECONDARY.peopleContacted}`}
            sub="únicas · este mês"
          />
          <SecondaryMetric
            icon={<Calendar size={14} />}
            label="Eventos do mês"
            value={`${SECONDARY.eventsThisMonth}`}
            sub="encontros + reuniões"
          />
          <SecondaryMetric
            icon={<TrendingUp size={14} />}
            label="Streak social"
            value={`${SECONDARY.socialStreak}d`}
            sub="dias consecutivos"
            accent
          />
          <SecondaryMetric
            icon={<Heart size={14} />}
            label="Qualidade média"
            value={`${SECONDARY.avgQuality}`}
            sub="média · escala 0–10"
            accent
          />
        </div>
      </section>

      {/* Lista de interações recentes */}
      <section className="px-5 mt-4">
        <div className={[CARD, 'p-5'].join(' ')}>
          <SectionHead
            title="Interações recentes"
            sub="últimos 7 dias"
            icon={<Heart size={11} className="text-emerald-500" />}
          />
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {RECENT.map((r) => (
              <li key={r.id} className="py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0
                  text-zinc-500 dark:text-zinc-400 text-[12px] font-bold font-mono">
                  {r.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-[13px] font-semibold ${T_STRONG} truncate`}>{r.name}</p>
                    <span className={[
                      'text-[9px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded-md border',
                      TYPE_TONE[r.type],
                    ].join(' ')}>
                      {r.type}
                    </span>
                  </div>
                  <p className={`mt-0.5 text-[10px] font-mono tracking-wide ${T_MUTED}`}>
                    {r.hours}h · {r.daysAgo === 0 ? 'hoje' : r.daysAgo === 1 ? 'ontem' : `${r.daysAgo} dias atrás`}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <Heart
                    size={11}
                    fill={r.quality >= 8 ? EMERALD : 'transparent'}
                    className={r.quality >= 8 ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-500'}
                  />
                  <span className={`text-[11px] font-mono font-bold tabular-nums ${T_STRONG}`}>
                    {r.quality}<span className={T_MUTED}>/10</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-5 mt-4">
        <button
          type="button"
          onClick={onBack}
          className={[
            'group w-full flex items-center justify-between',
            'h-14 px-5 rounded-2xl',
            'bg-emerald-500 text-white',
            'shadow-lg shadow-emerald-500/30',
            'hover:bg-emerald-600 active:scale-[0.99]',
            'transition-all duration-200',
          ].join(' ')}
        >
          <span className="flex items-center gap-2.5">
            <Sparkles size={15} strokeWidth={2.4} />
            <span className="text-[12px] font-bold tracking-[0.22em] uppercase">
              Registrar interação
            </span>
          </span>
          <ArrowRight size={15} className="opacity-80 group-hover:translate-x-0.5 transition-transform" />
        </button>
        <p className={`mt-3 text-center text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>
          · cada interação registrada profundiza o sistema ·
        </p>
      </section>
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
          Relacionamentos
        </h1>
        <p className={`mt-1.5 text-[12px] font-mono tracking-wide ${T_MUTED}`}>
          Família · amigos · networking · conjugal
        </p>
      </div>
    </header>
  );
}

function SectionHead({
  title, sub, icon, inline,
}: {
  title: string;
  sub?: string;
  icon: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div className={inline ? 'flex items-center justify-between' : ''}>
      <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} flex items-center gap-1.5`}>
        {icon}{title}
      </p>
      {sub && (
        <p className={`text-[9px] font-mono tracking-wider ${T_MUTED} ${inline ? '' : 'mt-0.5'}`}>
          {sub}
        </p>
      )}
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
        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700',
    ].join(' ')}>
      {positive ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );
}

function SecondaryMetric({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?:  string;
  accent?: boolean;
}) {
  return (
    <div className={[
      'rounded-2xl p-4',
      'bg-white dark:bg-zinc-950',
      'border border-zinc-200 dark:border-white/5',
    ].join(' ')}>
      <div className={[
        'w-9 h-9 rounded-xl flex items-center justify-center mb-3',
        accent
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
      ].join(' ')}>
        {icon}
      </div>
      <p className={`text-[10px] font-mono tracking-widest uppercase ${T_LABEL}`}>{label}</p>
      <p className={`mt-1 font-mono text-[26px] font-bold tabular-nums leading-none ${accent ? T_ACCENT : T_STRONG}`}>
        {value}
      </p>
      {sub && (
        <p className={`mt-1 text-[10px] font-mono tracking-wide ${T_MUTED}`}>{sub}</p>
      )}
    </div>
  );
}
