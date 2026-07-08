// Compass — Master Data Adapter: Supabase → PillarData
// Transforms real data from existing services into PillarData shape.
import type { PillarData, AxisValue, DayPoint, HeatCell } from '../types';
import type { CompassPillarSlug } from '../pillars';
import { COMPASS_PILLAR_BY_SLUG } from '../pillars';
import { TELEMETRY_TO_COMPASS } from '../pillarMapping';
import { createEmptyPillarData } from './emptyStates';
import { 
  getTelemetryHistory, 
  getDailyMetrics, 
  getTransactions, 
  getMonthlyFinancialSummary, 
  getGoals 
} from '../../../../services/db';

const DAYS_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Build PillarData from real Supabase data. */
export async function buildPillarData(slug: CompassPillarSlug, context?: any): Promise<PillarData> {
  const config = COMPASS_PILLAR_BY_SLUG[slug];
  if (!config) throw new Error(`Pillar config not found for slug: ${slug}`);

  try {
    // 1. Fetch Real Data from Supabase
    const telemetry = context?.telemetry ?? await getTelemetryHistory(30).catch(() => []);
    const transactions = context?.transactions ?? await getTransactions('ANO').catch(() => []);
    const goals = context?.goals ?? await getGoals().catch(() => []);

    // 2. Pillar Specific Logic: FINANCE (Strictly synced with Vault)
    if (slug === 'finance') {
      const income = transactions.filter((t: any) => t.type === 'in').reduce((acc: number, t: any) => acc + t.amount, 0);
      const expense = transactions.filter((t: any) => t.type === 'out').reduce((acc: number, t: any) => acc + t.amount, 0);
      const score = income - expense;

      // Monthly history (Real only)
      const monthly = await getMonthlyFinancialSummary(12).catch(() => []);
      const evolution30 = monthly.map(m => ({ 
        day: new Date(m.month + '-01').toLocaleDateString('pt-BR', { month: 'short' }), 
        value: m.net 
      }));

      const axesNow: AxisValue[] = config.axes.map(a => {
        let val = 0;
        let raw = 'R$ 0,00';
        if (a.key === 'receita') { val = income > 0 ? 100 : 0; raw = `R$ ${income.toLocaleString('pt-BR')}`; }
        else if (a.key === 'gasto') { val = expense > 0 ? 100 : 0; raw = `R$ ${expense.toLocaleString('pt-BR')}`; }
        else if (a.key === 'reserva') { 
          const reserveGoal = goals.find((g: any) => g.category === 'Reserva' || (g.title || g.name)?.toLowerCase().includes('reserva'));
          val = reserveGoal ? (reserveGoal.current_amount / reserveGoal.target_amount) * 100 : 0;
          raw = `R$ ${(reserveGoal?.current_amount || 0).toLocaleString('pt-BR')}`;
        }
        return { key: a.key, label: a.label, value: Math.max(0, Math.min(100, val)), raw };
      });

      return {
        config,
        score,
        scorePrev: 0,
        delta7: 0,
        status: score < 0 ? 'atencao' : 'saudavel',
        sparkline: evolution30.map(v => v.value),
        axesNow,
        axesPast: axesNow.map(a => ({ ...a, value: 0 })), // Past is 0 for now to emphasize current
        today: [],
        todayInsight: score > 0 ? 'Fluxo de caixa positivo.' : 'Atenção ao saldo do período.',
        productiveHours: income,
        distractionHours: expense,
        peakHour: 0, troughHour: 0,
        week: [], weekHeat: [],
        weekInsight: `Saldo real: R$ ${score.toLocaleString('pt-BR')}`,
        weekConsistency: 100,
        problem: null,
        actions: [],
        evolution30,
        evolutionYear: evolution30,
        yearDensity: [],
        hasRealData: transactions.length > 0,
        truth: `Sincronizado com o Cofre: R$ ${score.toLocaleString('pt-BR')}.`,
        isEmpty: transactions.length === 0
      } as unknown as PillarData;
    }

    // 3. Generic Pillar Logic (Strict Telemetry)
    // Filter by key and ensure we have real entries
    const pillarTelemetry = (telemetry as any[]).filter((t: any) => {
      const mappedSlug = TELEMETRY_TO_COMPASS[t.metric_key];
      return mappedSlug === slug;
    });

    // If no telemetry OR all scores are the same (placeholder check), return empty
    const isFake = pillarTelemetry.length > 0 && pillarTelemetry.every(t => t.score === 50);
    
    if (pillarTelemetry.length === 0 || isFake) {
      return createEmptyPillarData(config);
    }

    const values = pillarTelemetry.map(t => t.score).reverse();
    const currentScore = values[values.length - 1] || 0;
    
    return {
      config,
      score: currentScore,
      scorePrev: values[0] || 0,
      delta7: 0,
      status: currentScore > 70 ? 'saudavel' : 'atencao',
      sparkline: values.slice(-14),
      axesNow: config.axes.map(a => ({ key: a.key, label: a.label, value: currentScore })),
      axesPast: config.axes.map(a => ({ key: a.key, label: a.label, value: values[0] || 0 })),
      today: [],
      todayInsight: 'Dados reais sincronizados.',
      productiveHours: 0, distractionHours: 0, peakHour: 0, troughHour: 0,
      week: [], weekHeat: [],
      weekInsight: 'Sincronizado via telemetria.',
      weekConsistency: 100,
      actions: [],
      evolution30: pillarTelemetry.slice(0, 30).map(t => ({ 
        day: new Date(t.created_at || t.recorded_date).toLocaleDateString('pt-BR', { day: '2-digit' }), 
        value: t.score 
      })),
      hasRealData: true,
      isEmpty: false
    } as unknown as PillarData;

  } catch (err) {
    console.warn(`[Compass] Data Build Error (${slug}):`, err);
    return createEmptyPillarData(config);
  }
}
