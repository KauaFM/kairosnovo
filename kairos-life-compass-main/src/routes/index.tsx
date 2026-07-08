import { createFileRoute, Link } from "@tanstack/react-router";
import { PILLARS } from "@/lib/pillars";
import { getPillarData } from "@/lib/data-engine";
import { getGlobalMetrics } from "@/lib/global-metrics";
import { Sparkline } from "@/components/viz/Sparkline";
import { CountUp } from "@/components/viz/CountUp";
import { RadarGlobal } from "@/components/viz/RadarGlobal";
import { YearHeatmap } from "@/components/viz/YearHeatmap";
import { MultiYearLine } from "@/components/viz/MultiYearLine";
import {
  ChevronRight, TrendingDown, TrendingUp, Plus, Command,
  Layers, Flame, Activity, Trophy, LineChart, Grid3x3, Radar as RadarIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kairos — Inteligência de vida" },
      { name: "description", content: "Sistema de inteligência de vida. Saiba o que fazer hoje e para onde está indo." },
      { property: "og:title", content: "Kairos — Inteligência de vida" },
      { property: "og:description", content: "12 pilares, dois níveis: o que fazer hoje e para onde está indo." },
    ],
  }),
  component: Home,
});

function Home() {
  const cards = PILLARS.map((p) => ({ p, d: getPillarData(p.slug) }));
  const m = getGlobalMetrics();
  const today = new Date();

  return (
    <div className="min-h-screen pb-16">
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/85 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md border border-border flex items-center justify-center">
              <span className="font-mono text-[11px] font-bold tracking-tighter">K</span>
            </div>
            <div className="font-medium text-sm tracking-tight">Kairos</div>
          </div>
          <div className="text-[11px] text-muted-foreground tabular uppercase tracking-wider">
            {today.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
          </div>
        </div>
      </header>

      {/* Quick action — command bar */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <button className="w-full panel-flat px-3 h-11 flex items-center gap-2.5 text-sm text-muted-foreground hover:bg-surface transition active:scale-[0.99]">
          <div className="w-7 h-7 rounded-md bg-surface-2 flex items-center justify-center">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <span className="flex-1 text-left">Criar nova ação, transação ou re...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 h-5 rounded bg-surface-2 border border-border text-[10px] tabular">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* SCORE GERAL — hero */}
      <section className="max-w-3xl mx-auto px-4 pt-6 pb-4 animate-[fade-in_0.5s_ease-out]">
        <div className="flex items-end justify-between gap-4 mb-1">
          <div>
            <div className="label-meta">Score geral · hoje</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-6xl font-light tabular tracking-tight leading-none">
                <CountUp value={m.scoreAvg} />
              </span>
              <span className="text-xl text-muted-foreground tabular">/100</span>
            </div>
          </div>
          <div className={`flex items-center gap-1 text-sm tabular ${m.delta7 >= 0 ? "text-[var(--success)]" : "text-destructive"}`}>
            {m.delta7 >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {m.delta7 >= 0 ? "+" : ""}{m.delta7} <span className="text-muted-foreground text-[11px]">7d</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {m.critical > 0
            ? `${m.critical} ${m.critical === 1 ? "área crítica" : "áreas críticas"} · ${m.rising} pilares em alta`
            : `${m.rising} de ${cards.length} pilares em alta · sistema saudável`}
        </p>
      </section>

      {/* MAPA DE EQUILÍBRIO VITAL — radar 12 pilares */}
      <Section icon={<RadarIcon className="w-3 h-3" />} title="Mapa de equilíbrio vital" meta={`${cards.length} pilares · 7d`}>
        <div className="px-1">
          <RadarGlobal axes={m.balance} size={300} />
        </div>
        <div className="flex items-center justify-center gap-5 pt-2 label-meta">
          <span className="flex items-center gap-1.5">
            <span className="w-3 border-t border-dashed border-muted-foreground/60" /> Anterior
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-[2px]" style={{ backgroundColor: "var(--success)" }} /> Atual
          </span>
        </div>
      </Section>

      {/* MÉTRICAS TRANSVERSAIS — KPIs */}
      <Section icon={<Layers className="w-3 h-3" />} title="Métricas transversais" meta="Visão geral">
        <div className="grid grid-cols-2 gap-3">
          <KPI
            label="Streak global"
            value={m.streak}
            unit="d"
            sub="execução consecutiva"
            tone="positive"
            icon={<Flame className="w-3 h-3" />}
          />
          <KPI
            label="Consistência"
            value={m.consistency}
            unit="%"
            sub={`${m.activeDays}/7 dias ativos`}
            tone="positive"
            progress={m.consistency}
            icon={<Activity className="w-3 h-3" />}
          />
        </div>
        <div className="panel-flat p-3.5 mt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="label-meta">Score global</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-light tabular leading-none">
                  <CountUp value={m.xpTotal} />
                </span>
                <span className="text-[11px] text-muted-foreground tabular uppercase tracking-wider">xp</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] tabular flex items-center gap-1 text-[var(--success)]">
                <TrendingUp className="w-2.5 h-2.5" /> +{m.xpWeek}
              </div>
              <div className="label-meta mt-0.5">xp · sem</div>
            </div>
          </div>
        </div>
      </Section>

      {/* PROGRESSO MULTIANUAL */}
      <Section icon={<LineChart className="w-3 h-3" />} title="Progresso multianual" meta="Macro">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-light tabular leading-none">
            <CountUp value={m.multiYear[m.multiYear.length - 1].value} />
          </span>
          <span className={`text-xs tabular flex items-center gap-0.5 ${m.multiYearGrowthPct >= 0 ? "text-[var(--success)]" : "text-destructive"}`}>
            {m.multiYearGrowthPct >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {m.multiYearGrowthPct >= 0 ? "+" : ""}{m.multiYearGrowthPct}%
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground mb-2">
          score mensal · 36 meses · {m.multiYear[0].year} → {m.multiYear[m.multiYear.length - 1].year}
        </div>
        <MultiYearLine data={m.multiYear} />
      </Section>

      {/* EXECUTION MAP — 365 dias */}
      <Section icon={<Grid3x3 className="w-3 h-3" />} title="Execution map" meta={`${m.yearStreak}d melhor streak`}>
        <div className="mb-3">
          <div className="text-base font-medium">Últimos 365 dias</div>
          <div className="text-[11px] text-muted-foreground">
            {m.yearExecutedDays} dias executados · streak {m.streak}d
          </div>
        </div>
        <YearHeatmap cells={m.yearMap} />
      </Section>

      {/* PILARES — lista densa */}
      <section className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between py-2.5 border-b border-border">
          <div className="flex items-center gap-2 label-meta">
            <Trophy className="w-3 h-3" /> Pilares
          </div>
          <div className="label-meta tabular">{cards.length}</div>
        </div>

        <ul className="divide-y divide-border">
          {cards.map(({ p, d }, i) => (
            <li key={p.slug} style={{ animation: `slide-up 0.4s ease-out ${i * 25}ms backwards` }}>
              <Link
                to="/pilar/$slug"
                params={{ slug: p.slug }}
                className={`pillar-${p.slug} flex items-center gap-3 py-3.5 group active:bg-surface transition`}
              >
                <div className="w-1 h-8 rounded-full bg-pillar shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{p.tagline}</div>
                </div>
                <div className="w-16 hidden xs:block">
                  <Sparkline data={d.sparkline} height={28} />
                </div>
                <div className="text-right w-14 shrink-0">
                  <div className="text-base font-light tabular leading-none">{d.score}</div>
                  <div className={`text-[10px] tabular mt-1 inline-flex items-center gap-0.5 ${d.delta7 >= 0 ? "text-[var(--success)]" : "text-destructive"}`}>
                    {d.delta7 >= 0 ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                    {d.delta7 >= 0 ? "+" : ""}{d.delta7}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 group-active:translate-x-0.5 transition" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Section({
  icon, title, meta, children,
}: { icon: React.ReactNode; title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section className="max-w-3xl mx-auto px-4 pt-5">
      <div className="panel p-4 animate-[fade-in_0.5s_ease-out]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 label-meta">
            <span className="text-[var(--success)]">{icon}</span>
            {title}
          </div>
          {meta && <div className="label-meta tabular">{meta}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

function KPI({
  label, value, unit, sub, tone, progress, icon,
}: {
  label: string; value: number; unit?: string; sub?: string;
  tone?: "positive" | "negative" | "neutral";
  progress?: number; icon?: React.ReactNode;
}) {
  const color = tone === "positive" ? "var(--success)" : tone === "negative" ? "var(--destructive)" : undefined;
  return (
    <div className="panel-flat p-3">
      <div className="flex items-center gap-1.5 label-meta">
        {icon && <span style={color ? { color } : undefined}>{icon}</span>}
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-2xl font-light tabular leading-none" style={color ? { color } : undefined}>
          <CountUp value={value} />
        </span>
        {unit && <span className="text-[11px] text-muted-foreground tabular">{unit}</span>}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1.5 truncate">{sub}</div>}
      {progress !== undefined && (
        <div className="mt-2 h-1 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              backgroundColor: color ?? "var(--foreground)",
              animation: "draw 0.8s ease-out",
            }}
          />
        </div>
      )}
    </div>
  );
}
