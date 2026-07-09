// Compass — Master Data Adapter: Supabase → PillarData
// Transforms real data from existing services into PillarData shape.
import type { PillarData, AxisValue, DayPoint, HeatCell } from '../types';
import type { CompassPillarSlug } from '../pillars';
import { COMPASS_PILLAR_BY_SLUG } from '../pillars';
import { TELEMETRY_TO_COMPASS, HABIT_PILLAR_TO_COMPASS } from '../pillarMapping';
import { createEmptyPillarData } from './emptyStates';
import {
  getTelemetryHistory,
  getDailyMetrics,
  getTransactions,
  getMonthlyFinancialSummary,
  getGoals,
  getUserGoals
} from '../../../../services/db';
import { listHabits, getRecentHabitLogs } from '../../../../services/habits';
import { toLocalDateStr } from '../../../../utils/dateUtils';
import { isIncomeTx, isExpenseTx } from '../../../../lib/txType';

const DAYS_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Habit.pillar (ex: 'saude', 'health', 'foco') → CompassPillarSlug. */
function habitPillarToSlug(pillar: string | null | undefined): CompassPillarSlug | null {
  if (!pillar) return null;
  const key = String(pillar).toLowerCase();
  if (HABIT_PILLAR_TO_COMPASS[key]) return HABIT_PILLAR_TO_COMPASS[key];
  if (COMPASS_PILLAR_BY_SLUG[key as CompassPillarSlug]) return key as CompassPillarSlug; // já é slug do compass
  return null;
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
      const income = transactions.filter(isIncomeTx).reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
      const expense = transactions.filter(isExpenseTx).reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0);
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

      // Normalizado 0-100 = taxa de poupança (receita / fluxo total) → radar
      const scoreNormalized = (income + expense) > 0 ? Math.round((income / (income + expense)) * 100) : 0;

      return {
        config,
        score,
        scoreNormalized,
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

    // 2.2. Pillar METAS (goals) — orientado a OBJETIVOS reais, não hábitos.
    // "Norte e progresso": lê a tabela `goals` (metas ativas + % de progresso).
    if (slug === 'goals') {
      const goalsList: any[] = context?.userGoals ?? await getUserGoals().catch(() => []);
      if (goalsList.length === 0) return createEmptyPillarData(config);

      const prog = (g: any) => {
        if (typeof g.progress === 'number' && g.progress > 0) return Math.max(0, Math.min(100, Math.round(g.progress)));
        if (g.target_value) return Math.max(0, Math.min(100, Math.round((Number(g.current_value || 0) / Number(g.target_value)) * 100)));
        return 0;
      };
      const avg = Math.round(goalsList.reduce((s, g) => s + prog(g), 0) / goalsList.length);
      const axesNow: AxisValue[] = goalsList.slice(0, 8).map((g: any) => ({
        key: g.id,
        label: g.title || 'Meta',
        value: prog(g),
        raw: g.target_value ? `${g.current_value ?? 0}/${g.target_value}${g.unit ? ' ' + g.unit : ''}` : `${prog(g)}%`,
      }));

      return {
        config,
        score: avg,
        scoreNormalized: avg,
        scorePrev: 0,
        delta7: 0,
        status: avg >= 70 ? 'saudavel' : 'atencao',
        sparkline: [],
        axesNow,
        axesPast: axesNow.map(a => ({ ...a, value: 0 })),
        today: [],
        todayInsight: `${goalsList.length} meta(s) ativa(s) · ${avg}% de progresso médio.`,
        productiveHours: 0, distractionHours: 0, peakHour: 0, troughHour: 0,
        week: [], weekHeat: [],
        weekInsight: `Progresso médio das metas: ${avg}%.`,
        weekConsistency: avg,
        problem: null,
        actions: goalsList.slice(0, 3).map((g: any) => ({
          title: `Avançar: ${g.title}`,
          why: `Meta ativa em ${prog(g)}% de progresso.`,
          when: 'Esta semana',
        })),
        evolution30: [], evolutionYear: [], yearDensity: [],
        truth: `${goalsList.length} meta(s) ativa(s) · ${avg}% de progresso médio.`,
        hasRealData: true,
        isEmpty: false,
      } as unknown as PillarData;
    }

    // 2.5. Pillar from HABITS + habit_logs (dado comportamental real)
    // O usuário cria hábitos por pilar (ex: "Academia" → saúde) e faz check-ins.
    // Isso é a fonte de verdade principal dos pilares não-financeiros.
    const habitsAll: any[] = context?.habits ?? await listHabits({ onlyActive: true }).catch(() => []);
    const pillarHabits = habitsAll.filter((h: any) => habitPillarToSlug(h.pillar) === slug);

    if (pillarHabits.length > 0) {
      const habitIds = new Set(pillarHabits.map((h: any) => h.id));
      const allLogs: any[] = context?.habitLogs ?? await getRecentHabitLogs(365).catch(() => []);
      const logs = allLogs.filter((l: any) => habitIds.has(l.habit_id));
      const dayStr = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toLocalDateStr(d); };
      const cut30 = dayStr(29);

      // Buckets: check-ins por dia local, por mês, e por hábito (últimos 30d)
      const byDay = new Map<string, number>();
      const byMonth = new Map<string, number>();
      const perHabit30 = new Map<string, number>();
      for (const l of logs) {
        const dk = toLocalDateStr(new Date(l.logged_at));
        byDay.set(dk, (byDay.get(dk) || 0) + 1);
        const mk = dk.slice(0, 7);
        byMonth.set(mk, (byMonth.get(mk) || 0) + 1);
        if (dk >= cut30) perHabit30.set(l.habit_id, (perHabit30.get(l.habit_id) || 0) + 1);
      }

      // Série dos últimos 30 dias (ordem cronológica)
      const last30: number[] = [];
      const evolution30: DayPoint[] = [];
      for (let i = 29; i >= 0; i--) {
        const ds = dayStr(i);
        const c = byDay.get(ds) || 0;
        last30.push(c);
        evolution30.push({ day: ds.slice(-2), value: c });
      }
      const sparkline = last30.slice(-14);
      const total30 = last30.reduce((a, b) => a + b, 0);
      const week = last30.slice(-7).reduce((a, b) => a + b, 0);
      const prevWeek = last30.slice(-14, -7).reduce((a, b) => a + b, 0);
      const daysActive7 = last30.slice(-7).filter(v => v > 0).length;
      const weekConsistency = Math.round((daysActive7 / 7) * 100);
      const delta7 = prevWeek > 0 ? Math.round(((week - prevWeek) / prevWeek) * 100) : (week > 0 ? 100 : 0);
      const todayCount = byDay.get(toLocalDateStr()) || 0;

      // Score normalizado 0-100 = aderência à cadência pretendida de cada hábito
      // (diário: alvo×30d · semanal: alvo×~4,3sem). Comparável entre pilares → radar.
      const ratios = pillarHabits.map((h: any) => {
        const tc = Math.max(1, Number(h.target_count) || 1);
        const expected = h.frequency === 'daily' ? 30 * tc : h.frequency === 'weekly' ? (30 / 7) * tc : tc;
        const actual = perHabit30.get(h.id) || 0;
        return expected > 0 ? Math.min(1, actual / expected) : 0;
      });
      const scoreNormalized = Math.round((ratios.reduce((a, b) => a + b, 0) / (ratios.length || 1)) * 100);

      // "Eixos do Pilar" = os HÁBITOS REAIS do usuário + contagem real de check-ins
      // (30d). NÃO inventar métricas (sono/hidratação/etc.) que o app nunca coletou.
      const maxHabit = Math.max(1, ...pillarHabits.map((h: any) => perHabit30.get(h.id) || 0));
      const axesNow: AxisValue[] = pillarHabits.map((h: any) => {
        const c = perHabit30.get(h.id) || 0;
        return {
          key: h.id,
          label: h.title,
          value: Math.round((c / maxHabit) * 100),
          raw: `${c} check-in${c === 1 ? '' : 's'}`,
        };
      });

      // Longo prazo: 12 meses (Ciclo de Vida) e densidade 365 dias (estilo GitHub)
      const evolutionYear: DayPoint[] = [];
      const base = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
        const mk = toLocalDateStr(d).slice(0, 7);
        evolutionYear.push({ day: mk, value: byMonth.get(mk) || 0 });
      }
      const yearDensity: any[] = [];
      for (let i = 364; i >= 0; i--) {
        const ds = dayStr(i);
        yearDensity.push({ date: ds, count: byDay.get(ds) || 0 });
      }

      return {
        config,
        score: total30,
        scoreNormalized,
        scorePrev: prevWeek,
        delta7,
        status: week > 0 ? 'saudavel' : 'atencao',
        sparkline,
        axesNow,
        axesPast: axesNow.map(a => ({ ...a, value: 0 })),
        today: [],
        todayInsight: todayCount > 0
          ? `${todayCount} check-in(s) hoje em ${config.name}.`
          : `Nenhum check-in hoje em ${config.name}.`,
        productiveHours: 0, distractionHours: 0, peakHour: 0, troughHour: 0,
        week: [], weekHeat: [],
        weekInsight: `${week} check-in(s) nos últimos 7 dias · ${weekConsistency}% de consistência.`,
        weekConsistency,
        problem: null,
        actions: pillarHabits.slice(0, 3).map((h: any) => ({
          title: `Manter: ${h.title}`,
          why: `Hábito ativo do pilar ${config.name}.`,
          when: h.frequency === 'weekly' ? 'Esta semana' : 'Hoje',
        })),
        evolution30,
        evolutionYear,
        yearDensity,
        truth: `${logs.length} check-in(s) registrado(s) em ${config.name} · ${pillarHabits.length} hábito(s) ativo(s).`,
        hasRealData: true,
        isEmpty: false,
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
      scoreNormalized: Math.max(0, Math.min(100, currentScore)),
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
