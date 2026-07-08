// =============================================================
// ORVAX · Life OS — Body Mock Data
// Dados realistas para treino, sono, peso, nutrição.
// =============================================================
import type {
  BodyData, BodyRadarAxis, BodySeriesPoint, NutritionSummary, BodyCorrelation,
  WorkoutDay, SleepEntry,
} from './bodyTypes';
import type { TimelineBlock } from '../components/charts/primitives/ExecutionTimeline';

export const BODY_ACCENT = '#22C55E'; // green-500

// ─── Snapshot ───────────────────────────────────────────────
const snapshot = {
  score: 76,
  trend7d: +5,
  sparkline7d: [71, 73, 74, 75, 74, 78, 76],
};

// ─── Radar ──────────────────────────────────────────────────
const radar: BodyRadarAxis[] = [
  { axis: 'Força',        current: 82, previous: 75 },
  { axis: 'Resistência',  current: 68, previous: 65 },
  { axis: 'Sono',         current: 55, previous: 62 },
  { axis: 'Nutrição',     current: 71, previous: 68 },
  { axis: 'Recuperação',  current: 60, previous: 58 },
];

// ─── Workout series 30d ─────────────────────────────────────
function buildWorkoutSeries(days = 30): BodySeriesPoint[] {
  const out: BodySeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const isRest = d.getDay() === 0 || d.getDay() === 3;
    const wave = Math.sin((i + 2) / 3.5) * 15;
    const base = isRest ? 0 : 55;
    const value = Math.max(0, Math.round(base + wave + ((i * 3 + 7) % 5) * 2));
    out.push({
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      value,
      avg: 0,
    });
  }
  for (let i = 0; i < out.length; i++) {
    const window = out.slice(Math.max(0, i - 6), i + 1);
    out[i].avg = Math.round(window.reduce((s, p) => s + p.value, 0) / window.length);
  }
  return out;
}

// ─── Sleep series 30d ───────────────────────────────────────
function buildSleepSeries(days = 30): BodySeriesPoint[] {
  const out: BodySeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const wave = Math.sin((i + 4) / 4.2) * 1.2;
    const base = 6.5;
    const jitter = ((i * 5 + 3) % 7) * 0.15;
    const value = Math.round((base + wave + jitter) * 10) / 10;
    out.push({
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      value: Math.max(4, Math.min(9.5, value)),
      avg: 0,
    });
  }
  for (let i = 0; i < out.length; i++) {
    const window = out.slice(Math.max(0, i - 6), i + 1);
    out[i].avg = Math.round(window.reduce((s, p) => s + p.value, 0) / window.length * 10) / 10;
  }
  return out;
}

// ─── Heatmap 90d ────────────────────────────────────────────
function buildHeatmap(days = 90) {
  const out: { date: string; level: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const isRest = d.getDay() === 0;
    const wave = Math.sin((i + 3) / 5.5);
    const base = wave > 0.3 ? 3 : wave > -0.2 ? 2 : 1;
    const level = isRest ? Math.max(0, base - 2) : Math.min(4, base + ((i * 11 + 5) % 7 > 4 ? 1 : 0));
    out.push({ date: d.toISOString().slice(0, 10), level });
  }
  return out;
}

// ─── Nutrition ──────────────────────────────────────────────
const nutrition: NutritionSummary[] = [
  { label: 'Proteína',      value: 35, color: BODY_ACCENT },
  { label: 'Carboidratos',  value: 40, color: '#3b82f6' },
  { label: 'Gordura',       value: 25, color: '#f59e0b' },
];

// ─── Workout log (últimos 7 dias) ───────────────────────────
const workoutLog: WorkoutDay[] = [
  { date: new Date(Date.now() - 86400000 * 0).toISOString().slice(0, 10), type: 'Força', duration: 65, intensity: 8 },
  { date: new Date(Date.now() - 86400000 * 1).toISOString().slice(0, 10), type: 'Cardio', duration: 40, intensity: 6 },
  { date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10), type: 'HIIT', duration: 30, intensity: 9 },
  { date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10), type: 'Descanso ativo', duration: 20, intensity: 3 },
  { date: new Date(Date.now() - 86400000 * 4).toISOString().slice(0, 10), type: 'Força', duration: 70, intensity: 8 },
  { date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10), type: 'Cardio', duration: 45, intensity: 7 },
  { date: new Date(Date.now() - 86400000 * 6).toISOString().slice(0, 10), type: 'Força', duration: 60, intensity: 7 },
];

// ─── Sleep log ──────────────────────────────────────────────
const sleepLog: SleepEntry[] = Array.from({ length: 7 }, (_, i) => ({
  date: new Date(Date.now() - 86400000 * i).toISOString().slice(0, 10),
  hours: +(6 + Math.sin(i / 2) * 1.5 + ((i * 3 + 2) % 4) * 0.2).toFixed(1),
  quality: Math.min(10, Math.max(4, Math.round(6 + Math.sin(i / 1.8) * 2))),
}));

// ─── Timeline 24h ───────────────────────────────────────────
const timeline24h: TimelineBlock[] = [
  { start: 5.5,  end: 6,   label: 'Despertar',    tone: 'productive', meta: '30m' },
  { start: 6,    end: 7.5, label: 'Treino',        tone: 'productive', meta: '1h30 · força' },
  { start: 7.5,  end: 8,   label: 'Café da manhã', tone: 'neutral',    meta: '30m' },
  { start: 8,    end: 12,  label: 'Trabalho',      tone: 'neutral',    meta: '4h' },
  { start: 12,   end: 13,  label: 'Almoço',        tone: 'productive', meta: '1h · refeição balanceada' },
  { start: 13,   end: 17,  label: 'Trabalho',      tone: 'neutral',    meta: '4h' },
  { start: 17,   end: 18,  label: 'Lanche',        tone: 'neutral',    meta: '1h' },
  { start: 18,   end: 19.5,label: 'Cardio leve',   tone: 'productive', meta: '1h30 · caminhada' },
  { start: 20,   end: 21,  label: 'Jantar',        tone: 'productive', meta: '1h · proteína' },
  { start: 21,   end: 22.5,label: 'Sedentário',    tone: 'drain',      meta: '1h30 · sofá' },
  { start: 22.5, end: 23,  label: 'Prep sono',     tone: 'productive', meta: '30m · rotina' },
];

// ─── Correlations ───────────────────────────────────────────
function buildCorrelation(xL: string, yL: string, n: number, rTarget: number, seed: number): BodyCorrelation {
  const data: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const noise = ((seed * (i + 1) * 7) % 100) / 100 - 0.5;
    const x = 4 + ((i / n) * 5) + noise * 1.5;
    const y = rTarget > 0 ? 30 + x * 8 + noise * 12 : 85 - x * 5 + noise * 12;
    data.push({ x: Math.round(x * 10) / 10, y: Math.round(y) });
  }
  const mx = data.reduce((s, d) => s + d.x, 0) / n;
  const my = data.reduce((s, d) => s + d.y, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  data.forEach(d => { const dx = d.x - mx; const dy = d.y - my; num += dx * dy; dx2 += dx * dx; dy2 += dy * dy; });
  const pearson = Math.round((num / (Math.sqrt(dx2 * dy2) || 1)) * 100) / 100;
  return { xLabel: xL, yLabel: yL, data, pearson };
}

const correlations: BodyCorrelation[] = [
  buildCorrelation('Horas de sono', 'Performance treino', 20, 0.72, 31),
  buildCorrelation('Intensidade treino', 'Qualidade sono', 20, 0.58, 47),
  buildCorrelation('Proteína (g)', 'Recuperação muscular', 20, 0.65, 59),
];

// ─── Export ─────────────────────────────────────────────────
export const BODY_MOCK: BodyData = {
  snapshot,
  radar,
  workoutSeries30d: buildWorkoutSeries(30),
  sleepSeries30d: buildSleepSeries(30),
  heatmap90d: buildHeatmap(90),
  nutrition,
  workoutLog,
  sleepLog,
  correlations,
  timeline24h,
};
