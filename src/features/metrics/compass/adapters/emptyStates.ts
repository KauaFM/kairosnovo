// Compass — Empty State Generators
import type { PillarData, PillarConfig, AxisValue, HeatCell } from '../types';

export function createEmptyPillarData(config: PillarConfig): PillarData {
  const axesZero: AxisValue[] = config.axes.map(a => ({ key: a.key, label: a.label, value: 0 }));
  const emptyWeek = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => ({ day: d, value: 0 }));
  const emptyHeat: HeatCell[] = [];
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) emptyHeat.push({ day: d, hour: h, intensity: 0 });

  return {
    config, score: 0, scoreNormalized: 0, scorePrev: 0, delta7: 0, status: 'atencao', sparkline: [],
    axesNow: axesZero, axesPast: axesZero,
    today: [], todayInsight: 'Sem dados ainda. Comece registrando seu dia.',
    productiveHours: 0, distractionHours: 0, peakHour: 0, troughHour: 0, recurringDistraction: null,
    week: emptyWeek, weekHeat: emptyHeat, weekInsight: 'Sem dados da semana.',
    weekConsistency: 0,
    problem: { title: 'Sem dados suficientes', detail: 'Registre atividades.', cause: 'Nenhuma atividade registrada.' },
    actions: [
      { title: `Registrar 1 atividade em ${config.name}`, why: 'Sem dados, não há diagnóstico.', when: 'Agora' },
      { title: `Criar hábito de ${config.name}`, why: 'Hábitos alimentam métricas.', when: 'Hoje' },
      { title: 'Registrar como foi o dia', why: 'Base de toda inteligência.', when: 'Antes de dormir' },
    ],
    evolution30: [], scatter: [], scatterCorrelation: 0,
    sankey: { nodes: [], links: [] },
    prediction: { positive: 'Registre dados para previsões.', negative: 'Sem dados para projetar.', trend: 0, projected30: 0 },
    truth: `${config.name} ainda não tem dados. O primeiro passo é registrar.`,
    hasRealData: false, isEmpty: true,
  };
}
