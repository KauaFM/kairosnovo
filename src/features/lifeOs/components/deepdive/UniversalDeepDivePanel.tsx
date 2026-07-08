// =============================================================
// ORVAX · Life OS — Universal Deep Dive Panel
// Componente único, data-driven, que se adapta aos 10 pilares
// da vida via `pillarConfigData`. Basta trocar a prop
// `activePillar` e a tela inteira reconfigura título, métrica
// principal, gauges, séries oponentes/complementares, mapa de
// execução e categorias — mantendo a estética MONO (branco/preto)
// com cantos rounded-2xl/3xl, pílulas de range e o "+" que
// injeta automaticamente o pilar ativo no Creation Hub.
// =============================================================
import React, { useEffect, useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { ArrowLeft, Plus } from 'lucide-react';
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getPillar } from '../../pillars';
import type { PillarKey } from '../../types';
import { getAspectDashboard } from '../../../../services/lifeOs';
import { Card } from '../primitives/Card';
import { MiniGauge } from '../primitives/MiniGauge';
import { SectionHeader } from '../primitives/SectionHeader';
import { StatRow } from '../primitives/StatRow';
import { ExecutionMap } from '../charts/ExecutionMap';
import { CategoryBars } from '../charts/CategoryBars';
import { CreationHub } from '../creation/CreationHub';
import {
  pillarConfigData,
  type AspectDashboard,
  type SeriesPair,
} from './pillarConfigData';
import { mockOrvaxState, getPillarState } from '../../state/mockOrvaxState';

// =============================================================
// Fallback · constrói um AspectDashboard a partir do
// mockOrvaxState quando a RPC não tem dados ainda.
// Garante que o Deep Dive de cada pilar mostre exatamente os
// mesmos números da aba Métricas (single source of truth).
// =============================================================
function mockAspectFallback(pillarKey: PillarKey, days: number): AspectDashboard {
  const st = getPillarState(pillarKey);
  const slice = st.heat365.slice(-days);
  const total = slice.reduce((s, p) => s + p.c, 0);
  const base: AspectDashboard = {
    range:   {
      since: slice[0]?.d ?? '',
      until: slice[slice.length - 1]?.d ?? '',
      days,
    },
    series:  slice.map((h) => ({ d: h.d, c: h.c })),
    counts:  { total_registros: total, active_days: slice.filter(p => p.c > 0).length },
    related: [],
  };
  if (pillarKey === 'finance') {
    const f = mockOrvaxState.finance.snapshot;
    base.finance = { income: f.totalIncome, expense: f.totalExpense, balance: f.balance, n_tx: f.txCount };
  }
  if (pillarKey === 'health') {
    base.body      = { latest_weight: 78,   delta_period: -0.4, n_logs: 12 };
    base.nutrition = { avg_calories: 2100,  total_logs:   22   };
  }
  if (pillarKey === 'productivity') {
    base.tasks  = { tasks_done: 48, tasks_total: 62 };
    base.habits = { habits_count: 6, logs_period: 108 };
  }
  if (pillarKey === 'mind') {
    base.habits = { habits_count: 3, logs_period: 86 };
  }
  return base;
}

type Range = 30 | 90 | 365;

interface Props {
  activePillar: PillarKey;
  onBack:       () => void;
}

const RANGE_LABEL: Record<Range, string> = {
  30:  '30 DIAS',
  90:  '90 DIAS',
  365: '1 ANO',
};

const LucideIcon = (name: string): React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> => {
  const anyIcons = LucideIcons as unknown as Record<string, any>;
  return (anyIcons[name] as any) || (LucideIcons.Circle as any);
};

// -------------------------------------------------------------
// Componente principal
// -------------------------------------------------------------
export function UniversalDeepDivePanel({ activePillar, onBack }: Props) {
  const pillar = getPillar(activePillar);
  const cfg    = pillarConfigData[activePillar];
  const Icon   = LucideIcon(pillar.icon);

  const [range, setRange]       = useState<Range>(30);
  const [raw, setRaw]           = useState<AspectDashboard | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [reloadKey, setReloadKey]     = useState(0);

  // -----------------------------------------------------------
  // Data fetch via RPC genérica
  // -----------------------------------------------------------
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getAspectDashboard(pillar.aspectKey, range)
      .then((d) => { if (alive) setRaw(d as AspectDashboard); })
      .catch((e) => { if (alive) setError(e?.message || 'Falha ao carregar'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [pillar.aspectKey, range, reloadKey]);

  // -----------------------------------------------------------
  // SINCRONIZAÇÃO GLOBAL — se a RPC não devolveu nada, caímos
  // no mockOrvaxState pra manter consistência com a aba Métricas.
  // -----------------------------------------------------------
  const effective: AspectDashboard = useMemo(() => {
    if (raw && raw.series && raw.series.length > 0) return raw;
    return mockAspectFallback(activePillar, range);
  }, [raw, activePillar, range]);

  // -----------------------------------------------------------
  // Derivados de render
  // -----------------------------------------------------------
  const series: SeriesPair[] = useMemo(
    () => cfg.series.build(effective),
    [effective, cfg]
  );

  const categories = useMemo(() => {
    if (!cfg.categories) return [];
    return cfg.categories(effective)
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [effective, cfg]);

  const heatCells = useMemo(() => {
    if (!effective?.series) return [];
    return effective.series.map((p) => ({ d: p.d, c: p.c }));
  }, [effective]);

  const mainValue    = cfg.mainMetric.format(effective);
  const mainSublabel = cfg.mainMetric.sublabel ? cfg.mainMetric.sublabel(effective) : null;

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* ================== HEADER ================== */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/85 dark:bg-zinc-950/85 border-b border-zinc-200 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-[0_6px_14px_-6px_rgba(0,0,0,0.3)]">
              <Icon size={17} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[11px] font-mono font-bold uppercase tracking-[0.22em] leading-none truncate">
                {cfg.title}
              </h1>
              <p className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 tracking-wider mt-0.5 truncate">
                {cfg.subtitle}
              </p>
            </div>
          </div>

          {/* range selector pílula */}
          <div className="hidden sm:flex items-center gap-0.5 rounded-full border border-zinc-200 dark:border-white/10 p-1 bg-zinc-50/60 dark:bg-white/[0.02]">
            {([30, 90, 365] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={[
                  'px-3 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-wider transition-all',
                  r === range
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.3)]'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100',
                ].join(' ')}
              >
                {r === 365 ? '1A' : `${r}D`}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCreatorOpen(true)}
            className="h-10 px-4 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-mono font-bold tracking-widest hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.35)]"
          >
            <Plus size={14} strokeWidth={2.6} />
            <span className="hidden sm:inline">{cfg.createCta}</span>
          </button>
        </div>

        {/* mobile range */}
        <div className="sm:hidden px-4 pb-3 flex items-center gap-1.5 overflow-x-auto">
          {([30, 90, 365] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={[
                'px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-wider shrink-0 transition-all',
                r === range
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.3)]'
                  : 'border border-zinc-200 dark:border-white/10 text-zinc-500',
              ].join(' ')}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </header>

      {/* ================== BODY ================== */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5 pb-32">
        {error && (
          <Card padding="md" className="border-zinc-300 dark:border-white/20">
            <p className="text-[11px] font-mono text-zinc-900 dark:text-zinc-100">! {error}</p>
          </Card>
        )}

        {/* ========== HERO · métrica principal + 2 gauges ========== */}
        <Card hero padding="lg">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500">
                {cfg.mainMetric.label}
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[36px] font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
                  {mainValue}
                </span>
              </div>
              {mainSublabel && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
                  {mainSublabel}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {cfg.gauges.map((g, i) => (
                <MiniGauge
                  key={i}
                  value={raw ? g.compute(raw) : 0}
                  label={g.label}
                  hint={g.hint}
                  display={raw && g.display ? g.display(raw) : undefined}
                />
              ))}
            </div>
          </div>
        </Card>

        {/* ========== SÉRIES OPONENTES/COMPLEMENTARES ========== */}
        <Card padding="md">
          <SectionHeader
            title={`${cfg.series.labelA} vs ${cfg.series.labelB}`}
            subtitle={`evolução diária · ${range} dias`}
            right={
              <div className="flex items-center gap-3 text-[10px] font-mono opacity-70">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-px bg-current" /> {cfg.series.labelA.toUpperCase()}
                </span>
                <span className="flex items-center gap-1.5 opacity-75">
                  <span className="w-4 border-t border-dashed border-current" /> {cfg.series.labelB.toUpperCase()}
                </span>
              </div>
            }
          />
          {loading ? (
            <SkeletonBlock h={240} />
          ) : (
            <DualSeriesArea data={series} labelA={cfg.series.labelA} labelB={cfg.series.labelB} />
          )}
        </Card>

        {/* ========== EXECUTION MAP ========== */}
        <Card padding="md">
          <SectionHeader
            title="Mapa de Execução"
            subtitle={`densidade de registros · ${range} dias`}
            right={
              <span className="text-[9px] font-mono tracking-wider text-zinc-500">
                HEATMAP
              </span>
            }
          />
          {loading ? (
            <SkeletonBlock h={140} />
          ) : (
            <ExecutionMap cells={heatCells} range={range === 365 ? 365 : range === 90 ? 90 : 30} />
          )}
        </Card>

        {/* ========== CATEGORIAS ========== */}
        {cfg.categories && (
          <Card padding="md">
            <SectionHeader
              title="Distribuição por tipo"
              subtitle="onde sua energia se concentra"
              right={
                <span className="text-[9px] font-mono tracking-wider text-zinc-500">
                  {categories.length} TIPOS
                </span>
              }
            />
            {loading ? (
              <SkeletonBlock h={160} />
            ) : categories.length === 0 ? (
              <p className="text-[11px] font-mono text-zinc-500 py-6 text-center">
                ainda sem registros no período
              </p>
            ) : (
              <CategoryBars
                data={categories}
                valueFormatter={(v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              />
            )}
          </Card>
        )}

        {/* ========== ESTATÍSTICAS-CHAVE ========== */}
        <Card padding="md">
          <SectionHeader title="Estatísticas-chave" subtitle="o que os dados dizem" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <div>
              <StatRow
                label="DIAS ATIVOS"
                value={raw ? (raw.series || []).filter((p) => (p.c || 0) > 0).length : 0}
                hint={`de ${raw?.range?.days ?? range}`}
              />
              <StatRow
                label="TOTAL DE REGISTROS"
                value={raw ? (raw.series || []).reduce((s, p) => s + (p.c || 0), 0) : 0}
              />
              <StatRow
                label="PICO DIÁRIO"
                value={raw ? Math.max(0, ...(raw.series || []).map((p) => p.c || 0)) : 0}
                hint="maior dia"
              />
            </div>
            <div>
              <StatRow
                label="MÉDIA DIÁRIA"
                value={
                  raw && raw.range?.days
                    ? ((raw.series || []).reduce((s, p) => s + (p.c || 0), 0) / raw.range.days).toFixed(1)
                    : '—'
                }
              />
              <StatRow
                label="PILAR"
                value={pillar.short}
              />
              <StatRow
                label="FONTES DE DADOS"
                value={raw?.counts ? Object.keys(raw.counts).length : 0}
                hint="tabelas envolvidas"
              />
            </div>
          </div>
        </Card>

        {/* ========== ATIVIDADE RECENTE ========== */}
        <section>
          <SectionHeader
            title="Atividade recente"
            subtitle={`${raw?.related?.length || 0} no período`}
          />
          {loading ? (
            <SkeletonBlock h={120} />
          ) : !raw?.related?.length ? (
            <Card padding="lg" className="text-center">
              <p className="text-[11px] font-mono text-zinc-500">
                nenhum registro — clique em "{cfg.createCta}"
              </p>
            </Card>
          ) : (
            <Card padding="none" className="overflow-hidden">
              <div className="divide-y divide-zinc-200 dark:divide-white/5">
                {raw.related.slice(0, 12).map((r) => (
                  <div
                    key={`${r.source_table}-${r.source_id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200">
                      <Icon size={14} strokeWidth={2.4} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-mono font-semibold truncate">
                        {r.source_table.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[9px] font-mono text-zinc-500 tracking-wider uppercase">
                        {new Date(r.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>
      </div>

      {/* ================== CREATION HUB ================== */}
      <CreationHub
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onCreated={() => setReloadKey((k) => k + 1)}
        defaultPillar={activePillar}
      />
    </div>
  );
}

export default UniversalDeepDivePanel;

// =============================================================
// Subcomponentes locais
// =============================================================
function SkeletonBlock({ h = 200 }: { h?: number }) {
  return (
    <div
      className="w-full rounded-2xl bg-zinc-100 dark:bg-white/5 animate-pulse"
      style={{ height: h }}
    />
  );
}

// -------------------------------------------------------------
// DualSeriesArea · versão mono e agnóstica ao pilar.
// Série A em tinta sólida + preenchimento; série B tracejada.
// -------------------------------------------------------------
function DualSeriesArea({
  data, labelA, labelB, height = 240,
}: {
  data: SeriesPair[];
  labelA: string;
  labelB: string;
  height?: number;
}) {
  if (!data.length) {
    return (
      <div className="py-10 text-center text-[10px] font-mono text-zinc-500">
        sem dados suficientes pro período
      </div>
    );
  }
  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  return (
    <div style={{ width: '100%', height }} className="text-zinc-900 dark:text-zinc-100">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="univ-grad-a" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="currentColor" stopOpacity={0.34} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="univ-grad-b" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="currentColor" stopOpacity={0.12} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0.00} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="currentColor" strokeOpacity={0.06} vertical={false} />

          <XAxis
            dataKey="d"
            tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'currentColor', opacity: 0.45 }}
            tickFormatter={(v: string) => {
              const d = new Date(v + 'T00:00:00');
              return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            }}
            minTickGap={28}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'currentColor', opacity: 0.45 }}
            tickFormatter={fmt}
            axisLine={false}
            tickLine={false}
            width={44}
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
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
            }}
            labelFormatter={(v: string) =>
              new Date(v + 'T00:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'short', year: 'numeric',
              })
            }
            formatter={(v: number, k: string) => [fmt(v), k === 'a' ? labelA : labelB]}
          />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontFamily: 'monospace', fontSize: 10, opacity: 0.7 }}
            formatter={(v) => (v === 'a' ? labelA : labelB).toUpperCase()}
          />
          <Area
            type="natural"
            dataKey="a"
            name="a"
            stroke="currentColor"
            strokeOpacity={0.9}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="url(#univ-grad-a)"
          />
          <Area
            type="natural"
            dataKey="b"
            name="b"
            stroke="currentColor"
            strokeOpacity={0.5}
            strokeWidth={1.1}
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="url(#univ-grad-b)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
