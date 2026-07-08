// =============================================================
// ORVAX · Life OS — Finance Deep Dive (Módulo 3)
// Redesign MONOCROMÁTICO. Sem verde/vermelho nos números ou
// gráficos. Delta semântico continua (▲▼). Transações usam
// marca gráfica (+/−) ao invés de cor.
// =============================================================
import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Plus, Wallet, Flame, Target,
  ArrowUpRight, ArrowDownRight, Trash2,
} from 'lucide-react';
import { useFinanceData } from '../../hooks/useFinanceData';
import { useXpAward } from '../../hooks/useXpAward';
import { addGoalProgress } from '../../services/finance';
import { supabase } from '../../../../lib/supabase';
import { mockOrvaxState, ORVAX_ACCENT } from '../../state/mockOrvaxState';
import { Card } from '../primitives/Card';
import { KpiTile } from '../primitives/KpiTile';
import { StatRow } from '../primitives/StatRow';
import { SectionHeader } from '../primitives/SectionHeader';
import { ExecutionMap } from '../charts/ExecutionMap';
import { IncomeExpenseArea } from '../charts/IncomeExpenseArea';
import { CategoryBars } from '../charts/CategoryBars';
import { EvolutionLine } from '../charts/EvolutionLine';
import { CreationHub } from '../creation/CreationHub';
import { MiniGauge } from '../primitives/MiniGauge';
import type { FinancialGoal, SeriesPoint } from '../../types';

const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtBRLfull = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number) => `${Math.round(n * 100)}%`;

// tinta do tema usada como "accent" dos gráficos que herdam currentColor
const INK = 'currentColor';

type Range = 30 | 90 | 180 | 365;

interface Props {
  onBack: () => void;
}

export function FinanceDeepDive({ onBack }: Props) {
  const [range, setRange] = useState<Range>(30);
  const live = useFinanceData(range);
  // -----------------------------------------------------------
  // SINCRONIZAÇÃO GLOBAL — quando o Supabase ainda não devolveu
  // dados (ou não há nada persistido), caímos no mockOrvaxState
  // para que este Deep Dive mostre EXATAMENTE os mesmos números
  // exibidos na aba Métricas (ex: saldo R$ 10.450,20).
  // -----------------------------------------------------------
  const snapshot     = live.snapshot     ?? mockOrvaxState.finance.snapshot;
  const goals        = live.goals.length        ? live.goals        : mockOrvaxState.finance.goals;
  const transactions = live.transactions.length ? live.transactions : mockOrvaxState.finance.transactions;
  // ⚠️  SINCRONIZAÇÃO: snapshot é *sempre* definido (via mock fallback), portanto nunca
  // exibimos skeleton — o mock renderiza imediatamente enquanto o Supabase carrega em background.
  // Quando dados reais chegarem (live.snapshot !== null) eles substituem o mock silenciosamente.
  const loading    = live.loading && live.snapshot === null && !mockOrvaxState.finance.snapshot;
  const { error, reload, setPeriod } = live;
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorKind, setCreatorKind] = useState<'transaction' | 'goal'>('transaction');
  const awardXp = useXpAward();

  const handleRange = (r: Range) => {
    setRange(r);
    setPeriod(r);
  };

  const ieDataset = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.incomeSeries.map((p, i) => ({
      d: p.d,
      income: p.v,
      expense: snapshot.expenseSeries[i]?.v || 0,
    }));
  }, [snapshot]);

  const balanceSeries: SeriesPoint[] = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.byDay;
  }, [snapshot]);

  const catDataset = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.topCategories.map((c) => ({ label: c.category, value: c.total }));
  }, [snapshot]);

  // Weekday distribution (padrão comportamental)
  const weekdayDistribution = useMemo(() => {
    if (!snapshot?.byDay?.length) return [];
    const WD = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const sums = [0, 0, 0, 0, 0, 0, 0];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const p of snapshot.byDay) {
      const wd = new Date(p.d + 'T00:00:00').getDay();
      sums[wd] += p.v;
      if (p.v !== 0) counts[wd]++;
    }
    return WD.map((label, i) => ({
      label,
      value: Math.abs(sums[i]),
      signed: sums[i],
      days: counts[i],
    }));
  }, [snapshot]);

  const deleteTx = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    reload();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* HEADER */}
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
              <Wallet size={17} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[11px] font-mono font-bold uppercase tracking-[0.22em] leading-none">
                Finanças · Deep Dive
              </h1>
              <p className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 tracking-wider mt-0.5">
                receitas · despesas · metas · patrimônio
              </p>
            </div>
          </div>

          {/* range selector — pílula orgânica */}
          <div className="hidden sm:flex items-center gap-0.5 rounded-full border border-zinc-200 dark:border-white/10 p-1 bg-zinc-50/60 dark:bg-white/[0.02]">
            {([30, 90, 180, 365] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => handleRange(r)}
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
            onClick={() => { setCreatorKind('transaction'); setCreatorOpen(true); }}
            className="h-10 px-4 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-mono font-bold tracking-widest hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.35)]"
          >
            <Plus size={14} strokeWidth={2.6} />
            <span className="hidden sm:inline">NOVA ENTRADA</span>
          </button>
        </div>

        {/* mobile range */}
        <div className="sm:hidden px-4 pb-3 flex items-center gap-1.5 overflow-x-auto">
          {([30, 90, 180, 365] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => handleRange(r)}
              className={[
                'px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-wider shrink-0 transition-all',
                r === range
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.3)]'
                  : 'border border-zinc-200 dark:border-white/10 text-zinc-500',
              ].join(' ')}
            >
              {r === 365 ? '1 ANO' : `${r} DIAS`}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5 pb-32">
        {error && (
          <Card padding="md" className="border-zinc-300 dark:border-white/20">
            <p className="text-[11px] font-mono text-zinc-900 dark:text-zinc-100">! {error}</p>
          </Card>
        )}

        {/* ========== 0) HERO GAUGES — Saldo + metas rápidas ========== */}
        {snapshot && (
          <Card hero padding="lg">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500">
                  Saldo total
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-[36px] font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
                    {fmtBRL(snapshot.balance)}
                  </span>
                  {snapshot.deltaPct != null && (
                    <span className="text-[11px] font-mono text-zinc-500">
                      {snapshot.deltaPct >= 0 ? '+' : ''}{snapshot.deltaPct}% vs anterior
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
                  últimos {snapshot.periodDays} dias · {snapshot.txCount} lançamentos
                </p>
              </div>
              <div className="flex items-center gap-4">
                <MiniGauge
                  value={Math.round(snapshot.savingsRate * 100)}
                  label="Poupança"
                  hint="meta: 20%"
                />
                <MiniGauge
                  value={Math.min(100, Math.round((snapshot.streakDays / 30) * 100))}
                  label="Consistência"
                  display={`${snapshot.streakDays}d`}
                  hint="streak 30d"
                />
              </div>
            </div>
          </Card>
        )}

        {/* ========== 1) KPI HERO — MONO ========== */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile
            big
            label="SALDO"
            value={snapshot ? fmtBRL(snapshot.balance) : '—'}
            deltaPct={snapshot?.deltaPct ?? null}
            series={balanceSeries}
            hint={snapshot ? `últimos ${snapshot.periodDays} dias` : ''}
          />
          <KpiTile
            label="RECEITA"
            value={snapshot ? fmtBRL(snapshot.totalIncome) : '—'}
            series={snapshot?.incomeSeries}
            hint={snapshot ? `${snapshot.txCount} lançamentos` : ''}
          />
          <KpiTile
            label="DESPESA"
            value={snapshot ? fmtBRL(snapshot.totalExpense) : '—'}
            series={snapshot?.expenseSeries}
            hint={snapshot ? `média ${fmtBRL(snapshot.avgDaily)}/dia` : ''}
          />
          <KpiTile
            label="TAXA DE POUPANÇA"
            value={snapshot ? pct(snapshot.savingsRate) : '—'}
            hint={snapshot && snapshot.savingsRate >= 0.2 ? 'acima da meta (20%)' : 'abaixo da meta'}
          />
        </section>

        {/* ========== 2) INCOME x EXPENSE ========== */}
        <Card padding="md">
          <SectionHeader
            title="Receitas vs Despesas"
            subtitle={`evolução diária · ${range} dias`}
            right={
              <div className="flex items-center gap-3 text-[10px] font-mono opacity-70">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-px bg-current" /> RECEITA
                </span>
                <span className="flex items-center gap-1.5 opacity-75">
                  <span className="w-4 border-t border-dashed border-current" /> DESPESA
                </span>
              </div>
            }
          />
          {loading ? <SkeletonBlock h={240} /> : <IncomeExpenseArea data={ieDataset} />}
        </Card>

        {/* ========== 3) EXECUTION MAP (365d) ========== */}
        <Card padding="md">
          <SectionHeader
            title="Execution Map"
            subtitle="densidade de lançamentos · 365 dias"
            right={
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                <Flame size={11} className="opacity-60" />
                <span>
                  <b className="text-zinc-900 dark:text-zinc-100">{snapshot?.streakDays || 0}</b>d streak
                </span>
              </div>
            }
          />
          {loading ? (
            <SkeletonBlock h={140} />
          ) : (
            <ExecutionMap
              cells={(snapshot?.heatmap || []).map((c) => ({ d: c.d, c: c.c, net: c.net }))}
              accent={INK}
              range={range === 30 ? 30 : range === 90 ? 90 : range === 180 ? 180 : 365}
            />
          )}
        </Card>

        {/* ========== 4) TOP CATEGORIAS ========== */}
        <Card padding="md">
          <SectionHeader
            title="Top Categorias"
            subtitle="onde sua grana vai no período"
            right={
              <span className="text-[9px] font-mono tracking-wider text-zinc-500">
                {catDataset.length} CATEGORIAS
              </span>
            }
          />
          {loading ? <SkeletonBlock h={240} /> : <CategoryBars data={catDataset} />}
        </Card>

        {/* ========== 5) DISTRIBUIÇÃO POR DIA DA SEMANA ========== */}
        <Card padding="md">
          <SectionHeader
            title="Padrão Semanal"
            subtitle="volume financeiro por dia da semana"
            right={
              <span className="text-[9px] font-mono tracking-wider text-zinc-500">
                COMPORTAMENTO
              </span>
            }
          />
          {loading ? (
            <SkeletonBlock h={150} />
          ) : (
            <WeekdayBars data={weekdayDistribution} />
          )}
        </Card>

        {/* ========== 6) STATS KEY ========== */}
        <Card padding="md">
          <SectionHeader title="Estatísticas-chave" subtitle="descobertas sobre seu comportamento" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <div>
              <StatRow label="SEQUÊNCIA DE REGISTRO" value={`${snapshot?.streakDays || 0} dias`} hint="streak" />
              <StatRow label="MELHOR DIA DA SEMANA" value={snapshot?.bestWeekday.label || '—'} hint={snapshot ? fmtBRL(snapshot.bestWeekday.total) : ''} />
              <StatRow label="LANÇAMENTOS NO PERÍODO" value={snapshot?.txCount || 0} />
            </div>
            <div>
              <StatRow label="MÉDIA DIÁRIA (FLUXO)" value={snapshot ? fmtBRL(snapshot.avgDaily) : '—'} />
              <StatRow label="MAIOR CATEGORIA" value={snapshot?.topCategories[0]?.category?.toUpperCase() || '—'} hint={snapshot ? fmtBRL(snapshot.topCategories[0]?.total || 0) : ''} />
              <StatRow label="TAXA DE POUPANÇA" value={snapshot ? pct(snapshot.savingsRate) : '—'} />
            </div>
          </div>
        </Card>

        {/* ========== 7) METAS ========== */}
        <section>
          <SectionHeader
            title="Metas Financeiras"
            subtitle={`${goals.length} ativa${goals.length === 1 ? '' : 's'}`}
            right={
              <button
                onClick={() => { setCreatorKind('goal'); setCreatorOpen(true); }}
                className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1"
              >
                <Plus size={12} /> NOVA META
              </button>
            }
          />
          {goals.length === 0 ? (
            <Card padding="lg" className="text-center">
              <Target size={18} className="mx-auto mb-2 opacity-40" />
              <p className="text-[11px] font-mono text-zinc-500">
                nenhuma meta ainda — clique em "Nova Meta" acima pra criar (ex: "Viagem final de ano")
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {goals.map((g) => (
                <GoalCard key={g.id} goal={g}
                  onProgress={async (amt) => {
                    await addGoalProgress(g.id, amt);
                    await awardXp({ amount: 10, reason: 'goal:progress', pillar: 'finance' });
                    reload();
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* ========== 8) ÚLTIMAS TRANSAÇÕES ========== */}
        <section>
          <SectionHeader
            title="Últimas Transações"
            subtitle={`${transactions.length} no período`}
          />
          {loading ? (
            <SkeletonBlock h={120} />
          ) : transactions.length === 0 ? (
            <Card padding="lg" className="text-center">
              <p className="text-[11px] font-mono text-zinc-500">sem lançamentos — clique em "Nova Entrada"</p>
            </Card>
          ) : (
            <Card padding="none" className="overflow-hidden">
              <div className="divide-y divide-zinc-200 dark:divide-white/5">
                {transactions.slice(0, 12).map((t) => {
                  const isIn = t.type === 'income';
                  const Icon = isIn ? ArrowUpRight : ArrowDownRight;
                  return (
                    <div
                      key={t.id}
                      className="group flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200">
                        <Icon size={14} strokeWidth={2.4} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-mono font-semibold truncate">
                          {t.description || t.category || 'Transação'}
                        </p>
                        <p className="text-[9px] font-mono text-zinc-500 tracking-wider uppercase">
                          {t.category || '—'} · {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span
                        className="text-[12px] font-mono font-bold tabular-nums"
                        style={{ color: isIn ? ORVAX_ACCENT : '#94a3b8' /* slate-400 · cinza-azul */ }}
                      >
                        {isIn ? '+' : '−'}{fmtBRLfull(Number(t.amount))}
                      </span>
                      <button
                        onClick={() => deleteTx(t.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 p-1 transition-opacity"
                        aria-label="excluir"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </section>
      </div>

      {/* CREATION HUB */}
      <CreationHub
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onCreated={() => reload()}
        defaultPillar="finance"
        defaultKind={creatorKind}
      />
    </div>
  );
}

// -------------------------------------------------------------
// Subcomponentes
// -------------------------------------------------------------
function SkeletonBlock({ h = 200 }: { h?: number }) {
  return (
    <div className="w-full rounded-2xl bg-zinc-100 dark:bg-white/5 animate-pulse"
      style={{ height: h }} />
  );
}

// WeekdayBars — mono (tinta única) + destaque de pico
function WeekdayBars({
  data,
}: {
  data: Array<{ label: string; value: number; signed: number; days: number }>;
}) {
  if (!data.length) {
    return (
      <p className="text-[10px] font-mono text-zinc-500 py-6 text-center">
        sem lançamentos suficientes para detectar padrão
      </p>
    );
  }
  const max = Math.max(1, ...data.map((d) => d.value));
  const best = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);

  return (
    <div className="space-y-2 text-zinc-900 dark:text-zinc-100">
      <div className="grid grid-cols-7 gap-2 h-32 items-end">
        {data.map((d) => {
          const h = Math.max(4, Math.round((d.value / max) * 100));
          const isBest = d.label === best.label && best.value > 0;
          return (
            <div key={d.label} className="flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[8px] font-mono tracking-wider opacity-50">
                {d.days}d
              </span>
              <div
                className="w-full rounded-full transition-all bg-current"
                style={{
                  height: `${h}%`,
                  opacity: isBest ? 0.95 : 0.28,
                }}
                title={fmtBRL(d.value)}
              />
              <span className="text-[9px] font-mono font-bold tracking-wider text-zinc-600 dark:text-zinc-400">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[9px] font-mono tracking-wider text-zinc-500 pt-1 border-t border-zinc-200/60 dark:border-white/10">
        <span>
          PICO · <b className="text-zinc-900 dark:text-zinc-100">{best.label}</b>
        </span>
        <span>{fmtBRL(best.value)}</span>
      </div>
    </div>
  );
}

function GoalCard({ goal, onProgress }: {
  goal: FinancialGoal;
  onProgress: (amt: number) => Promise<void>;
}) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const progress = goal.target_amount > 0
    ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
    : 0;
  const remaining = Math.max(0, goal.target_amount - goal.current_amount);
  const daysLeft = goal.deadline
    ? Math.ceil((+new Date(goal.deadline) - Date.now()) / 86400000)
    : null;

  const series: SeriesPoint[] = useMemo(() => {
    const pts: SeriesPoint[] = [];
    const start = new Date(goal.created_at || new Date().toISOString());
    const today = new Date();
    const span = Math.max(1, Math.ceil((+today - +start) / 86400000));
    for (let i = 0; i <= Math.min(span, 30); i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const t = i / Math.max(span, 1);
      pts.push({
        d: d.toISOString().slice(0, 10),
        v: Math.round(goal.current_amount * t),
      });
    }
    return pts;
  }, [goal]);

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-mono font-bold uppercase tracking-wider truncate">{goal.title}</p>
          <p className="text-[9px] font-mono text-zinc-500 tracking-wider">
            {daysLeft != null
              ? daysLeft > 0 ? `${daysLeft}d restantes` : 'vencida'
              : 'sem prazo'}
          </p>
        </div>
        <span className="text-[14px] font-mono font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
          {progress}%
        </span>
      </div>

      <div className="h-2 rounded-full overflow-hidden bg-zinc-200 dark:bg-white/10">
        <div
          className="h-full rounded-full transition-all bg-zinc-900 dark:bg-zinc-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-mono text-zinc-500">
          <b className="text-zinc-900 dark:text-zinc-100">{fmtBRL(goal.current_amount)}</b> / {fmtBRL(goal.target_amount)}
        </span>
        <span className="text-[10px] font-mono text-zinc-500">
          faltam <b>{fmtBRL(remaining)}</b>
        </span>
      </div>

      <EvolutionLine
        data={series}
        target={goal.target_amount}
        accent={INK}
        height={120}
        valueFormatter={(v) => fmtBRL(v)}
      />

      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/[^0-9.,]/g, ''))}
          placeholder="+ R$ aportar"
          inputMode="decimal"
          className="flex-1 bg-transparent border border-zinc-200 dark:border-white/10 rounded-full px-4 py-2.5 text-[11px] font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white placeholder:text-zinc-400"
        />
        <button
          onClick={async () => {
            const n = Number(input.replace(',', '.'));
            if (!Number.isFinite(n) || n <= 0) return;
            setBusy(true);
            try {
              await onProgress(n);
              setInput('');
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy || !input}
          className="px-4 py-2.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-40 active:scale-95 transition-all"
        >
          {busy ? '…' : 'APORTAR'}
        </button>
      </div>
    </Card>
  );
}
