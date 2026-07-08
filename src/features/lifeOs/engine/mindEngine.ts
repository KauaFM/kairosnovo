// =============================================================
// ORVAX · Life OS — Mind Intelligence Engine
//
// Motor de interpretação pura. Zero UI. Zero side effects.
// Recebe MindData, retorna MindDiagnosis completo.
//
// Funções: detectTrend · pearson · rankCorrelations ·
//          findRootCause · generatePrediction · prioritize ·
//          detectTimePatterns · buildStory · diagnose
// =============================================================
import type {
  MindData, MindDiagnosis, MindStatus, Driver, PriorityAction,
  Action, PredictionItem, TimePattern, CorrelationPair, RadarAxis,
} from '../data/mindTypes';
import type { TimelineBlock } from '../components/charts/primitives/ExecutionTimeline';

// ─── Trend detection ────────────────────────────────────────
type Trend = 'rising' | 'falling' | 'stable';

function detectTrend(series: number[]): Trend {
  if (series.length < 3) return 'stable';
  const n = series.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += series[i];
    sumXY += i * series[i];
    sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  if (slope > 0.3) return 'rising';
  if (slope < -0.3) return 'falling';
  return 'stable';
}

// ─── Pearson correlation ────────────────────────────────────
function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
}

// ─── Rank correlations by |r| ───────────────────────────────
function rankCorrelations(pairs: CorrelationPair[], top = 2): CorrelationPair[] {
  return [...pairs]
    .sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson))
    .slice(0, top);
}

// ─── Correlation strength label ─────────────────────────────
function corrLabel(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.7) return 'correlação alta';
  if (abs >= 0.4) return 'correlação moderada';
  return 'correlação fraca';
}

// ─── Detect worst radar axis ────────────────────────────────
function worstAxis(radar: RadarAxis[]): RadarAxis {
  return radar.reduce((worst, ax) => {
    const delta = ax.current - ax.previous;
    const worstDelta = worst.current - worst.previous;
    return delta < worstDelta ? ax : worst;
  }, radar[0]);
}

// ─── Find root cause from radar + timeline ──────────────────
function findRootCause(radar: RadarAxis[], timeline: TimelineBlock[]): string {
  const worst = worstAxis(radar);
  const drainHours = timeline
    .filter(b => b.tone === 'drain')
    .reduce((s, b) => s + (b.end - b.start), 0);
  const totalHours = timeline.reduce((s, b) => s + (b.end - b.start), 0);
  const drainPct = Math.round((drainHours / totalHours) * 100);

  if (worst.axis.toLowerCase().includes('foco') && drainPct > 20) {
    return `${worst.axis} caiu ${Math.abs(worst.current - worst.previous)}pts enquanto ${drainPct}% do dia é distração`;
  }
  if (worst.axis.toLowerCase().includes('calma')) {
    return `${worst.axis} é o eixo mais fraco — ansiedade elevada impacta os outros fatores`;
  }
  return `${worst.axis} piorou ${Math.abs(worst.current - worst.previous)}pts esta semana`;
}

// ─── Generate predictions ───────────────────────────────────
function generatePredictions(
  radar: RadarAxis[], trend7d: number
): { items: PredictionItem[]; narrative: string } {
  const items: PredictionItem[] = [];

  radar.forEach(ax => {
    const delta = ax.current - ax.previous;
    if (Math.abs(delta) > 3) {
      const projected = Math.round(delta * 1.5);
      items.push({
        metric: ax.axis.toLowerCase(),
        delta: projected,
        direction: projected > 0 ? 'up' : 'down',
        days: 7,
      });
    }
  });

  let narrative: string;
  const declining = items.filter(i => i.direction === 'down');
  if (declining.length >= 2) {
    narrative = `Se continuar assim por 7 dias, você perderá produtividade e bem-estar mental progressivamente`;
  } else if (declining.length === 1) {
    narrative = `Se continuar assim, seu ${declining[0].metric} cairá ${Math.abs(declining[0].delta)}% nos próximos dias`;
  } else if (trend7d < -5) {
    narrative = `A tendência de queda de ${Math.abs(trend7d)}% pode se agravar se nenhuma ação for tomada`;
  } else {
    narrative = `Mantendo o ritmo atual, seus indicadores devem se estabilizar em 7 dias`;
  }

  return { items, narrative };
}

// ─── Detect time patterns ───────────────────────────────────
function detectTimePatterns(timeline: TimelineBlock[]): TimePattern[] {
  const patterns: TimePattern[] = [];
  const sorted = [...timeline].sort((a, b) => a.start - b.start);

  // Find productive clusters
  const productive = sorted.filter(b => b.tone === 'productive');
  if (productive.length > 0) {
    const peakBlock = productive.reduce((best, b) =>
      (b.end - b.start) > (best.end - best.start) ? b : best
    , productive[0]);
    patterns.push({
      startHour: peakBlock.start,
      endHour: peakBlock.end,
      type: 'peak_focus',
      description: `Seu pico de foco é entre ${fmtH(peakBlock.start)} e ${fmtH(peakBlock.end)}`,
    });
  }

  // Find drain clusters
  const drains = sorted.filter(b => b.tone === 'drain');
  if (drains.length > 0) {
    const worstDrain = drains.reduce((w, b) =>
      (b.end - b.start) > (w.end - w.start) ? b : w
    , drains[0]);
    patterns.push({
      startHour: worstDrain.start,
      endHour: worstDrain.end,
      type: 'focus_loss',
      description: `Você perde foco entre ${fmtH(worstDrain.start)} e ${fmtH(worstDrain.end)}`,
    });

    // Consecutive drain windows
    const totalDrain = drains.reduce((s, b) => s + (b.end - b.start), 0);
    if (totalDrain > 3) {
      patterns.push({
        startHour: drains[0].start,
        endHour: drains[drains.length - 1].end,
        type: 'focus_loss',
        description: `${Math.round(totalDrain)}h do dia são vazamento de atenção`,
      });
    }
  }

  return patterns;
}

function fmtH(h: number): string {
  return `${String(Math.floor(h)).padStart(2, '0')}h`;
}

// ─── Build drivers ──────────────────────────────────────────
function buildDrivers(radar: RadarAxis[], correlations: CorrelationPair[]): Driver[] {
  const drivers: Driver[] = [];

  // From radar deltas
  radar.forEach(ax => {
    const delta = ax.current - ax.previous;
    if (Math.abs(delta) > 3) {
      drivers.push({
        factor: ax.axis,
        impact: delta,
        metric: ax.axis.toLowerCase(),
        tone: delta > 0 ? 'positive' : 'negative',
        icon: delta > 0 ? 'TrendingUp' : 'TrendingDown',
      });
    }
  });

  // From correlations (strongest)
  const top = rankCorrelations(correlations, 2);
  top.forEach(c => {
    drivers.push({
      factor: `${c.xLabel} → ${c.yLabel}`,
      impact: Math.round(c.pearson * 100),
      metric: c.yLabel.toLowerCase(),
      tone: c.pearson > 0 ? 'positive' : 'negative',
      icon: c.pearson > 0 ? 'Link' : 'Unlink',
    });
  });

  return drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

// ─── Prioritize: problema #1 + ação #1 ──────────────────────
function prioritize(drivers: Driver[], timeline: TimelineBlock[]): PriorityAction {
  const worst = drivers.filter(d => d.tone === 'negative')[0];
  const drains = timeline.filter(b => b.tone === 'drain');
  const drainTotal = drains.reduce((s, b) => s + (b.end - b.start), 0);
  const totalTime = timeline.reduce((s, b) => s + (b.end - b.start), 0);
  const drainPct = Math.round((drainTotal / totalTime) * 100);

  if (worst && worst.factor.toLowerCase().includes('foco')) {
    return {
      problem: 'Perda de foco',
      problemDetail: `Seu foco caiu ${Math.abs(worst.impact)}pts — ${drainPct}% do dia é distração`,
      action: 'Bloquear redes sociais por 2h e executar 1 bloco de foco agora',
      actionIcon: 'Shield',
    };
  }

  if (drainPct > 25) {
    return {
      problem: 'Distração excessiva',
      problemDetail: `${drainPct}% do seu tempo está sendo drenado por atividades sem retorno`,
      action: 'Reduzir redes sociais por 1h e substituir por descanso ativo',
      actionIcon: 'Smartphone',
    };
  }

  if (worst) {
    return {
      problem: worst.factor,
      problemDetail: `${worst.factor} impacta ${worst.metric} em ${Math.abs(worst.impact)}%`,
      action: worst.tone === 'negative'
        ? `Trabalhar em melhorar ${worst.metric} com ação direcionada`
        : `Manter consistência em ${worst.metric}`,
      actionIcon: 'Target',
    };
  }

  return {
    problem: 'Manutenção',
    problemDetail: 'Sem problemas críticos detectados',
    action: 'Manter rotina atual e monitorar indicadores',
    actionIcon: 'CheckCircle',
  };
}

// ─── Generate contextual actions ────────────────────────────
function generateActions(
  drivers: Driver[], timeline: TimelineBlock[], radar: RadarAxis[]
): Action[] {
  const actions: Action[] = [];
  const drains = timeline.filter(b => b.tone === 'drain');
  const worstRadar = worstAxis(radar);

  // Action based on drain patterns
  if (drains.some(b => b.label.toLowerCase().includes('redes') || b.label.toLowerCase().includes('social'))) {
    actions.push({ label: 'Bloquear redes sociais por 2h', icon: 'ShieldOff', urgency: 'high' });
  }

  // Action based on worst radar axis
  if (worstRadar.axis.toLowerCase().includes('calma')) {
    actions.push({ label: 'Dormir 1h mais cedo hoje', icon: 'Moon', urgency: 'high' });
  } else if (worstRadar.axis.toLowerCase().includes('foco')) {
    actions.push({ label: 'Executar 1 bloco de foco de 45min agora', icon: 'Target', urgency: 'high' });
  }

  // Action based on sleep correlation
  const sleepCorr = drivers.find(d => d.factor.toLowerCase().includes('sono'));
  if (sleepCorr) {
    actions.push({ label: 'Dormir 1h mais cedo hoje', icon: 'Moon', urgency: 'high' });
  }

  // Always include a quick win
  if (actions.length < 3) {
    actions.push({ label: 'Meditar 10 minutos agora', icon: 'Leaf', urgency: 'medium' });
  }

  // Deduplicate by label
  const seen = new Set<string>();
  return actions.filter(a => {
    if (seen.has(a.label)) return false;
    seen.add(a.label);
    return true;
  }).slice(0, 3);
}

// ─── Build storytelling ─────────────────────────────────────
function buildStorytelling(
  score: number, trend7d: number, radar: RadarAxis[],
  drivers: Driver[], timePatterns: TimePattern[],
  topCorrelations: CorrelationPair[], donutData: { label: string; value: number }[]
): {
  snapshotStory: string;
  snapshotDiagnosis: string;
  analysisInsights: Record<string, string>;
  depthNarrative: string;
} {
  const worst = worstAxis(radar);
  const worstDelta = worst.current - worst.previous;
  const distractionSlice = donutData.find(d => d.label.toLowerCase().includes('distração'));
  const distractionPct = distractionSlice?.value ?? 0;

  // Snapshot story (1 frase forte)
  let snapshotStory: string;
  if (score < 40) snapshotStory = 'Estado mental crítico — ação imediata necessária';
  else if (trend7d < -10) snapshotStory = 'Você está perdendo consistência mental rapidamente';
  else if (trend7d < -5) snapshotStory = 'Você está perdendo consistência mental';
  else if (trend7d > 5) snapshotStory = 'Você está evoluindo — mantenha o ritmo';
  else snapshotStory = 'Seu estado mental está estável mas pode melhorar';

  // Snapshot diagnosis
  let snapshotDiagnosis: string;
  if (worstDelta < -5 && distractionPct > 35) {
    snapshotDiagnosis = `Queda recente no ${worst.axis.toLowerCase()} e aumento da distração`;
  } else if (worstDelta < -5) {
    snapshotDiagnosis = `${worst.axis} em queda — caiu ${Math.abs(worstDelta)}pts esta semana`;
  } else if (distractionPct > 40) {
    snapshotDiagnosis = `Distração está dominando ${distractionPct}% do seu tempo mental`;
  } else {
    snapshotDiagnosis = `Estado geral controlado com atenção ao ${worst.axis.toLowerCase()}`;
  }

  // Analysis insights (per block)
  const analysisInsights: Record<string, string> = {};

  // Radar insight
  analysisInsights.radar = `${worst.axis} é seu eixo mais fraco — ${worstDelta > 0 ? 'melhorou' : 'piorou'} ${Math.abs(worstDelta)}pts esta semana`;

  // Progress insight
  if (trend7d < -5) {
    analysisInsights.progress = `Seu estado mental piorou ${Math.abs(trend7d)}% em 7 dias — observe os padrões de sono e distração`;
  } else if (trend7d > 5) {
    analysisInsights.progress = `Evolução de ${trend7d}% esta semana — suas ações estão gerando resultado`;
  } else {
    analysisInsights.progress = `Estabilidade nos últimos dias — busque elevar o patamar com ações direcionadas`;
  }

  // Heatmap insight
  const consistentDays = Math.round(score * 7 / 100);
  analysisInsights.heatmap = `Você teve apenas ${consistentDays} dias consistentes esta semana`;

  // Donut insight
  if (distractionPct > 35) {
    analysisInsights.donut = `${distractionPct}% do seu tempo mental é distração — acima do limite saudável`;
  } else {
    analysisInsights.donut = `Distribuição mental aceitável — foco profundo em ${donutData[0]?.value ?? 0}%`;
  }

  // Patterns insight
  analysisInsights.patterns = drivers.length > 0
    ? `${drivers.length} fatores detectados impactando sua mente — os mais fortes estão listados abaixo`
    : 'Sem padrões significativos detectados neste período';

  // Depth narrative
  const focusLoss = timePatterns.find(p => p.type === 'focus_loss');
  const topCorr = topCorrelations[0];
  const depthParts: string[] = [];
  if (focusLoss) depthParts.push(focusLoss.description);
  if (topCorr) depthParts.push(`${topCorr.xLabel} impacta diretamente ${topCorr.yLabel.toLowerCase()} (${corrLabel(topCorr.pearson)})`);
  if (distractionPct > 35) depthParts.push(`${distractionPct}% do tempo livre está virando distração`);
  const depthNarrative = depthParts.length > 0 ? depthParts.join('. ') + '.' : 'Sem padrões significativos detectados neste período.';

  return { snapshotStory, snapshotDiagnosis, analysisInsights, depthNarrative };
}

// ─── Status from score ──────────────────────────────────────
function scoreToStatus(score: number, trend: number): MindStatus {
  if (score < 30) return 'critical';
  if (score < 50 || trend < -10) return 'declining';
  if (score >= 80 && trend > 5) return 'excellent';
  if (trend > 3) return 'improving';
  return 'stable';
}

// ─── Headline from status ───────────────────────────────────
function statusHeadline(status: MindStatus, worst: RadarAxis): string {
  switch (status) {
    case 'critical':  return 'Estado mental crítico';
    case 'declining': return `${worst.axis} em queda`;
    case 'stable':    return 'Estado mental estável';
    case 'improving': return 'Mente em evolução';
    case 'excellent': return 'Excelente estado mental';
  }
}

// =============================================================
// MAIN: diagnose
// =============================================================
export function diagnose(data: MindData): MindDiagnosis {
  const { snapshot, radar, timeline24h, correlations, donut } = data;

  const status = scoreToStatus(snapshot.score, snapshot.trend7d);
  const worst = worstAxis(radar);
  const headline = statusHeadline(status, worst);
  const rootCause = findRootCause(radar, timeline24h);
  const drivers = buildDrivers(radar, correlations);
  const { items: predictions, narrative: predictionNarrative } = generatePredictions(radar, snapshot.trend7d);
  const priority = prioritize(drivers, timeline24h);
  const actions = generateActions(drivers, timeline24h, radar);
  const timePatterns = detectTimePatterns(timeline24h);
  const topCorrelations = rankCorrelations(correlations, 2);

  const { snapshotStory, snapshotDiagnosis, analysisInsights, depthNarrative } =
    buildStorytelling(snapshot.score, snapshot.trend7d, radar, drivers, timePatterns, topCorrelations, donut);

  return {
    status,
    headline,
    rootCause,
    drivers,
    predictions,
    predictionNarrative,
    priority,
    actions,
    snapshotStory,
    snapshotDiagnosis,
    analysisInsights,
    depthNarrative,
    timePatterns,
    topCorrelations,
  };
}
