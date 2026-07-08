/**
 * Motor de dados Kairos — realismo e inteligência.
 *
 * Princípios:
 *  1. Dados determinísticos por slug (mesmo pilar = mesmo dataset).
 *  2. Padrões humanos coerentes:
 *     - sono → energia → foco (correlações reais)
 *     - queda no fim da tarde
 *     - fim de semana diferente
 *     - hábitos drenantes recorrentes em horários específicos
 *  3. Insights baseados em estatística real (médias, percentuais, regressão).
 *  4. Previsão = regressão linear sobre últimos 14 dias, projetada 30d.
 */
import { PILLARS, type PillarConfig, type PillarSlug } from "./pillars";

// PRNG determinístico
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSlug(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export type AxisValue = { key: string; label: string; value: number };
export type DayPoint = { day: string; value: number };
export type ExecutionBlock = { hour: number; activity: string; type: "produtivo" | "distracao" | "neutro" };
export type HeatCell = { day: number; hour: number; intensity: number };
export type ScatterPoint = { x: number; y: number };
export type SankeyLink = { source: string; target: string; value: number };

export type PillarData = {
  config: PillarConfig;
  score: number;
  scorePrev: number;
  delta7: number;
  status: "critico" | "atencao" | "saudavel";
  sparkline: number[];

  axesNow: AxisValue[];
  axesPast: AxisValue[];

  today: ExecutionBlock[];
  todayInsight: string;
  productiveHours: number;
  distractionHours: number;
  peakHour: number;
  troughHour: number;
  recurringDistraction: { activity: string; hours: number; daysAffected: number } | null;

  week: DayPoint[];
  weekHeat: HeatCell[];
  weekInsight: string;
  weekConsistency: number; // 0-100

  problem: { title: string; detail: string; cause: string };
  actions: { title: string; why: string; when: string }[];

  evolution30: DayPoint[];
  scatter: ScatterPoint[];
  scatterCorrelation: number;

  sankey: { nodes: string[]; links: SankeyLink[] };

  prediction: { positive: string; negative: string; trend: number; projected30: number };
  truth: string;
};

const DAYS_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Curva de produtividade humana realista por hora (0-23) */
const HUMAN_CURVE = [
  0.05, 0.05, 0.05, 0.05, 0.05, 0.10, // 0-5 sono
  0.30, 0.55, 0.75,                    // 6-8 acordar
  0.92, 0.95, 0.90, 0.78,              // 9-12 pico manhã
  0.55, 0.60, 0.72, 0.75, 0.65,        // 13-17 tarde (queda pós almoço, recupera)
  0.45, 0.40, 0.35, 0.25, 0.15, 0.08,  // 18-23 noite
];

/** Estatística simples */
function mean(arr: number[]) { return arr.reduce((s, v) => s + v, 0) / arr.length; }
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  const xs = values.map((_, i) => i);
  const mx = mean(xs), my = mean(values);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (values[i] - my); den += (xs[i] - mx) ** 2; }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

export function generatePillarData(slug: PillarSlug): PillarData {
  const config = PILLARS.find((p) => p.slug === slug)!;
  const seed = hashSlug(slug);
  const rand = mulberry32(seed);

  // ── Trajetória de 30 dias coerente (random walk com drift) ──
  const drift = (rand() - 0.5) * 0.4; // tendência de fundo entre -0.2 e +0.2 por dia
  const evolutionRaw: number[] = [];
  let v = 50 + rand() * 25;
  for (let i = 0; i < 30; i++) {
    // ciclo semanal: cai no fim de semana
    const dow = (i + Math.floor(rand() * 7)) % 7;
    const weekendDip = dow >= 5 ? -3 : 0;
    v += drift + (rand() - 0.5) * 5 + weekendDip * 0.4;
    v = Math.max(20, Math.min(95, v));
    evolutionRaw.push(v);
  }
  const evolution30: DayPoint[] = evolutionRaw.map((val, i) => ({ day: `D-${30 - i}`, value: Math.round(val) }));

  const score = Math.round(evolutionRaw[29]);
  const scorePrev = Math.round(evolutionRaw[22]); // 7 dias atrás
  const delta7 = score - scorePrev;
  const status: PillarData["status"] = score <= 40 ? "critico" : score <= 70 ? "atencao" : "saudavel";

  // Sparkline = últimos 14 dias
  const sparkline = evolutionRaw.slice(-14).map((v) => Math.round(v));

  // Semana = últimos 7 dias com labels reais
  const week: DayPoint[] = evolutionRaw.slice(-7).map((val, i) => ({
    day: DAYS_LABELS[i], value: Math.round(val),
  }));

  // Consistência = 100 - desvio padrão normalizado
  const last7 = evolutionRaw.slice(-7);
  const m7 = mean(last7);
  const variance = mean(last7.map((x) => (x - m7) ** 2));
  const stdDev = Math.sqrt(variance);
  const weekConsistency = Math.round(Math.max(0, 100 - stdDev * 4));

  // ── Eixos do radar (coerentes com o score) ──
  // Eixo principal próximo do score, outros variando
  const axesNow: AxisValue[] = config.axes.map((a, i) => {
    const offset = (rand() - 0.5) * 30;
    let val = Math.round(Math.max(15, Math.min(95, score + offset)));
    return { key: a.key, label: a.label, value: a.inverted ? 100 - val : val };
  });
  const axesPast: AxisValue[] = config.axes.map((a, i) => {
    const past = Math.round(Math.max(15, Math.min(95, axesNow[i].value - delta7 + (rand() - 0.5) * 10)));
    return { key: a.key, label: a.label, value: past };
  });

  // ── Execution map 24h coerente com curva humana ──
  const today: ExecutionBlock[] = [];
  const distractionByActivity: Record<string, number> = {};
  let prodHours = 0, distHours = 0;
  let peakHour = 9, peakScore = 0;
  let troughHour = 14, troughScore = 1;

  // Probabilidade de execução é função da curva humana × score do pilar
  const executionMultiplier = score / 100;

  for (let h = 0; h < 24; h++) {
    const baseProb = HUMAN_CURVE[h] * executionMultiplier;
    let type: ExecutionBlock["type"];
    const r = rand();

    if (h < 6 || h >= 23) {
      type = "neutro"; // sono
    } else if (r < baseProb * 0.85) {
      type = "produtivo";
    } else if (r < baseProb * 0.85 + (1 - baseProb) * 0.55) {
      type = "distracao";
    } else {
      type = "neutro";
    }

    const pool = config.activities.filter((a) => a.type === type);
    const act = pool[Math.floor(rand() * pool.length)] || config.activities[0];
    today.push({ hour: h, activity: act.label, type });

    if (type === "produtivo") {
      prodHours++;
      if (HUMAN_CURVE[h] > peakScore) { peakScore = HUMAN_CURVE[h]; peakHour = h; }
    }
    if (type === "distracao") {
      distHours++;
      distractionByActivity[act.label] = (distractionByActivity[act.label] ?? 0) + 1;
      if (h >= 8 && h <= 20 && HUMAN_CURVE[h] < troughScore) {
        troughScore = HUMAN_CURVE[h]; troughHour = h;
      }
    }
  }

  // Hábito negativo recorrente (atividade de distração mais frequente)
  const topDistraction = Object.entries(distractionByActivity).sort((a, b) => b[1] - a[1])[0];
  const recurringDistraction = topDistraction
    ? {
        activity: topDistraction[0],
        hours: topDistraction[1],
        daysAffected: Math.min(7, Math.max(2, Math.round(topDistraction[1] * 0.7 + rand() * 2))),
      }
    : null;

  // ── INSIGHT do dia (numérico, específico) ──
  const todayInsightParts: string[] = [];
  if (distHours > 0) {
    todayInsightParts.push(`${distHours}h em distração`);
  }
  if (prodHours > 0) {
    todayInsightParts.push(`pico às ${peakHour}h`);
  }
  if (troughHour && distHours > 1) {
    todayInsightParts.push(`queda às ${troughHour}h`);
  }
  const todayInsight = todayInsightParts.length > 0
    ? todayInsightParts.join(" · ").charAt(0).toUpperCase() + todayInsightParts.join(" · ").slice(1) + "."
    : "Dia equilibrado, sem padrões críticos detectados.";

  // ── INSIGHT da semana (numérico) ──
  const bestDay = week.reduce((b, c) => c.value > b.value ? c : b, week[0]);
  const worstDay = week.reduce((b, c) => c.value < b.value ? c : b, week[0]);
  const weekDelta = week[6].value - week[0].value;
  let weekInsight: string;
  if (weekConsistency < 50) {
    weekInsight = `Inconsistência alta (${weekConsistency}/100). Variação de ${Math.round(stdDev * 2)} pontos entre ${worstDay.day} (${worstDay.value}) e ${bestDay.day} (${bestDay.value}).`;
  } else if (weekDelta < -5) {
    weekInsight = `Queda de ${Math.abs(weekDelta)} pontos na semana. Pior dia: ${worstDay.day} (${worstDay.value}).`;
  } else if (weekDelta > 5) {
    weekInsight = `Subida de +${weekDelta} pontos. Melhor dia: ${bestDay.day} (${bestDay.value}). Mantenha o padrão.`;
  } else {
    weekInsight = `Semana estável (consistência ${weekConsistency}/100). Média de ${Math.round(m7)} pontos.`;
  }

  // ── Heatmap coerente com curva humana ──
  const weekHeat: HeatCell[] = [];
  for (let d = 0; d < 7; d++) {
    const dayMult = d >= 5 ? 0.5 : 1; // fim de semana mais fraco
    for (let h = 0; h < 24; h++) {
      let intensity = HUMAN_CURVE[h] * dayMult * executionMultiplier;
      intensity *= 0.7 + rand() * 0.6; // ruído
      intensity = Math.max(0, Math.min(1, intensity));
      weekHeat.push({ day: d, hour: h, intensity });
    }
  }

  // ── PROBLEMA (eixo mais fraco + causa numérica) ──
  const weakest = [...axesNow].sort((a, b) => a.value - b.value)[0];
  const problemTitle = `${weakest.label} em ${weakest.value}/100`;
  let cause: string;
  if (recurringDistraction && recurringDistraction.daysAffected >= 3) {
    cause = `${recurringDistraction.activity} aparece em ${recurringDistraction.daysAffected} dos últimos 7 dias, consumindo ~${recurringDistraction.hours}h hoje.`;
  } else if (distHours > prodHours) {
    cause = `Distração (${distHours}h) supera foco (${prodHours}h) hoje. Padrão se repete às ${troughHour}h.`;
  } else if (weekConsistency < 50) {
    cause = `Inconsistência semanal de ${weekConsistency}/100 — ${Math.round(stdDev * 2)} pontos de variação entre o melhor e o pior dia.`;
  } else {
    cause = `${weakest.label} ficou ${Math.abs(score - weakest.value)} pontos abaixo do score geral.`;
  }
  const problemDetail = `${weakest.label} é a maior alavanca de ${config.name}. Mover este eixo move o score geral.`;

  // ── AÇÕES contextuais (motivo claro + quando executar) ──
  const actions: PillarData["actions"] = [];
  if (recurringDistraction) {
    actions.push({
      title: `Bloquear ${recurringDistraction.activity.toLowerCase()} entre ${troughHour}h e ${troughHour + 2}h`,
      why: `Reduz ${recurringDistraction.hours}h/dia do principal hábito drenante (${recurringDistraction.daysAffected}/7 dias afetados).`,
      when: "Agora · ative timer",
    });
  }
  if (prodHours < 4) {
    actions.push({
      title: `Bloco de 25 min focado em ${weakest.label.toLowerCase()}`,
      why: `Você teve apenas ${prodHours}h de foco hoje. Um bloco curto reverte o padrão.`,
      when: "Próximos 30 min",
    });
  }
  if (weekConsistency < 60) {
    actions.push({
      title: `Repetir o padrão de ${bestDay.day} amanhã`,
      why: `Seu melhor dia foi ${bestDay.day} (${bestDay.value} pontos). Replicar é mais barato que melhorar.`,
      when: "Antes de dormir hoje",
    });
  }
  if (delta7 < -5) {
    actions.push({
      title: `Reduzir 1 compromisso amanhã`,
      why: `Score caiu ${Math.abs(delta7)} pontos em 7 dias — sintoma de sobrecarga.`,
      when: "Hoje à noite",
    });
  }
  while (actions.length < 3) {
    actions.push({
      title: `Registrar 1 dado em ${config.name}`,
      why: `Sem medição, não há diagnóstico. ${config.axes[0].label} é o eixo base.`,
      when: "Agora · 30 segundos",
    });
  }

  // ── Scatter coerente com correlação real do pilar ──
  const targetCorr = 0.45 + rand() * 0.4; // entre 0.45 e 0.85
  const scatter: ScatterPoint[] = [];
  for (let i = 0; i < 30; i++) {
    const x = 20 + rand() * 70;
    const noise = (rand() - 0.5) * (1 - targetCorr) * 80;
    const y = Math.max(5, Math.min(95, x * targetCorr + 20 + noise));
    scatter.push({ x, y });
  }
  // Pearson
  const meanX = mean(scatter.map((p) => p.x));
  const meanY = mean(scatter.map((p) => p.y));
  let num = 0, dx2 = 0, dy2 = 0;
  for (const p of scatter) {
    num += (p.x - meanX) * (p.y - meanY);
    dx2 += (p.x - meanX) ** 2;
    dy2 += (p.y - meanY) ** 2;
  }
  const scatterCorrelation = num / Math.sqrt(dx2 * dy2);

  // ── Sankey ──
  const sankey = {
    nodes: ["Tempo livre", "Foco", "Distração", "Resultado +", "Resultado −"],
    links: [
      { source: "Tempo livre", target: "Foco", value: prodHours },
      { source: "Tempo livre", target: "Distração", value: distHours },
      { source: "Foco", target: "Resultado +", value: prodHours },
      { source: "Distração", target: "Resultado −", value: distHours },
    ],
  };

  // ── PREVISÃO baseada em regressão linear dos últimos 14 dias ──
  const recent = evolutionRaw.slice(-14);
  const { slope, intercept } = linearRegression(recent);
  const projectedRaw = intercept + slope * (recent.length - 1 + 30);
  const projected30 = Math.round(Math.max(10, Math.min(98, projectedRaw)));
  const trend = Math.round(slope * 10) / 10; // pontos/dia

  let positive: string;
  let negative: string;
  if (slope > 0.1) {
    positive = `Mantendo +${trend} pontos/dia, em 30 dias chega a ${projected30}/100.`;
    negative = `Se a tendência inverter (perder ${Math.abs(trend)}/dia), cai para ${Math.max(15, score - Math.round(Math.abs(trend) * 30))}/100.`;
  } else if (slope < -0.1) {
    positive = `Se reverter para +${Math.abs(trend)}/dia, em 30 dias atinge ${Math.min(98, score + Math.round(Math.abs(trend) * 30))}/100.`;
    negative = `Mantendo ${trend} pontos/dia, em 30 dias cai para ${projected30}/100.`;
  } else {
    positive = `Tendência estável (~0/dia). Pequena melhoria de +0.5/dia leva a ${Math.min(98, score + 15)}/100 em 30d.`;
    negative = `Estagnação por mais 30 dias deixa o score em ${score}/100 — sem ganho composto.`;
  }
  const prediction = { positive, negative, trend, projected30 };

  // ── A VERDADE — específica, baseada em dados ──
  let truth: string;
  if (recurringDistraction && recurringDistraction.daysAffected >= 4) {
    truth = `${recurringDistraction.activity} está em ${recurringDistraction.daysAffected}/7 dias da sua semana. Não é falha de disciplina — é gatilho ambiental.`;
  } else if (slope < -0.2) {
    truth = `Você está perdendo ${Math.abs(trend)} pontos por dia em ${config.name}. Em 30 dias, isso é ${Math.round(Math.abs(trend) * 30)} pontos. Compostos.`;
  } else if (weekConsistency < 45) {
    truth = `${config.name} oscila ${Math.round(stdDev * 2)} pontos entre o melhor e o pior dia. O problema não é capacidade — é consistência.`;
  } else if (distHours > prodHours * 1.5) {
    truth = `${distHours}h de distração contra ${prodHours}h de foco. Você não está cansado — está desviando.`;
  } else if (axesNow.find((a) => a.value < 35)) {
    const w = axesNow.find((a) => a.value < 35)!;
    truth = `${w.label} em ${w.value}/100 é o teto invisível de ${config.name}. Tudo o mais fica preso até aqui mover.`;
  } else if (slope > 0.2) {
    truth = `Você está subindo ${trend} pontos/dia. Pessoas raramente notam o ganho composto até ele virar identidade.`;
  } else {
    truth = `${config.name} está em piloto automático em ${score}/100. Não é crise — é o tipo de média que vira teto.`;
  }

  return {
    config, score, scorePrev, delta7, status, sparkline,
    axesNow, axesPast,
    today, todayInsight, productiveHours: prodHours, distractionHours: distHours, peakHour, troughHour, recurringDistraction,
    week, weekHeat, weekInsight, weekConsistency,
    problem: { title: problemTitle, detail: problemDetail, cause },
    actions: actions.slice(0, 3),
    evolution30, scatter, scatterCorrelation,
    sankey, prediction, truth,
  };
}

const cache = new Map<PillarSlug, PillarData>();
export function getPillarData(slug: PillarSlug): PillarData {
  if (!cache.has(slug)) cache.set(slug, generatePillarData(slug));
  return cache.get(slug)!;
}
