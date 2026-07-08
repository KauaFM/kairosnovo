/**
 * Métricas transversais — agregam todos os pilares numa visão de sistema.
 * Determinístico: mesmos dados sempre que recarregar.
 */
import { PILLARS } from "./pillars";
import { getPillarData } from "./data-engine";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type GlobalMetrics = {
  scoreAvg: number;
  scoreAvgPrev: number;
  delta7: number;
  critical: number;
  rising: number;
  // Equilíbrio vital — radar de 12 pilares
  balance: { key: string; label: string; value: number; valuePast: number }[];
  // Métricas transversais
  streak: number;            // dias consecutivos com execução
  consistency: number;       // % dias ativos / 7
  activeDays: number;        // dias ativos na semana
  xpTotal: number;
  xpWeek: number;
  // Progresso multianual — 36 meses
  multiYear: { label: string; value: number; year: number }[];
  multiYearGrowthPct: number;
  // Execution map — 365 dias
  yearMap: { day: number; intensity: number }[];
  yearExecutedDays: number;
  yearStreak: number;
};

let cache: GlobalMetrics | null = null;

export function getGlobalMetrics(): GlobalMetrics {
  if (cache) return cache;

  const cards = PILLARS.map((p) => ({ p, d: getPillarData(p.slug) }));
  const scoreAvg = Math.round(cards.reduce((s, c) => s + c.d.score, 0) / cards.length);
  const scoreAvgPrev = Math.round(cards.reduce((s, c) => s + c.d.scorePrev, 0) / cards.length);
  const delta7 = scoreAvg - scoreAvgPrev;
  const critical = cards.filter((c) => c.d.status === "critico").length;
  const rising = cards.filter((c) => c.d.delta7 > 0).length;

  const balance = cards.map(({ p, d }) => ({
    key: p.slug,
    label: p.name.toUpperCase(),
    value: d.score,
    valuePast: d.scorePrev,
  }));

  const rand = mulberry32(20260428);

  // Execution map 365 dias — coerente com curva humana e fim de semana
  const yearMap: { day: number; intensity: number }[] = [];
  let yearExecutedDays = 0;
  let curStreak = 0;
  let bestStreak = 0;
  for (let i = 0; i < 365; i++) {
    // tendência crescente ao longo do ano + ruído + dip fim de semana
    const dow = i % 7;
    const trend = i / 365; // 0..1
    const base = 0.35 + trend * 0.45;
    const weekend = dow >= 5 ? -0.18 : 0;
    let intensity = base + weekend + (rand() - 0.5) * 0.55;
    intensity = Math.max(0, Math.min(1, intensity));
    yearMap.push({ day: i, intensity });
    if (intensity > 0.18) {
      yearExecutedDays++;
      curStreak++;
      if (curStreak > bestStreak) bestStreak = curStreak;
    } else {
      curStreak = 0;
    }
  }

  // Streak atual = sequência terminando em hoje
  let streakNow = 0;
  for (let i = yearMap.length - 1; i >= 0; i--) {
    if (yearMap[i].intensity > 0.18) streakNow++;
    else break;
  }

  // Métricas semana
  const last7 = yearMap.slice(-7);
  const activeDays = last7.filter((d) => d.intensity > 0.18).length;
  const consistency = Math.round((activeDays / 7) * 100);

  // XP — função de execução total e score
  const xpTotal = Math.round(yearExecutedDays * 8 + scoreAvg * 5);
  const xpWeek = Math.round(activeDays * 18 + scoreAvg * 0.8);

  // Multianual — 36 meses (3 anos), tendência crescente realista
  const now = new Date();
  const multiYear: { label: string; value: number; year: number }[] = [];
  let mv = 1100 + rand() * 200;
  for (let i = 35; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    // crescimento composto ~1.7%/mês com ruído
    const growth = 1 + 0.017 + (rand() - 0.5) * 0.04;
    mv = mv * growth;
    multiYear.push({
      label: date.toLocaleDateString("pt-BR", { month: "short" }),
      value: Math.round(mv),
      year: date.getFullYear(),
    });
  }
  const first = multiYear[0].value;
  const last = multiYear[multiYear.length - 1].value;
  const multiYearGrowthPct = Math.round(((last - first) / first) * 100);

  cache = {
    scoreAvg, scoreAvgPrev, delta7, critical, rising,
    balance,
    streak: streakNow,
    consistency,
    activeDays,
    xpTotal,
    xpWeek,
    multiYear,
    multiYearGrowthPct,
    yearMap,
    yearExecutedDays,
    yearStreak: bestStreak,
  };
  return cache;
}
