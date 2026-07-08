// =============================================================
// ORVAX · Life OS — Finance Intelligence Engine
// =============================================================
import type { FinanceIntelData, FinanceDiagnosis, FinanceStatus, FinanceDriver, FinancePriority, FinanceAction, FinancePrediction, FinancePattern, FinanceCorrelation, FinanceRadarAxis } from '../data/financeTypes';

function worstAxis(r: FinanceRadarAxis[]): FinanceRadarAxis { return r.reduce((w, a) => (a.current - a.previous) < (w.current - w.previous) ? a : w, r[0]); }
function bestAxis(r: FinanceRadarAxis[]): FinanceRadarAxis { return r.reduce((w, a) => (a.current - a.previous) > (w.current - w.previous) ? a : w, r[0]); }
function corrLabel(r: number): string { const a = Math.abs(r); return a >= 0.7 ? 'correlação alta' : a >= 0.4 ? 'correlação moderada' : 'correlação fraca'; }
const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function scoreToStatus(score: number, trend: number): FinanceStatus {
  if (score < 30) return 'critical';
  if (score < 50 || trend < -10) return 'declining';
  if (score >= 80 && trend > 5) return 'excellent';
  if (trend > 3) return 'improving';
  return 'stable';
}

function buildDrivers(radar: FinanceRadarAxis[], correlations: FinanceCorrelation[]): FinanceDriver[] {
  const drivers: FinanceDriver[] = [];
  radar.forEach(ax => {
    const delta = ax.current - ax.previous;
    if (Math.abs(delta) > 2) drivers.push({ factor: ax.axis, impact: delta, metric: ax.axis.toLowerCase(), tone: delta > 0 ? 'positive' : 'negative', icon: delta > 0 ? 'TrendingUp' : 'TrendingDown' });
  });
  [...correlations].sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson)).slice(0, 2).forEach(c => {
    drivers.push({ factor: `${c.xLabel} → ${c.yLabel}`, impact: Math.round(c.pearson * 100), metric: c.yLabel.toLowerCase(), tone: c.pearson > 0 ? 'positive' : 'negative', icon: c.pearson > 0 ? 'Link' : 'Unlink' });
  });
  return drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

function prioritize(d: FinanceIntelData, drivers: FinanceDriver[]): FinancePriority {
  if (d.savingsRate < 0.1) return { problem: 'Taxa de poupança crítica', problemDetail: `Apenas ${Math.round(d.savingsRate * 100)}% da renda está sendo poupada`, action: 'Reduzir gastos com lazer em 30% esta semana', actionIcon: 'Wallet' };
  const topCat = d.categories[0];
  if (topCat && topCat.pct > 45) return { problem: `${topCat.label} domina gastos`, problemDetail: `${topCat.pct}% dos gastos estão concentrados em ${topCat.label.toLowerCase()}`, action: 'Revisar contratos e buscar alternativas mais baratas', actionIcon: 'Search' };
  const negDriver = drivers.find(dr => dr.tone === 'negative');
  return { problem: negDriver?.factor ?? 'Controle de gastos', problemDetail: `Controle financeiro caiu ${Math.abs(negDriver?.impact ?? 4)}pts`, action: 'Registrar todos os gastos hoje e avaliar cortes', actionIcon: 'ClipboardList' };
}

function generateActions(d: FinanceIntelData): FinanceAction[] {
  const actions: FinanceAction[] = [];
  if (d.savingsRate < 0.2) actions.push({ label: 'Separar 20% da próxima renda para reserva', icon: 'PiggyBank', urgency: 'high' });
  const lazer = d.categories.find(c => c.label.toLowerCase() === 'lazer');
  if (lazer && lazer.pct > 8) actions.push({ label: `Reduzir gastos com lazer (${lazer.pct}% do total)`, icon: 'Scissors', urgency: 'high' });
  actions.push({ label: 'Revisar assinaturas e serviços recorrentes', icon: 'RefreshCw', urgency: 'medium' });
  return actions.slice(0, 3);
}

function generatePredictions(radar: FinanceRadarAxis[], trend: number): { items: FinancePrediction[]; narrative: string } {
  const items: FinancePrediction[] = [];
  radar.forEach(ax => { const d = ax.current - ax.previous; if (Math.abs(d) > 2) items.push({ metric: ax.axis.toLowerCase(), delta: Math.round(d * 1.4), direction: d > 0 ? 'up' : 'down', days: 7 }); });
  const dec = items.filter(i => i.direction === 'down');
  let narrative = dec.length >= 2 ? 'Se nada mudar, seu controle financeiro vai se deteriorar' : dec.length === 1 ? `${dec[0].metric} cairá ${Math.abs(dec[0].delta)}% em 7 dias se continuar assim` : trend > 3 ? 'Mantendo o ritmo, sua saúde financeira vai melhorar significativamente' : 'Indicadores financeiros estáveis — busque otimizar poupança';
  return { items, narrative };
}

function detectPatterns(d: FinanceIntelData): FinancePattern[] {
  const patterns: FinancePattern[] = [];
  if (d.savingsRate > 0.2) patterns.push({ type: 'savings_streak', description: `Taxa de poupança de ${Math.round(d.savingsRate * 100)}% — acima da meta de 20%` });
  const topCat = d.categories[0];
  if (topCat && topCat.pct > 40) patterns.push({ type: 'category_alert', description: `${topCat.label} concentra ${topCat.pct}% dos seus gastos — atenção` });
  const weekendDrain = d.timeline24h.filter(b => b.tone === 'drain');
  if (weekendDrain.length > 2) patterns.push({ type: 'spending_spike', description: `${weekendDrain.length} momentos de gasto no dia — padrão de consumo reativo` });
  return patterns;
}

export function diagnoseFinance(data: FinanceIntelData): FinanceDiagnosis {
  const { snapshot, radar, correlations, categories } = data;
  const status = scoreToStatus(snapshot.score, snapshot.trend7d);
  const worst = worstAxis(radar);
  const best = bestAxis(radar);
  const headline = status === 'critical' ? 'Finanças em estado crítico' : status === 'declining' ? `${worst.axis} em queda` : status === 'excellent' ? 'Saúde financeira excelente' : status === 'improving' ? `${best.axis} em evolução` : 'Finanças estáveis';
  const rootCause = worst.axis.toLowerCase().includes('controle') ? `Controle de gastos piorou ${Math.abs(worst.current - worst.previous)}pts — gastos reativos` : `${worst.axis} é o eixo mais fraco — caiu ${Math.abs(worst.current - worst.previous)}pts`;
  const drivers = buildDrivers(radar, correlations);
  const { items: predictions, narrative: predictionNarrative } = generatePredictions(radar, snapshot.trend7d);
  const priority = prioritize(data, drivers);
  const actions = generateActions(data);
  const patterns = detectPatterns(data);
  const topCorrelations = [...correlations].sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson)).slice(0, 2);

  let snapshotStory: string;
  if (snapshot.score >= 80 && snapshot.trend7d > 0) snapshotStory = 'Suas finanças estão evoluindo — mantenha a disciplina';
  else if (snapshot.trend7d > 3) snapshotStory = 'Evolução financeira detectada — continue economizando';
  else if (snapshot.trend7d < -5) snapshotStory = 'Cuidado — seus gastos estão saindo do controle';
  else snapshotStory = 'Finanças estáveis — busque elevar sua taxa de poupança';

  let snapshotDiagnosis: string;
  if (data.savingsRate < 0.1) snapshotDiagnosis = `Taxa de poupança de apenas ${Math.round(data.savingsRate * 100)}% — abaixo do mínimo seguro`;
  else if (categories[0] && categories[0].pct > 45) snapshotDiagnosis = `${categories[0].label} concentra ${categories[0].pct}% dos gastos — desbalanceado`;
  else snapshotDiagnosis = `Saldo de ${fmtBRL(data.balance)} com taxa de poupança de ${Math.round(data.savingsRate * 100)}%`;

  const analysisInsights: Record<string, string> = {
    radar: `${worst.axis} é seu ponto fraco — ${worst.current < worst.previous ? 'piorou' : 'melhorou'} ${Math.abs(worst.current - worst.previous)}pts`,
    income: `Receita total de ${fmtBRL(data.totalIncome)} vs despesa de ${fmtBRL(data.totalExpense)} no período`,
    categories: `${categories[0]?.label} é a maior categoria de gasto — ${categories[0]?.pct}% do total`,
    savings: data.savingsRate >= 0.2 ? `Taxa de poupança de ${Math.round(data.savingsRate * 100)}% — acima da meta` : `Taxa de poupança de ${Math.round(data.savingsRate * 100)}% — abaixo da meta de 20%`,
    heatmap: `Consistência de registros nos últimos 90 dias`,
  };

  const depthParts: string[] = [];
  if (patterns.length > 0) depthParts.push(patterns[0].description);
  if (topCorrelations.length > 0) depthParts.push(`${topCorrelations[0].xLabel} impacta diretamente ${topCorrelations[0].yLabel.toLowerCase()} (${corrLabel(topCorrelations[0].pearson)})`);
  const depthNarrative = depthParts.length > 0 ? depthParts.join('. ') + '.' : 'Sem padrões financeiros significativos.';

  return { status, headline, rootCause, drivers, predictions, predictionNarrative, priority, actions, snapshotStory, snapshotDiagnosis, analysisInsights, depthNarrative, patterns, topCorrelations };
}
