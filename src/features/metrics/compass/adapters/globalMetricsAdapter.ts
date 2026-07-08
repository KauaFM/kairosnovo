// Compass — Global Metrics Adapter (Strict Real Data from Supabase)
import type { GlobalMetrics } from '../types';
import type { CompassPillarSlug } from '../pillars';
import { COMPASS_PILLARS } from '../pillars';
import { buildPillarData } from './pillarDataAdapter';
import { getStreak, getWeekActivity, getProfile, getMonthlyFinancialSummary, getDailyMetrics, getTelemetryHistory, getDailyStats, getTransactions, getDashboard } from '../../../../services/db';
import { listHabitsWithTodayStatus } from '../../../../services/habits';

export async function buildGlobalMetrics(): Promise<GlobalMetrics> {
  try {
    const [streakVal, weekAct, profile, monthlyFin, yearMetrics, telemetry, dailyStats, habits, transactions, dashboard] = await Promise.all([
      getStreak().catch(() => 0),
      getWeekActivity().catch(() => []),
      getProfile().catch(() => null),
      getMonthlyFinancialSummary(36).catch(() => []),
      getDailyMetrics(365).catch(() => []), // fetch real 365 days of metrics
      getTelemetryHistory(30).catch(() => []),
      getDailyStats().catch(() => ({ tasks_completed: 0, tasks_total: 0, focus_minutes: 0 })),
      listHabitsWithTodayStatus().catch(() => []),
      getTransactions('MES').catch(() => []),
      getDashboard().catch(() => null),
    ]);

    const context = {
      telemetry,
      dailyMetrics: yearMetrics.slice(0, 30), // we already fetched 365, so just pass the first 30 for PillarData
      weekActivity: weekAct,
      streak: streakVal,
      dailyStats,
      habits,
      transactions
    };

    // Build all pillar data
    const pillarResults = await Promise.all(
      COMPASS_PILLARS.map(async (p) => {
        const data = await buildPillarData(p.slug as CompassPillarSlug, context);
        return { slug: p.slug, data };
      })
    );

    const nonEmpty = pillarResults.filter(r => !r.data.isEmpty && r.data.hasRealData);
    const hasData = nonEmpty.length > 0;

    const scores = nonEmpty.map(r => r.data.score);
    const scoreAvg = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
    
    const prevScores = nonEmpty.map(r => r.data.scorePrev);
    const scoreAvgPrev = prevScores.length > 0 ? Math.round(prevScores.reduce((s, v) => s + v, 0) / prevScores.length) : 0;
    
    const delta7 = scoreAvg - scoreAvgPrev;
    const critical = nonEmpty.filter(r => r.data.status === 'critico').length;
    const rising = nonEmpty.filter(r => r.data.delta7 > 0).length;

    const balance = COMPASS_PILLARS.map(p => {
      const res = pillarResults.find(r => r.slug === p.slug);
      return {
        key: p.slug,
        label: p.name.toUpperCase(),
        value: res?.data.score || 0,
        valuePast: res?.data.scorePrev || 0,
      };
    });

    // Week activity (Real data)
    const weekActArr = (weekAct || []) as boolean[];
    const activeDays = weekActArr.filter(Boolean).length;
    const consistency = Math.round((activeDays / 7) * 100);

    // XP (Real data from dashboard and profile)
    const xpTotal = dashboard?.xp_score ?? (profile as any)?.xp ?? 0;
    const xpWeek = (profile as any)?.weekly_xp ?? Math.round(activeDays * 18); // fallback to manual if weekly_xp doesn't exist

    // Multi-year from financial summary (Real data)
    const multiYear = (monthlyFin as any[]).map((m: any) => {
      const [y, mo] = (m.month || '').split('-');
      const date = new Date(+y, +mo - 1, 1);
      return {
        label: date.toLocaleDateString('pt-BR', { month: 'short' }),
        value: Math.round(m.net || 0),
        year: +y || new Date().getFullYear(),
      };
    });
    const first = multiYear[0]?.value || 0;
    const last = multiYear[multiYear.length - 1]?.value || 0;
    const multiYearGrowthPct = first !== 0 ? Math.round(((last - first) / Math.abs(first)) * 100) : 0;

    // Year execution map (Real data from daily_metrics)
    const yearMap: { day: number; intensity: number }[] = [];
    let yearExecutedDays = 0;
    let curStreak = 0, bestStreak = 0;
    
    // Create a dictionary of real activity dates
    const dailyMap = new Map();
    if (yearMetrics && yearMetrics.length > 0) {
      yearMetrics.forEach((m: any) => {
        dailyMap.set(m.day, m.overall_score || m.tasks_completed || 0);
      });
    }

    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - (364 - i));
      const dateStr = d.toISOString().slice(0, 10);
      
      const score = dailyMap.get(dateStr);
      let intensity = 0;
      if (score && score > 0) {
        intensity = score > 50 ? 0.8 : 0.4;
        yearExecutedDays++;
        curStreak++;
        bestStreak = Math.max(bestStreak, curStreak);
      } else {
        curStreak = 0;
      }
      yearMap.push({ day: i, intensity });
    }

    return {
      scoreAvg, scoreAvgPrev, delta7, critical, rising, balance,
      streak: streakVal as number,
      consistency, activeDays,
      xpTotal, xpWeek,
      multiYear, multiYearGrowthPct,
      yearMap, yearExecutedDays, yearStreak: bestStreak,
      hasRealData: hasData,
    };
  } catch (err) {
    console.warn('[Compass] Failed to build global metrics:', err);
    return {
      scoreAvg: 0, scoreAvgPrev: 0, delta7: 0, critical: 0, rising: 0,
      balance: COMPASS_PILLARS.map(p => ({ key: p.slug, label: p.name.toUpperCase(), value: 0, valuePast: 0 })),
      streak: 0, consistency: 0, activeDays: 0, xpTotal: 0, xpWeek: 0,
      multiYear: [], multiYearGrowthPct: 0,
      yearMap: [], yearExecutedDays: 0, yearStreak: 0,
      hasRealData: false,
    };
  }
}
