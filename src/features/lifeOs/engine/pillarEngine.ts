// =============================================================
// ORVAX · Life OS — Universal Pillar Intelligence Engine
// Motor genérico config-driven para todos os pilares.
// =============================================================
import type { PillarIntelData, PillarDiagnosis, PillarStatus, PillarDriver, PillarPriority, PillarAction, PillarPrediction, PillarPattern, PillarRadarAxis } from '../data/pillarIntelTypes';
import type { PillarIntelConfig } from '../data/pillarIntelConfig';

function worstAxis(r: PillarRadarAxis[]): PillarRadarAxis { return r.reduce((w, a) => (a.current - a.previous) < (w.current - w.previous) ? a : w, r[0]); }
function bestAxis(r: PillarRadarAxis[]): PillarRadarAxis { return r.reduce((w, a) => (a.current - a.previous) > (w.current - w.previous) ? a : w, r[0]); }
function corrLabel(r: number): string { const a = Math.abs(r); return a >= 0.7 ? 'correlação alta' : a >= 0.4 ? 'correlação moderada' : 'correlação fraca'; }

function scoreToStatus(score: number, trend: number): PillarStatus {
  if (score < 30) return 'critical';
  if (score < 50 || trend < -10) return 'declining';
  if (score >= 80 && trend > 5) return 'excellent';
  if (trend > 3) return 'improving';
  return 'stable';
}

function buildDrivers(radar: PillarRadarAxis[], correlations: PillarIntelData['correlations']): PillarDriver[] {
  const drivers: PillarDriver[] = [];
  radar.forEach(ax => {
    const d = ax.current - ax.previous;
    if (Math.abs(d) > 2) drivers.push({ factor: ax.axis, impact: d, metric: ax.axis.toLowerCase(), tone: d > 0 ? 'positive' : 'negative', icon: d > 0 ? 'TrendingUp' : 'TrendingDown' });
  });
  [...correlations].sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson)).slice(0, 2).forEach(c => {
    drivers.push({ factor: `${c.xLabel} → ${c.yLabel}`, impact: Math.round(c.pearson * 100), metric: c.yLabel.toLowerCase(), tone: c.pearson > 0 ? 'positive' : 'negative', icon: c.pearson > 0 ? 'Link' : 'Unlink' });
  });
  return drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

function prioritize(config: PillarIntelConfig, radar: PillarRadarAxis[], drivers: PillarDriver[]): PillarPriority {
  const worst = worstAxis(radar);
  const neg = drivers.find(d => d.tone === 'negative');
  return {
    problem: neg?.factor ?? worst.axis,
    problemDetail: `${worst.axis} caiu ${Math.abs(worst.current - worst.previous)}pts — é o eixo mais fraco de ${config.label}`,
    action: `Dedicar 30 minutos hoje para melhorar ${worst.axis.toLowerCase()}`,
    actionIcon: config.icon,
  };
}

function generateActions(config: PillarIntelConfig, radar: PillarRadarAxis[], patterns: string[]): PillarAction[] {
  const worst = worstAxis(radar);
  const actions: PillarAction[] = [
    { label: `Focar em ${worst.axis.toLowerCase()} hoje`, icon: 'Target', urgency: 'high' as const },
  ];
  if (patterns.length > 0) {
    const alertPattern = patterns.find(p => p.toLowerCase().includes('caiu') || p.toLowerCase().includes('abaixo') || p.toLowerCase().includes('nenhum'));
    if (alertPattern) actions.push({ label: 'Reverter padrão negativo detectado', icon: 'AlertTriangle', urgency: 'high' as const });
  }
  actions.push({ label: `Registrar progresso em ${config.label.toLowerCase()}`, icon: 'ClipboardList', urgency: 'medium' as const });
  return actions.slice(0, 3);
}

function generatePredictions(radar: PillarRadarAxis[], trend: number): { items: PillarPrediction[]; narrative: string } {
  const items: PillarPrediction[] = [];
  radar.forEach(ax => { const d = ax.current - ax.previous; if (Math.abs(d) > 3) items.push({ metric: ax.axis.toLowerCase(), delta: Math.round(d * 1.3), direction: d > 0 ? 'up' : 'down', days: 7 }); });
  const dec = items.filter(i => i.direction === 'down');
  let narrative: string;
  if (dec.length >= 2) narrative = 'Múltiplos indicadores em queda — ação imediata necessária';
  else if (dec.length === 1) narrative = `Se continuar, ${dec[0].metric} cairá ${Math.abs(dec[0].delta)}% em 7 dias`;
  else if (trend > 5) narrative = 'Mantendo o ritmo, você vai atingir um novo patamar em 2 semanas';
  else narrative = 'Indicadores estáveis — busque elevar com ajustes direcionados';
  return { items, narrative };
}

function detectPatterns(data: PillarIntelData): PillarPattern[] {
  const patterns: PillarPattern[] = [];
  const prodBlocks = data.timeline24h.filter(b => b.tone === 'productive');
  const drainBlocks = data.timeline24h.filter(b => b.tone === 'drain');
  if (prodBlocks.length > 0) {
    const totalProd = prodBlocks.reduce((s, b) => s + (b.end - b.start), 0);
    patterns.push({ type: 'peak', description: `${Math.round(totalProd)}h produtivas no dia — ${prodBlocks.length} blocos` });
  }
  if (drainBlocks.length > 0) {
    const totalDrain = drainBlocks.reduce((s, b) => s + (b.end - b.start), 0);
    patterns.push({ type: 'alert', description: `${Math.round(totalDrain)}h de drenagem — ${drainBlocks.length} blocos improdutivos` });
  }
  const active90 = data.heatmap90d.filter(h => h.level > 0).length;
  if (active90 > 60) patterns.push({ type: 'streak', description: `${active90} de 90 dias ativos — consistência de ${Math.round(active90 / 90 * 100)}%` });
  return patterns;
}

export function diagnosePillar(data: PillarIntelData, config: PillarIntelConfig): PillarDiagnosis {
  const { snapshot, radar, correlations } = data;
  const status = scoreToStatus(snapshot.score, snapshot.trend7d);
  const worst = worstAxis(radar);
  const best = bestAxis(radar);
  const headline = status === 'critical' ? `${config.label} em estado crítico` : status === 'declining' ? `${worst.axis} em queda` : status === 'excellent' ? `${config.label} em excelente forma` : status === 'improving' ? `${best.axis} em evolução` : `${config.label} estável`;
  const rootCause = `${worst.axis} piorou ${Math.abs(worst.current - worst.previous)}pts — principal ponto de atenção`;
  const drivers = buildDrivers(radar, correlations);
  const { items: predictions, narrative: predictionNarrative } = generatePredictions(radar, snapshot.trend7d);
  const priority = prioritize(config, radar, drivers);
  const actions = generateActions(config, radar, data.aiPatterns);
  const patterns = detectPatterns(data);
  const topCorrelations = [...correlations].sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson)).slice(0, 2);

  let snapshotStory: string;
  if (snapshot.score >= 80 && snapshot.trend7d > 0) snapshotStory = `${config.label} em evolução — mantenha a consistência`;
  else if (snapshot.trend7d > 5) snapshotStory = `Evolução detectada em ${config.label.toLowerCase()} — continue assim`;
  else if (snapshot.trend7d < -5) snapshotStory = `${config.label} em queda — ação necessária agora`;
  else snapshotStory = `${config.label} estável — busque elevar com ajustes`;

  const snapshotDiagnosis = `${worst.axis} é o ponto fraco — ${worst.current < worst.previous ? 'piorou' : 'melhorou'} ${Math.abs(worst.current - worst.previous)}pts esta semana`;

  const analysisInsights: Record<string, string> = {
    radar: `${worst.axis} é seu ponto fraco em ${config.label.toLowerCase()} — ${worst.current < worst.previous ? 'piorou' : 'melhorou'} ${Math.abs(worst.current - worst.previous)}pts`,
    mainSeries: `Tendência de ${config.mainSeriesLabel.toLowerCase()} nos últimos 30 dias`,
    distribution: `Distribuição de ${config.distLabel.toLowerCase()} no período`,
    heatmap: `Consistência de ${config.label.toLowerCase()} nos últimos 90 dias`,
  };

  const depthParts: string[] = [];
  if (patterns.length > 0) depthParts.push(patterns[0].description);
  if (topCorrelations.length > 0) depthParts.push(`${topCorrelations[0].xLabel} impacta diretamente ${topCorrelations[0].yLabel.toLowerCase()} (${corrLabel(topCorrelations[0].pearson)})`);
  const depthNarrative = depthParts.length > 0 ? depthParts.join('. ') + '.' : `Sem padrões significativos em ${config.label.toLowerCase()}.`;

  return { status, headline, rootCause, drivers, predictions, predictionNarrative, priority, actions, snapshotStory, snapshotDiagnosis, analysisInsights, depthNarrative, patterns, topCorrelations };
}
