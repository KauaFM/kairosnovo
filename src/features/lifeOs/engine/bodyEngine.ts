// =============================================================
// ORVAX · Life OS — Body Intelligence Engine
// Motor de interpretação corpo: treino, sono, nutrição, recuperação.
// =============================================================
import type {
  BodyData, BodyDiagnosis, BodyStatus, BodyDriver, BodyPriority,
  BodyAction, BodyPrediction, BodyTimePattern, BodyCorrelation, BodyRadarAxis,
} from '../data/bodyTypes';
import type { TimelineBlock } from '../components/charts/primitives/ExecutionTimeline';

function worstAxis(radar: BodyRadarAxis[]): BodyRadarAxis {
  return radar.reduce((w, ax) => (ax.current - ax.previous) < (w.current - w.previous) ? ax : w, radar[0]);
}

function bestAxis(radar: BodyRadarAxis[]): BodyRadarAxis {
  return radar.reduce((w, ax) => (ax.current - ax.previous) > (w.current - w.previous) ? ax : w, radar[0]);
}

function corrLabel(r: number): string {
  const abs = Math.abs(r);
  return abs >= 0.7 ? 'correlação alta' : abs >= 0.4 ? 'correlação moderada' : 'correlação fraca';
}

function scoreToStatus(score: number, trend: number): BodyStatus {
  if (score < 30) return 'critical';
  if (score < 50 || trend < -10) return 'declining';
  if (score >= 80 && trend > 5) return 'excellent';
  if (trend > 3) return 'improving';
  return 'stable';
}

function statusHeadline(status: BodyStatus, best: BodyRadarAxis, worst: BodyRadarAxis): string {
  switch (status) {
    case 'critical':  return 'Corpo em estado crítico';
    case 'declining': return `${worst.axis} em queda`;
    case 'stable':    return 'Corpo estável';
    case 'improving': return `${best.axis} em evolução`;
    case 'excellent': return 'Excelente condição física';
  }
}

function buildDrivers(radar: BodyRadarAxis[], correlations: BodyCorrelation[]): BodyDriver[] {
  const drivers: BodyDriver[] = [];
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
  const top = [...correlations].sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson)).slice(0, 2);
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

function prioritize(drivers: BodyDriver[], radar: BodyRadarAxis[], sleepAvg: number): BodyPriority {
  const worst = worstAxis(radar);
  if (worst.axis.toLowerCase() === 'sono' && sleepAvg < 7) {
    return {
      problem: 'Sono insuficiente',
      problemDetail: `Média de ${sleepAvg.toFixed(1)}h — abaixo das 7h recomendadas`,
      action: 'Dormir 30min mais cedo hoje e criar rotina pré-sono',
      actionIcon: 'Moon',
    };
  }
  if (worst.axis.toLowerCase() === 'recuperação') {
    return {
      problem: 'Recuperação deficiente',
      problemDetail: `Seu corpo não está recuperando entre treinos — risco de lesão`,
      action: 'Incluir 1 dia de descanso ativo e alongamento',
      actionIcon: 'Heart',
    };
  }
  const negDriver = drivers.find(d => d.tone === 'negative');
  return {
    problem: negDriver?.factor ?? worst.axis,
    problemDetail: `${worst.axis} caiu ${Math.abs(worst.current - worst.previous)}pts esta semana`,
    action: `Focar em melhorar ${worst.axis.toLowerCase()} com ação direcionada`,
    actionIcon: 'Target',
  };
}

function generateActions(radar: BodyRadarAxis[], sleepAvg: number): BodyAction[] {
  const actions: BodyAction[] = [];
  const worst = worstAxis(radar);
  if (worst.axis.toLowerCase() === 'sono' || sleepAvg < 7) {
    actions.push({ label: 'Dormir 30min mais cedo hoje', icon: 'Moon', urgency: 'high' });
  }
  if (worst.axis.toLowerCase() === 'recuperação') {
    actions.push({ label: 'Fazer 15min de alongamento agora', icon: 'Activity', urgency: 'high' });
  }
  actions.push({ label: 'Treinar 45min hoje (força)', icon: 'Dumbbell', urgency: 'medium' });
  if (actions.length < 3) {
    actions.push({ label: 'Beber 2L de água até o fim do dia', icon: 'Droplets', urgency: 'medium' });
  }
  const seen = new Set<string>();
  return actions.filter(a => { if (seen.has(a.label)) return false; seen.add(a.label); return true; }).slice(0, 3);
}

function generatePredictions(radar: BodyRadarAxis[], trend7d: number): { items: BodyPrediction[]; narrative: string } {
  const items: BodyPrediction[] = [];
  radar.forEach(ax => {
    const delta = ax.current - ax.previous;
    if (Math.abs(delta) > 3) {
      items.push({ metric: ax.axis.toLowerCase(), delta: Math.round(delta * 1.3), direction: delta > 0 ? 'up' : 'down', days: 7 });
    }
  });
  const declining = items.filter(i => i.direction === 'down');
  let narrative: string;
  if (declining.length >= 2) narrative = 'Se nada mudar, sua performance física vai cair progressivamente nos próximos dias';
  else if (declining.length === 1) narrative = `Se continuar, seu ${declining[0].metric} cairá ${Math.abs(declining[0].delta)}% em 7 dias`;
  else if (trend7d > 5) narrative = 'Mantendo o ritmo atual, você vai atingir um novo patamar físico em 2 semanas';
  else narrative = 'Indicadores físicos estáveis — busque elevar com ajustes no sono e treino';
  return { items, narrative };
}

function detectPatterns(timeline: TimelineBlock[], workoutCount: number): BodyTimePattern[] {
  const patterns: BodyTimePattern[] = [];
  const productive = timeline.filter(b => b.tone === 'productive' && b.meta?.toLowerCase().includes('treino'));
  if (productive.length > 0) {
    const block = productive[0];
    patterns.push({ type: 'peak_performance', description: `Seu melhor horário de treino é às ${String(Math.floor(block.start)).padStart(2, '0')}h` });
  }
  const drains = timeline.filter(b => b.tone === 'drain');
  if (drains.length > 0) {
    const total = drains.reduce((s, b) => s + (b.end - b.start), 0);
    patterns.push({ type: 'recovery_needed', description: `${Math.round(total)}h do dia são sedentárias — impacta recuperação` });
  }
  if (workoutCount >= 5) {
    patterns.push({ type: 'streak', description: `${workoutCount} treinos em 7 dias — consistência alta` });
  }
  return patterns;
}

export function diagnoseBody(data: BodyData): BodyDiagnosis {
  const { snapshot, radar, correlations, timeline24h, sleepLog, workoutLog, nutrition } = data;
  const status = scoreToStatus(snapshot.score, snapshot.trend7d);
  const worst = worstAxis(radar);
  const best = bestAxis(radar);
  const headline = statusHeadline(status, best, worst);
  const sleepAvg = sleepLog.reduce((s, e) => s + e.hours, 0) / Math.max(1, sleepLog.length);
  const rootCause = worst.axis.toLowerCase() === 'sono'
    ? `Sono médio de ${sleepAvg.toFixed(1)}h está impactando recuperação e performance`
    : `${worst.axis} piorou ${Math.abs(worst.current - worst.previous)}pts — principal fator de risco`;
  const drivers = buildDrivers(radar, correlations);
  const { items: predictions, narrative: predictionNarrative } = generatePredictions(radar, snapshot.trend7d);
  const priority = prioritize(drivers, radar, sleepAvg);
  const actions = generateActions(radar, sleepAvg);
  const patterns = detectPatterns(timeline24h, workoutLog.filter(w => w.type !== 'Descanso ativo').length);
  const topCorrelations = [...correlations].sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson)).slice(0, 2);

  // Storytelling
  let snapshotStory: string;
  if (snapshot.score >= 80 && snapshot.trend7d > 0) snapshotStory = 'Seu corpo está evoluindo — mantenha a consistência';
  else if (snapshot.trend7d > 5) snapshotStory = 'Evolução física detectada — seus treinos estão gerando resultado';
  else if (snapshot.trend7d < -5) snapshotStory = 'Corpo em queda — ajuste sono e intensidade de treino';
  else snapshotStory = 'Corpo estável — busque elevar com ajustes no sono';

  let snapshotDiagnosis: string;
  if (worst.axis.toLowerCase() === 'sono' && sleepAvg < 7) {
    snapshotDiagnosis = `Sono é o ponto fraco — média de ${sleepAvg.toFixed(1)}h afeta recuperação e performance`;
  } else {
    snapshotDiagnosis = `${worst.axis} precisa de atenção — caiu ${Math.abs(worst.current - worst.previous)}pts esta semana`;
  }

  const proteinPct = nutrition.find(n => n.label.toLowerCase().includes('proteína'))?.value ?? 0;

  const analysisInsights: Record<string, string> = {
    radar: `${worst.axis} é seu ponto fraco físico — ${worst.current < worst.previous ? 'piorou' : 'melhorou'} ${Math.abs(worst.current - worst.previous)}pts`,
    workout: `${workoutLog.filter(w => w.type !== 'Descanso ativo').length} treinos em 7 dias — intensidade média ${(workoutLog.reduce((s, w) => s + w.intensity, 0) / workoutLog.length).toFixed(1)}/10`,
    sleep: sleepAvg < 7 ? `Sono médio de ${sleepAvg.toFixed(1)}h — abaixo do mínimo de 7h para recuperação` : `Sono adequado — ${sleepAvg.toFixed(1)}h de média`,
    nutrition: proteinPct >= 30 ? `Proteína em ${proteinPct}% — nível adequado para recuperação muscular` : `Proteína em ${proteinPct}% — pode estar baixa para ganho muscular`,
    heatmap: `Consistência de treino nos últimos 90 dias`,
  };

  const depthParts: string[] = [];
  if (patterns.length > 0) depthParts.push(patterns[0].description);
  if (topCorrelations.length > 0) depthParts.push(`${topCorrelations[0].xLabel} impacta diretamente ${topCorrelations[0].yLabel.toLowerCase()} (${corrLabel(topCorrelations[0].pearson)})`);
  const depthNarrative = depthParts.length > 0 ? depthParts.join('. ') + '.' : 'Sem padrões significativos detectados.';

  return {
    status, headline, rootCause, drivers, predictions, predictionNarrative,
    priority, actions, snapshotStory, snapshotDiagnosis, analysisInsights,
    depthNarrative, patterns, topCorrelations,
  };
}
