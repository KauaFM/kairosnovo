// =============================================================
// ORVAX — AspectDetailPage (MONO + humano)
// Dashboard completo de UM aspecto da vida em preto-no-branco.
// Sem cores: só tipografia, espaço, e rótulos em português natural
// pra que uma criança ou um idoso entenda.
//   • Score + interpretação escrita
//   • Evolução (linha)
//   • Frequência semanal
//   • Mapa de equilíbrio do aspecto
//   • Métricas específicas (finanças/nutrição/corpo/tarefas)
//   • Metas ligadas (drilláveis)
//   • Últimos registros
//   • "+" pra criar algo nesse aspecto
// =============================================================
import React, { useEffect, useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { ArrowLeft, Plus, ChevronRight, HelpCircle } from 'lucide-react';
import { getAspectDashboard } from '../../services/lifeOs';
import { supabase } from '../../lib/supabase';
import UniversalCreator from './UniversalCreator';
import GoalDashboard from './GoalDashboard';

const IconOf = (n) => Icons[n] || Icons.Circle;

const fmtBRL = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- Sparkline (mono via currentColor) -------------------------
function Sparkline({ series = [], height = 60 }) {
  if (!series.length) {
    return <div className="text-[10px] font-mono text-zinc-500 py-4 text-center">sem dados ainda</div>;
  }
  const max = Math.max(...series.map(p => p.c), 1);
  const w = 100;
  const step = w / Math.max(series.length - 1, 1);
  const pts = series.map((p, i) => `${i * step},${height - (p.c / max) * (height - 4) - 2}`).join(' ');
  const areaPts = `0,${height} ${pts} ${w},${height}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      className="w-full text-zinc-900 dark:text-zinc-100"
      preserveAspectRatio="none"
    >
      <polygon points={areaPts} fill="currentColor" opacity="0.12" />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// --- Weekday bars (Seg..Dom), MONO --------------------------------
function WeekdayBars({ series = [] }) {
  const labels = ['S','T','Q','Q','S','S','D'];
  const fullLabels = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  const buckets = [0, 0, 0, 0, 0, 0, 0];
  series.forEach(p => {
    const d = new Date(p.d + 'T00:00:00');
    const wd = (d.getDay() + 6) % 7;
    buckets[wd] += p.c;
  });
  const max = Math.max(...buckets, 1);
  const peakIdx = buckets.indexOf(max);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {buckets.map((v, i) => {
        const isPeak = v === max && v > 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
            <div
              className={[
                'w-full rounded-full transition-all',
                v > 0
                  ? (isPeak
                      ? 'bg-zinc-900 dark:bg-zinc-100'
                      : 'bg-zinc-400 dark:bg-zinc-500')
                  : 'bg-zinc-200 dark:bg-white/10',
              ].join(' ')}
              style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? 3 : 1 }}
              title={`${fullLabels[i]}: ${v} registros`}
            />
            <span className={[
              'text-[9px] font-mono font-bold',
              i === peakIdx && v > 0
                ? 'text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500',
            ].join(' ')}>{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// --- Mini Radar (MONO) -----------------------------------------
function MiniRadar({ axes = [] }) {
  const n = axes.length;
  if (n < 3) return null;
  const cx = 50, cy = 50, r = 40;
  const pointAt = (i, val) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = (r * val) / 100;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };
  const outer = axes.map((_, i) => pointAt(i, 100));
  const poly  = axes.map((ax, i) => pointAt(i, ax.value)).map(p => p.join(',')).join(' ');
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full max-w-[220px] mx-auto text-zinc-900 dark:text-zinc-100"
    >
      {[25, 50, 75, 100].map(pct => (
        <polygon
          key={pct}
          points={outer.map((_, i) => pointAt(i, pct).join(',')).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          opacity="0.18"
        />
      ))}
      <polygon points={poly} fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="0.8" />
      {axes.map((ax, i) => {
        const [x, y] = pointAt(i, 112);
        return (
          <text
            key={ax.label}
            x={x} y={y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="5"
            fill="currentColor"
            opacity="0.6"
          >
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}

// --- Métrica card (MONO) ---------------------------------------
function Metric({ label, value, sub, delta }) {
  return (
    <div className="p-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40">
      <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-500 block">
        {label}
      </span>
      <span className="text-[16px] font-bold font-mono text-zinc-900 dark:text-zinc-50 block mt-1">
        {value}
      </span>
      {sub && <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">{sub}</span>}
      {typeof delta === 'number' && (
        <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta)}
        </span>
      )}
    </div>
  );
}

// --- Section wrapper com título + subtítulo amigável -----------
function Section({ title, help, right, children }) {
  return (
    <section className="p-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40">
      <header className="flex items-start justify-between mb-3 gap-3">
        <div>
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          {help && (
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
              {help}
            </p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      {children}
    </section>
  );
}

// --- Score interpretation --------------------------------------
function interpretScore(score) {
  if (score >= 80) return { label: 'EXCELENTE', msg: 'Você está mandando muito bem nessa área.' };
  if (score >= 50) return { label: 'NO CAMINHO', msg: 'Está bom, dá pra subir um pouco mais.' };
  if (score >= 25) return { label: 'ATENÇÃO',    msg: 'Essa área precisa de carinho essa semana.' };
  return { label: 'PARADO', msg: 'Faz tempo que você não cuida disso. Bora começar?' };
}

// --- Main ------------------------------------------------------
export default function AspectDetailPage({ aspect, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const Icon = IconOf(aspect?.icon);

  // Fetch dashboard + metas relacionadas
  useEffect(() => {
    if (!aspect?.key) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const d = await getAspectDashboard(aspect.key, range);
        if (!alive) return;
        setData(d);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: links } = await supabase
            .from('aspect_links')
            .select('source_id')
            .eq('user_id', user.id)
            .eq('aspect_key', aspect.key)
            .eq('source_table', 'goals');
          const ids = (links || []).map(l => l.source_id);
          if (ids.length) {
            const { data: gs } = await supabase
              .from('goals')
              .select('id, title, description, progress, deadline, status')
              .in('id', ids)
              .order('deadline', { ascending: true, nullsFirst: false });
            if (alive) setGoals(gs || []);
          } else {
            setGoals([]);
          }
        }
      } catch (e) {
        console.error('AspectDetail:', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [aspect?.key, range]);

  const score = useMemo(() => {
    const total = (data?.series || []).reduce((s, p) => s + (p.c || 0), 0);
    if (!total) return 0;
    const perDay = total / Math.max(range, 1);
    return Math.min(100, Math.round(perDay * 33));
  }, [data, range]);

  const scoreMeta = interpretScore(score);

  const radarAxes = useMemo(() => {
    const counts = data?.counts || {};
    const entries = Object.entries(counts).slice(0, 6);
    if (entries.length < 3) return [];
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return entries.map(([k, v]) => ({ label: k.slice(0, 6), value: Math.round((v / max) * 100) }));
  }, [data]);

  if (!aspect) return null;

  const counts = data?.counts || {};
  const series = data?.series || [];
  const related = data?.related || [];
  const totalInRange = series.reduce((s, p) => s + (p.c || 0), 0);

  const rangeLabel = range === 365 ? 'último ano' : `últimos ${range} dias`;

  return (
    <div
      className="w-full min-h-screen"
      style={{ backgroundColor: 'var(--bg-color)' }}
    >
      {/* Header MONO */}
      <header
        className="sticky top-0 z-10 border-b border-zinc-200 dark:border-white/10 backdrop-blur-md px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: 'color-mix(in srgb, var(--bg-color) 92%, transparent)' }}
      >
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[13px] font-mono font-bold uppercase tracking-[0.18em] truncate text-zinc-900 dark:text-zinc-100">
            {aspect.label}
          </h1>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
            {aspect.description || 'área da vida'}
          </p>
        </div>
        <button
          onClick={() => setCreatorOpen(true)}
          aria-label="Criar algo novo"
          className="h-9 pl-2.5 pr-3 rounded-full flex items-center gap-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-mono font-bold tracking-wider uppercase hover:opacity-90 active:scale-95 transition-all"
        >
          <Plus size={14} strokeWidth={2.6} />
          Criar
        </button>
      </header>

      <div className="p-4 space-y-4 pb-36">
        {/* Score hero */}
        <section className="p-5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-zinc-900/50 text-center">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
            Como está essa área
          </span>
          <div className="flex items-baseline justify-center gap-1 mt-2">
            <span className="text-[56px] font-bold font-mono leading-none text-zinc-900 dark:text-zinc-50">
              {score}
            </span>
            <span className="text-[14px] font-mono text-zinc-400">/100</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-300 dark:border-white/15 bg-zinc-100/60 dark:bg-white/5">
            <span className="text-[10px] font-mono font-bold tracking-[0.18em] text-zinc-900 dark:text-zinc-100">
              {scoreMeta.label}
            </span>
          </div>
          <p className="text-[12px] text-zinc-600 dark:text-zinc-300 mt-3 leading-snug max-w-xs mx-auto">
            {scoreMeta.msg}
          </p>
        </section>

        {/* Período — MONO botões grandes */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 block mb-2">
            Ver o período
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { d: 7,   label: '7 dias' },
              { d: 30,  label: '30 dias' },
              { d: 90,  label: '3 meses' },
              { d: 365, label: '1 ano' },
            ].map(({ d, label }) => {
              const active = range === d;
              return (
                <button
                  key={d}
                  onClick={() => setRange(d)}
                  className={[
                    'py-2.5 rounded-2xl border text-[10px] font-mono font-bold tracking-wider uppercase transition-all active:scale-95',
                    active
                      ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                      : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-zinc-500 dark:hover:border-white/30',
                  ].join(' ')}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <p className="text-[11px] font-mono text-zinc-500 py-8 text-center">carregando…</p>
        ) : (
          <>
            {/* Evolução */}
            <Section
              title="Evolução"
              help={`Quantos registros por dia nos ${rangeLabel}. Quanto mais alto, mais ativo.`}
              right={
                <div className="text-right">
                  <span className="text-[18px] font-bold font-mono text-zinc-900 dark:text-zinc-100 block leading-none">
                    {totalInRange}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">total</span>
                </div>
              }
            >
              <Sparkline series={series} />
            </Section>

            {/* Frequência semanal */}
            <Section
              title="Dias da semana"
              help="Em quais dias você mais age nessa área. A barra mais alta é o seu dia forte."
              right={<span className="text-[9px] font-mono text-zinc-500">SEG → DOM</span>}
            >
              <WeekdayBars series={series} />
            </Section>

            {/* Mapa de equilíbrio interno */}
            {radarAxes.length >= 3 && (
              <Section
                title="Mapa de equilíbrio"
                help="Cada ponta mostra uma fonte de dados dessa área. Quanto mais pra fora, mais ativa."
              >
                <MiniRadar axes={radarAxes} />
              </Section>
            )}

            {/* Métricas específicas — MONO */}
            {data?.finance && (
              <Section
                title="Dinheiro"
                help="Resumo do que entrou e saiu no período."
              >
                <div className="grid grid-cols-3 gap-2">
                  <Metric label="Entrou" value={fmtBRL(data.finance.income)}  sub="receita" />
                  <Metric label="Saiu"   value={fmtBRL(data.finance.expense)} sub="despesa" />
                  <Metric
                    label="Sobrou"
                    value={fmtBRL(data.finance.balance)}
                    sub={data.finance.balance >= 0 ? 'saldo positivo' : 'saldo negativo'}
                  />
                </div>
              </Section>
            )}
            {data?.nutrition && (
              <Section
                title="Nutrição"
                help="Média do que você registrou comendo."
              >
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Kcal/dia"  value={Math.round(data.nutrition.avg_calories || 0)} sub="média" />
                  <Metric label="Registros" value={data.nutrition.total_logs || 0} sub="no período" />
                </div>
              </Section>
            )}
            {data?.body && (
              <Section
                title="Corpo"
                help="Peso e variação recentes."
              >
                <div className="grid grid-cols-3 gap-2">
                  <Metric label="Peso hoje" value={data.body.latest_weight ? `${data.body.latest_weight} kg` : '—'} />
                  <Metric label="Variação"  value={data.body.delta_period ? `${data.body.delta_period} kg` : '—'} sub="no período" />
                  <Metric label="Registros" value={data.body.n_logs || 0} />
                </div>
              </Section>
            )}
            {data?.tasks && (
              <Section
                title="Tarefas & Hábitos"
                help="Quanto você está fazendo do que planejou."
              >
                <div className="grid grid-cols-2 gap-2">
                  <Metric
                    label="Tarefas feitas"
                    value={`${data.tasks.tasks_done || 0}/${data.tasks.tasks_total || 0}`}
                    sub="concluídas / total"
                  />
                  {data?.habits && (
                    <Metric label="Hábitos ativos" value={data.habits.habits_count || 0} sub="rotinas" />
                  )}
                </div>
              </Section>
            )}

            {/* Distribuição por fonte */}
            <Section
              title="De onde vêm os dados"
              help="Quais tipos de registro mais alimentam essa área."
            >
              {Object.keys(counts).length === 0 ? (
                <p className="text-[11px] font-mono text-zinc-500">sem dados no período</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(counts).map(([src, cnt]) => {
                    const max = Math.max(...Object.values(counts));
                    const pct = Math.round((cnt / max) * 100);
                    return (
                      <div key={src}>
                        <div className="flex justify-between text-[11px] font-mono mb-1">
                          <span className="text-zinc-700 dark:text-zinc-200">{src}</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{cnt}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden bg-zinc-200 dark:bg-white/10">
                          <div
                            className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Metas do aspecto */}
            <Section
              title="Metas dessa área"
              help="Objetivos ligados a esse aspecto. Toque pra abrir o detalhe."
              right={<span className="text-[10px] font-mono text-zinc-500">{goals.length}</span>}
            >
              {goals.length === 0 ? (
                <button
                  onClick={() => setCreatorOpen(true)}
                  className="w-full py-5 rounded-2xl border border-dashed border-zinc-300 dark:border-white/15 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors active:scale-[0.99]"
                >
                  + Criar primeira meta pra {aspect.label}
                </button>
              ) : (
                <div className="space-y-2">
                  {goals.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGoal(g)}
                      className="w-full text-left p-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 hover:border-zinc-500 dark:hover:border-white/30 transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-mono font-bold truncate pr-2 text-zinc-900 dark:text-zinc-100">
                          {g.title}
                        </span>
                        <ChevronRight size={14} className="text-zinc-400 shrink-0" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden bg-zinc-200 dark:bg-white/10">
                          <div
                            className="h-full bg-zinc-900 dark:bg-zinc-100"
                            style={{ width: `${g.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300 w-10 text-right">
                          {g.progress || 0}%
                        </span>
                      </div>
                      {g.deadline && (
                        <span className="text-[10px] font-mono text-zinc-500 mt-1.5 block">
                          prazo: {new Date(g.deadline).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </Section>

            {/* Últimos registros */}
            <Section
              title="Últimos registros"
              help="O que entrou pra essa área recentemente."
            >
              {related.length === 0 ? (
                <p className="text-[11px] font-mono text-zinc-500">sem registros ainda</p>
              ) : (
                <div className="space-y-1.5">
                  {related.map((r, i) => (
                    <div
                      key={`${r.source_table}-${r.source_id}-${i}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40"
                    >
                      <span className="text-[11px] font-mono text-zinc-700 dark:text-zinc-200">
                        {r.source_table}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(r.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>

      {/* Goal detail overlay */}
      {selectedGoal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ backgroundColor: 'var(--bg-color)' }}>
          <GoalDashboard
            goalId={selectedGoal.id}
            color="currentColor"
            aspectLabel={aspect.label}
            onBack={() => setSelectedGoal(null)}
          />
        </div>
      )}

      <UniversalCreator
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onCreated={() => getAspectDashboard(aspect.key, range).then(setData)}
        defaultAspect={aspect.key}
      />
    </div>
  );
}
