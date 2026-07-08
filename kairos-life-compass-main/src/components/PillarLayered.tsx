import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronLeft, TrendingDown, TrendingUp, Zap, AlertTriangle, Target,
  Activity, Calendar, Filter, Download, MoreHorizontal, ArrowRight, Minus,
} from "lucide-react";
import type { PillarData } from "@/lib/data-engine";
import { CountUp } from "./viz/CountUp";
import { Sparkline } from "./viz/Sparkline";
import { Radar } from "./viz/Radar";
import { ExecutionTimeline } from "./viz/ExecutionTimeline";
import { Heatmap } from "./viz/Heatmap";
import { LineArea } from "./viz/LineArea";
import { Scatter } from "./viz/Scatter";
import { Sankey } from "./viz/Sankey";

type Layer = "operacional" | "estrategico";
type Period = "hoje" | "7d" | "30d";

const statusColor = (s: PillarData["status"]) =>
  s === "critico" ? "var(--destructive)" : s === "atencao" ? "var(--warning)" : "var(--success)";

const statusLabel = (s: PillarData["status"]) =>
  s === "critico" ? "Crítico" : s === "atencao" ? "Atenção" : "Saudável";

export function PillarLayered({ data }: { data: PillarData }) {
  const [layer, setLayer] = useState<Layer>("operacional");
  const [period, setPeriod] = useState<Period>("hoje");

  return (
    <div className={`pillar-${data.config.slug} min-h-screen`}>
      <DashboardHeader data={data} layer={layer} period={period} setPeriod={setPeriod} setLayer={setLayer} />
      {layer === "operacional"
        ? <OperationalDashboard data={data} period={period} onSwitch={() => setLayer("estrategico")} />
        : <StrategicDashboard data={data} onBack={() => setLayer("operacional")} />}
    </div>
  );
}

/* ──────────────────── HEADER (estilo Power BI ribbon) ──────────────────── */
function DashboardHeader({
  data, layer, period, setPeriod, setLayer,
}: {
  data: PillarData; layer: Layer; period: Period;
  setPeriod: (p: Period) => void; setLayer: (l: Layer) => void;
}) {
  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border">
      {/* Top row: breadcrumb + actions */}
      <div className="px-4 md:px-6 h-12 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition flex items-center gap-1.5">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">Pilares</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-pillar shrink-0" />
            <span className="text-sm font-medium truncate">{data.config.name}</span>
            <span className="text-xs text-muted-foreground hidden md:inline truncate">· {data.config.tagline}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn label="Filtros"><Filter className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn label="Exportar"><Download className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn label="Mais"><MoreHorizontal className="w-3.5 h-3.5" /></IconBtn>
        </div>
      </div>

      {/* Second row: layer tabs + period slicer */}
      <div className="px-4 md:px-6 h-11 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        <Tabs
          value={layer}
          onChange={setLayer}
          options={[
            { id: "operacional", label: "Operacional", sub: "DIA · SEMANA" },
            { id: "estrategico", label: "Estratégico", sub: "MÊS · ANO" },
          ]}
        />
        <Slicer
          value={period}
          onChange={setPeriod}
          options={[
            { id: "hoje", label: "Hoje" },
            { id: "7d", label: "7 dias" },
            { id: "30d", label: "30 dias" },
          ]}
        />
      </div>
    </header>
  );
}

function IconBtn({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button className="h-7 w-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground transition" title={label}>
      {children}
    </button>
  );
}

function Tabs<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { id: T; label: string; sub?: string }[];
}) {
  return (
    <div className="flex items-center gap-0">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`relative px-3 h-11 text-sm transition ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <span className="font-medium">{o.label}</span>
            {o.sub && <span className="hidden md:inline text-[10px] text-muted-foreground ml-1.5 tracking-wider">{o.sub}</span>}
            {active && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pillar" />}
          </button>
        );
      })}
    </div>
  );
}

function Slicer<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { id: T; label: string }[];
}) {
  return (
    <div className="flex items-center gap-0.5 border border-border rounded-md p-0.5 shrink-0">
      <Calendar className="w-3 h-3 text-muted-foreground mx-1.5 shrink-0" />
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`px-2.5 h-6 text-[11px] rounded transition tabular ${active ? "bg-foreground text-background font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────── OPERATIONAL DASHBOARD ──────────────────── */
function OperationalDashboard({ data, period, onSwitch }: { data: PillarData; period: Period; onSwitch: () => void }) {
  // Slice dataset por período
  const periodWindow = period === "hoje" ? 1 : period === "7d" ? 7 : 30;
  const trendData = period === "30d" ? data.evolution30 : period === "7d" ? data.week : data.evolution30.slice(-1);

  return (
    <div className="max-w-[1600px] mx-auto p-3 md:p-4 space-y-3 animate-[fade-in_0.4s_ease-out]">
      {/* ─── ROW 1 · KPI strip (4 cards) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Score atual"
          value={data.score}
          unit="/100"
          delta={data.delta7}
          deltaLabel="vs 7d"
          status={data.status}
          spark={data.sparkline}
          big
        />
        <KpiCard
          label="Foco hoje"
          value={data.productiveHours}
          unit="h"
          delta={data.productiveHours - data.distractionHours}
          deltaLabel="vs distração"
          indicator={data.productiveHours >= data.distractionHours ? "positive" : "negative"}
        />
        <KpiCard
          label="Distração"
          value={data.distractionHours}
          unit="h"
          delta={-data.distractionHours}
          deltaLabel="custo do dia"
          indicator="negative"
        />
        <KpiCard
          label="Consistência"
          value={data.weekConsistency}
          unit="/100"
          deltaLabel={`pico às ${data.peakHour}h`}
          indicator={data.weekConsistency >= 70 ? "positive" : data.weekConsistency >= 50 ? "neutral" : "negative"}
        />
      </div>

      {/* ─── ROW 2 · Execution timeline (full width, hero do dia) ─── */}
      <Card title="Execution Map" subtitle={`24h · ${data.today.length} blocos`} icon={<Activity className="w-3.5 h-3.5" />}>
        <ExecutionTimeline blocks={data.today} />
        <Legend
          items={[
            { color: "var(--success)", label: `Foco · ${data.productiveHours}h` },
            { color: "var(--destructive)", label: `Distração · ${data.distractionHours}h` },
            { color: "var(--surface-2)", label: `Neutro · ${24 - data.productiveHours - data.distractionHours}h` },
          ]}
        />
        <InsightLine text={data.todayInsight} />
      </Card>

      {/* ─── ROW 3 · Tendência + Estado interno (2 colunas no desktop) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card
          title={period === "hoje" ? "Tendência 30d" : period === "7d" ? "Tendência 7d" : "Tendência 30d"}
          subtitle={`Δ${data.delta7 >= 0 ? "+" : ""}${data.delta7} pts em ${periodWindow}d`}
          className="lg:col-span-2"
          right={<TrendBadge trend={data.prediction.trend} />}
        >
          <LineArea data={trendData} height={170} />
          <div className="grid grid-cols-3 gap-3 pt-3 mt-2 border-t border-border">
            <MicroStat label="Tendência" value={`${data.prediction.trend >= 0 ? "+" : ""}${data.prediction.trend}/d`} indicator={data.prediction.trend >= 0 ? "positive" : "negative"} />
            <MicroStat label="Projeção 30d" value={`${data.prediction.projected30}`} />
            <MicroStat label="Best/Worst" value={`${Math.max(...trendData.map(d => d.value))}/${Math.min(...trendData.map(d => d.value))}`} />
          </div>
        </Card>

        <Card title="Estado interno" subtitle={`${data.config.axes.length} eixos`}>
          <Radar axes={data.axesNow} size={240} />
          <AxisRanking axes={data.axesNow} />
        </Card>
      </div>

      {/* ─── ROW 4 · Heatmap + Insight cards ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card title="Heatmap de presença" subtitle="7d × 24h" className="lg:col-span-2">
          <Heatmap cells={data.weekHeat} />
          <InsightLine text={data.weekInsight} />
        </Card>

        <div className="space-y-3">
          <ProblemCard data={data} />
          {data.recurringDistraction && (
            <Card title="Hábito drenante" compact>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-light tabular text-destructive">{data.recurringDistraction.daysAffected}</span>
                <span className="text-xs text-muted-foreground tabular">/7 dias</span>
              </div>
              <div className="text-sm font-medium mt-1 truncate">{data.recurringDistraction.activity}</div>
              <div className="text-xs text-muted-foreground mt-1 tabular">~{data.recurringDistraction.hours}h hoje</div>
            </Card>
          )}
        </div>
      </div>

      {/* ─── ROW 5 · Ações imediatas (3 colunas) ─── */}
      <Card title="Ação imediata" subtitle="Geradas pelo problema principal" icon={<Zap className="w-3.5 h-3.5 text-pillar" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {data.actions.map((a, i) => (
            <div
              key={i}
              className="rounded-md border border-border bg-background p-3 hover:border-pillar transition group cursor-pointer"
              style={{ animation: `slide-up 0.3s ease-out ${i * 50}ms backwards` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-[10px] text-muted-foreground tabular">A{i + 1}</div>
                <div className="text-[10px] text-pillar tabular uppercase tracking-wider">{a.when}</div>
              </div>
              <div className="text-sm font-medium leading-snug">{a.title}</div>
              <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{a.why}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA */}
      <button
        onClick={onSwitch}
        className="w-full rounded-md border border-border bg-surface hover:bg-surface-2 transition px-4 py-3 flex items-center justify-between group"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-md border border-pillar bg-pillar-soft flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-pillar" />
          </div>
          <div>
            <div className="text-sm font-medium">Abrir camada estratégica</div>
            <div className="text-xs text-muted-foreground">Mês · Ano · Padrões · Previsão · A verdade</div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground tabular uppercase tracking-wider group-hover:text-pillar transition">→ Estratégico</span>
      </button>
    </div>
  );
}

/* ──────────────────── STRATEGIC DASHBOARD ──────────────────── */
function StrategicDashboard({ data, onBack }: { data: PillarData; onBack: () => void }) {
  return (
    <div className="max-w-[1600px] mx-auto p-3 md:p-4 space-y-3 animate-[fade-in_0.4s_ease-out]">
      {/* KPI row estratégico */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Score atual" value={data.score} unit="/100" delta={data.delta7} deltaLabel="vs 7d" status={data.status} big />
        <KpiCard label="Projeção 30d" value={data.prediction.projected30} unit="/100" deltaLabel={`${data.prediction.trend >= 0 ? "+" : ""}${data.prediction.trend} pts/d`} indicator={data.prediction.trend >= 0 ? "positive" : "negative"} />
        <KpiCard label="Correlação" value={Math.abs(Math.round(data.scatterCorrelation * 100))} unit="%" deltaLabel={data.config.correlation.label} indicator={Math.abs(data.scatterCorrelation) > 0.6 ? "positive" : "neutral"} />
        <KpiCard label="Eixo crítico" value={Math.min(...data.axesNow.map(a => a.value))} unit="/100" deltaLabel={[...data.axesNow].sort((a, b) => a.value - b.value)[0].label} indicator="negative" />
      </div>

      {/* Evolução grande */}
      <Card title="Evolução · 30 dias" subtitle="Random walk com drift · regressão linear projetada" right={<TrendBadge trend={data.prediction.trend} />}>
        <LineArea data={data.evolution30} height={220} />
      </Card>

      {/* Mapa interno + Impacto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card title="Mapa interno" subtitle="Hoje vs. 30d atrás" className="lg:col-span-2">
          <Radar axes={data.axesNow} axesPast={data.axesPast} size={300} />
          <Legend items={[
            { color: "var(--pillar)", label: "Agora", solid: true },
            { color: "var(--muted-foreground)", label: "30d atrás", dashed: true },
          ]} />
        </Card>
        <Card title="Impacto direto" subtitle="Áreas afetadas">
          <ul className="space-y-2 mt-1">
            {data.config.impacts.map((imp, i) => (
              <li key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-border last:border-0">
                <div className="w-0.5 h-5 bg-pillar rounded-full" />
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Padrões + Fluxo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card title="Padrões de vida" subtitle={data.config.correlation.label}>
          <Scatter
            points={data.scatter}
            xLabel={data.config.correlation.x}
            yLabel={data.config.correlation.y}
            correlation={data.scatterCorrelation}
          />
        </Card>
        <Card title="Fluxo" subtitle="Tempo → Comportamento → Resultado">
          <Sankey nodes={data.sankey.nodes} links={data.sankey.links} />
        </Card>
      </div>

      {/* Previsão */}
      <Card title="Previsão · próximos 30 dias" subtitle="Cenário positivo vs negativo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ScenarioCard kind="positive" text={data.prediction.positive} />
          <ScenarioCard kind="negative" text={data.prediction.negative} />
        </div>
      </Card>

      {/* A verdade */}
      <Card title="A verdade" subtitle="Diagnóstico baseado em dados" icon={<AlertTriangle className="w-3.5 h-3.5 text-pillar" />}>
        <p className="text-lg md:text-xl font-light leading-snug max-w-3xl py-3">
          “{data.truth}”
        </p>
      </Card>

      {/* Direção */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Prioridade" icon={<Target className="w-3.5 h-3.5" />} compact>
          <div className="text-sm font-medium leading-snug mt-1">{data.config.priority}</div>
        </Card>
        <Card title="Hábito chave" icon={<Zap className="w-3.5 h-3.5" />} compact>
          <div className="text-sm font-medium leading-snug mt-1">{data.config.keyHabit}</div>
        </Card>
      </div>

      <button
        onClick={onBack}
        className="w-full rounded-md border border-border bg-surface hover:bg-surface-2 transition px-4 py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar para hoje
      </button>
    </div>
  );
}

/* ──────────────────── BUILDING BLOCKS ──────────────────── */
function Card({
  title, subtitle, icon, right, children, className = "", compact,
}: {
  title: string; subtitle?: string; icon?: React.ReactNode; right?: React.ReactNode;
  children: React.ReactNode; className?: string; compact?: boolean;
}) {
  return (
    <section className={`panel ${compact ? "p-3" : "p-3 md:p-4"} ${className}`}>
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
          <div className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider truncate">{title}</h3>
            {subtitle && <div className="text-[10px] text-muted-foreground tabular truncate">{subtitle}</div>}
          </div>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>
      {children}
    </section>
  );
}

function KpiCard({
  label, value, unit, delta, deltaLabel, status, indicator, spark, big,
}: {
  label: string; value: number; unit?: string;
  delta?: number; deltaLabel?: string;
  status?: PillarData["status"];
  indicator?: "positive" | "negative" | "neutral";
  spark?: number[]; big?: boolean;
}) {
  const color = status ? statusColor(status)
    : indicator === "positive" ? "var(--success)"
    : indicator === "negative" ? "var(--destructive)"
    : undefined;

  return (
    <div className="panel p-3 md:p-4 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        {status && (
          <div className="flex items-center gap-1 text-[10px] tabular uppercase tracking-wider" style={{ color: statusColor(status) }}>
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor(status) }} />
            {statusLabel(status)}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1 mt-2">
        <span className={`${big ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"} font-light tabular leading-none`} style={color ? { color } : undefined}>
          <CountUp value={value} />
        </span>
        {unit && <span className="text-xs text-muted-foreground tabular">{unit}</span>}
      </div>
      {(delta !== undefined || deltaLabel) && (
        <div className="flex items-center gap-1.5 mt-2 text-[11px] tabular">
          {delta !== undefined && (
            <span className="flex items-center gap-0.5" style={{ color: delta > 0 ? "var(--success)" : delta < 0 ? "var(--destructive)" : "var(--muted-foreground)" }}>
              {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {delta > 0 ? "+" : ""}{delta}
            </span>
          )}
          {deltaLabel && <span className="text-muted-foreground truncate">{deltaLabel}</span>}
        </div>
      )}
      {spark && (
        <div className="mt-3 -mx-1">
          <Sparkline data={spark} height={32} />
        </div>
      )}
    </div>
  );
}

function MicroStat({ label, value, indicator }: { label: string; value: string; indicator?: "positive" | "negative" }) {
  const color = indicator === "positive" ? "var(--success)" : indicator === "negative" ? "var(--destructive)" : undefined;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm tabular mt-0.5 font-medium" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string; solid?: boolean; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground tabular">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          {it.dashed
            ? <span className="w-3 border-t border-dashed" style={{ borderColor: it.color }} />
            : <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: it.color }} />}
          {it.label}
        </span>
      ))}
    </div>
  );
}

function InsightLine({ text }: { text: string }) {
  return (
    <div className="mt-3 pt-3 border-t border-border flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
      <div className="w-0.5 self-stretch bg-pillar rounded-full" />
      <p className="flex-1">{text}</p>
    </div>
  );
}

function TrendBadge({ trend }: { trend: number }) {
  const positive = trend >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center gap-1 px-2 h-6 rounded-md border tabular text-[11px]"
      style={{ borderColor: positive ? "var(--success)" : "var(--destructive)", color: positive ? "var(--success)" : "var(--destructive)" }}>
      <Icon className="w-3 h-3" />
      {positive ? "+" : ""}{trend}/d
    </div>
  );
}

function AxisRanking({ axes }: { axes: { label: string; value: number }[] }) {
  const sorted = [...axes].sort((a, b) => b.value - a.value);
  return (
    <div className="mt-3 pt-3 border-t border-border space-y-1.5">
      {sorted.map((a, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground tabular w-3">{i + 1}</span>
          <span className="flex-1 truncate">{a.label}</span>
          <div className="w-16 h-1 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-pillar" style={{ width: `${a.value}%` }} />
          </div>
          <span className="tabular text-muted-foreground w-7 text-right">{a.value}</span>
        </div>
      ))}
    </div>
  );
}

function ProblemCard({ data }: { data: PillarData }) {
  return (
    <div className="panel p-3 md:p-4 border-l-2" style={{ borderLeftColor: "var(--destructive)" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <AlertTriangle className="w-3 h-3 text-destructive" />
        <div className="text-[10px] uppercase tracking-wider text-destructive font-semibold">Problema principal</div>
      </div>
      <div className="text-sm font-semibold leading-snug">{data.problem.title}</div>
      <div className="text-xs mt-2 leading-relaxed">{data.problem.cause}</div>
    </div>
  );
}

function ScenarioCard({ kind, text }: { kind: "positive" | "negative"; text: string }) {
  const color = kind === "positive" ? "var(--success)" : "var(--destructive)";
  const Icon = kind === "positive" ? TrendingUp : TrendingDown;
  const label = kind === "positive" ? "Se continuar assim" : "Se nada mudar";
  return (
    <div className="rounded-md border border-border bg-background p-3 border-l-2" style={{ borderLeftColor: color }}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3" style={{ color }} />
        <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color }}>{label}</div>
      </div>
      <p className="text-sm mt-2 leading-snug">{text}</p>
    </div>
  );
}
