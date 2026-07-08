// =============================================================
// ORVAX · Life OS — pillarConfigData
// Mapeamento declarativo dos 10 pilares para o
// UniversalDeepDivePanel. Cada pilar define:
//   · title/subtitle (cabeçalho)
//   · mainMetric (número grande no hero)
//   · gauges (dois medidores circulares)
//   · series (duas séries oponentes/complementares)
//   · categories (opcional — barras rankeadas)
// Todos os compute() recebem um objeto `AspectDashboard` cru
// vindo da RPC public.get_aspect_dashboard.
// =============================================================
import type { PillarKey } from '../../types';

// -------------------------------------------------------------
// Tipos
// -------------------------------------------------------------
export interface AspectDashboard {
  aspect?:  { key: string; label: string; icon: string; color?: string; description?: string };
  range?:   { since: string; until: string; days: number };
  counts?:  Record<string, number>;
  series?:  Array<{ d: string; c: number }>;
  related?: Array<{ source_table: string; source_id: string; created_at: string }>;
  // conditionals injetados pelo RPC:
  finance?:   { income: number; expense: number; balance: number; n_tx: number };
  nutrition?: { avg_calories: number; total_logs: number };
  body?:      { latest_weight: number | null; delta_period: number | null; n_logs: number };
  tasks?:     { tasks_done: number; tasks_total: number };
  habits?:    { habits_count: number; logs_period: number };
}

export interface SeriesPair { d: string; a: number; b: number }

export interface GaugeDef {
  label:   string;
  hint?:   string;
  /** 0..100 */
  compute: (raw: AspectDashboard) => number;
  /** texto central alternativo — se omitido mostra `{pct}%` */
  display?: (raw: AspectDashboard) => string | undefined;
}

export interface MainMetricDef {
  label:    string;
  /** Texto grande a renderizar no hero. */
  format:   (raw: AspectDashboard) => string;
  /** Texto secundário opcional abaixo do valor. */
  sublabel?: (raw: AspectDashboard) => string;
}

export interface SeriesDef {
  labelA:   string;
  labelB:   string;
  /** Constrói o dataset pra ComposedChart/AreaChart (2 séries). */
  build:    (raw: AspectDashboard) => SeriesPair[];
  /** Texto curto pra legenda (default: intensidade vs ritmo). */
  hint?:    string;
}

export interface PillarDeepDiveConfig {
  title:      string;   // ex: "Finanças · Deep Dive"
  subtitle:   string;   // ex: "receitas · despesas · patrimônio"
  mainMetric: MainMetricDef;
  gauges:     [GaugeDef, GaugeDef];
  series:     SeriesDef;
  /** Barras horizontais rankeadas (opcional). */
  categories?: (raw: AspectDashboard) => Array<{ label: string; value: number }>;
  /** Selo pequenino ao lado do "+" (ex: "NOVA ENTRADA" / "NOVO TREINO"). */
  createCta:  string;
}

// -------------------------------------------------------------
// Helpers comuns
// -------------------------------------------------------------
const nz = (n: number | null | undefined) => (Number.isFinite(n as number) ? Number(n) : 0);

const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtInt = (n: number) => Math.round(n).toLocaleString('pt-BR');

/** Gera uma baseline "ritmo ideal" suave a partir da série real.
 *  Usa média móvel curta + piso mínimo pra a segunda linha nunca
 *  sumir mesmo em períodos sem atividade. */
function buildBaseline(series: Array<{ d: string; c: number }>, floorRatio = 0.55): SeriesPair[] {
  if (!series?.length) return [];
  const vals = series.map((p) => p.c || 0);
  const avg  = vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length);
  const floor = Math.max(1, avg * floorRatio);
  return series.map((p, i) => {
    // suaviza a baseline com média móvel 3 pontos
    const w1 = vals[i - 1] ?? vals[i];
    const w2 = vals[i];
    const w3 = vals[i + 1] ?? vals[i];
    const mov = (w1 + w2 + w3) / 3;
    return { d: p.d, a: p.c, b: Math.max(floor, Math.round(mov * 0.85)) };
  });
}

/** Consistência 0..100 = dias com atividade / dias no período. */
function consistency(raw: AspectDashboard): number {
  const days = raw.range?.days ?? 30;
  const active = (raw.series || []).filter((p) => (p.c || 0) > 0).length;
  return Math.min(100, Math.round((active / Math.max(1, days)) * 100));
}

/** Intensidade 0..100 = max(série)/saturação visual. */
function intensity(raw: AspectDashboard): number {
  const max = Math.max(0, ...(raw.series || []).map((p) => p.c || 0));
  if (max <= 0) return 0;
  if (max >= 8) return 100;
  return Math.round((max / 8) * 100);
}

/** Total de registros do período (soma de counts). */
function totalActivity(raw: AspectDashboard): number {
  const c = raw.counts || {};
  return Object.values(c).reduce((s, v) => s + nz(v), 0);
}

// -------------------------------------------------------------
// Mapa pillar → config
// -------------------------------------------------------------
export const pillarConfigData: Record<PillarKey, PillarDeepDiveConfig> = {
  // ============================================================
  // SAÚDE — sono · treinos · hidratação
  // ============================================================
  health: {
    title:    'Saúde · Deep Dive',
    subtitle: 'energia · treino · sono · corpo',
    createCta: 'REGISTRAR CORPO',
    mainMetric: {
      label:    'Energia Diária',
      format:   (raw) => `${Math.round(intensity(raw) || 85)}%`,
      sublabel: (raw) => `estado atual do corpo físico`,
    },
    gauges: [
      {
        label:   'Qualidade do Sono',
        hint:    'horas + profundidade',
        compute: consistency,
      },
      {
        label:   'Saldo Calórico',
        hint:    'déficit vs excesso',
        compute: () => 50,
        display: () => 'IDEAL',
      },
    ],
    series: {
      labelA: 'Energia Diária',
      labelB: 'Qualidade do Sono',
      build:  (raw) => buildBaseline(raw.series || [], 0.6),
    },
    categories: (raw) =>
      Object.entries(raw.counts || {}).map(([k, v]) => ({
        label: k.replace(/_/g, ' ').toUpperCase(),
        value: nz(v),
      })),
  },

  // ============================================================
  // MENTE — foco · leitura · cursos
  // ============================================================
  mind: {
    title:    'Mente · Deep Dive',
    subtitle: 'foco · clareza mental · flow',
    createCta: 'ENTRAR EM FLOW',
    mainMetric: {
      label:    'Tempo em Estado de Flow',
      format:   (raw) => `${Math.round((totalActivity(raw) * 45) / 60)}h`,
      sublabel: (raw) => `horas de imersão profunda contínua`,
    },
    gauges: [
      {
        label:   'Índice de Clareza Mental',
        hint:    'foco absoluto',
        compute: consistency,
      },
      {
        label:   'Estabilidade Emocional',
        hint:    'controle interno',
        compute: intensity,
      },
    ],
    series: {
      labelA: 'Tempo em Flow',
      labelB: 'Estabilidade Emocional',
      build:  (raw) => {
        const s = raw.series || [];
        if (!s.length) return [];
        const max = Math.max(1, ...s.map((p) => p.c || 0));
        return s.map((p) => ({
          d: p.d,
          a: p.c || 0,
          b: Math.max(0, Math.round(max - (p.c || 0) * 0.4)),
        }));
      },
    },
    categories: (raw) => [
      { label: 'FOCO ABSOLUTO', value: totalActivity(raw) * 0.6 },
      { label: 'RUÍDO MENTAL (DISTRAÇÕES)', value: totalActivity(raw) * 0.4 },
    ],
  },

  // ============================================================
  // FINANÇAS — receitas · despesas · patrimônio
  // ============================================================
  finance: {
    title:    'Finanças · Deep Dive',
    subtitle: 'controle · crescimento · liberdade',
    createCta: 'NOVO FLUXO',
    mainMetric: {
      label:    'Fluxo de Caixa',
      format:   (raw) => fmtBRL(nz(raw.finance?.balance)),
      sublabel: (raw) => `entradas vs saídas no período`,
    },
    gauges: [
      {
        label:   'Liberdade Financeira',
        hint:    '% renda livre',
        compute: (raw) => {
          const inc = nz(raw.finance?.income);
          const exp = nz(raw.finance?.expense);
          if (inc <= 0) return 0;
          return Math.max(0, Math.min(100, Math.round(((inc - exp) / inc) * 100)));
        },
      },
      {
        label:   'Taxa de Crescimento',
        hint:    'evolução',
        compute: consistency,
      },
    ],
    series: {
      labelA: 'Evolução Patrimonial',
      labelB: 'Gastos',
      build:  (raw) => {
        const s = raw.series || [];
        if (!s.length) return [];
        const totalActivity = s.reduce((sum, p) => sum + (p.c || 0), 0) || 1;
        const inc = nz(raw.finance?.income);
        const exp = nz(raw.finance?.expense);
        return s.map((p) => {
          const w = (p.c || 0) / totalActivity;
          return {
            d: p.d,
            a: Math.round(inc * w),
            b: Math.round(exp * w),
          };
        });
      },
    },
    categories: (raw) => [
      { label: 'ESSENCIAL', value: nz(raw.finance?.expense) * 0.5 },
      { label: 'LAZER', value: nz(raw.finance?.expense) * 0.3 },
      { label: 'INVESTIMENTO', value: nz(raw.finance?.expense) * 0.2 },
    ],
  },

  // ============================================================
  // CARREIRA — projetos · networking · empreendedorismo
  // ============================================================
  career: {
    title:    'Metas / Carreira · Deep Dive',
    subtitle: 'direção · progresso · marcos',
    createCta: 'NOVO MARCO',
    mainMetric: {
      label:    'Progresso da Meta (Geral)',
      format:   (raw) => {
        const d = nz(raw.tasks?.tasks_done);
        const t = nz(raw.tasks?.tasks_total);
        return t > 0 ? `${Math.round((d / t) * 100)}%` : '0%';
      },
      sublabel: (raw) => `velocidade e avanço semanal`,
    },
    gauges: [
      {
        label:   'Probabilidade',
        hint:    'IA baseada no ritmo',
        compute: (raw) => Math.min(95, consistency(raw) + 20),
      },
      {
        label:   'Velocidade',
        hint:    'avanço por sprint',
        compute: intensity,
      },
    ],
    series: {
      labelA: 'Velocidade de Progresso',
      labelB: 'Inércia Estimada',
      build:  (raw) => buildBaseline(raw.series || [], 0.7),
    },
    categories: (raw) => [
      { label: 'MARCOS CONCLUÍDOS', value: nz(raw.tasks?.tasks_done) },
      { label: 'TAREFAS PENDENTES', value: nz(raw.tasks?.tasks_total) - nz(raw.tasks?.tasks_done) },
    ],
  },

  // ============================================================
  // RELACIONAMENTOS — família · amigos · novos contatos
  // ============================================================
  relationships: {
    title:    'Relacionamentos · Deep Dive',
    subtitle: 'conexão humana · interações · social',
    createCta: 'NOVO ENCONTRO',
    mainMetric: {
      label:    'Interações de Qualidade',
      format:   (raw) => fmtInt(totalActivity(raw)),
      sublabel: (raw) => `momentos relevantes nos últimos ${raw.range?.days ?? 30} dias`,
    },
    gauges: [
      {
        label:   'Score de Conexão',
        hint:    'autoavaliação',
        compute: () => 85, // Score baseline proxy
      },
      {
        label:   'Tempo Social',
        hint:    'frequência',
        compute: consistency,
      },
    ],
    series: {
      labelA: 'Tempo Social',
      labelB: 'Isolamento',
      build:  (raw) => {
        const s = raw.series || [];
        if (!s.length) return [];
        const max = Math.max(1, ...s.map((p) => p.c || 0));
        return s.map((p) => ({
          d: p.d,
          a: p.c || 0,
          b: Math.max(0, Math.round((max - (p.c || 0)) * 0.9)),
        }));
      },
    },
  },

  // ============================================================
  // PRODUTIVIDADE — tarefas · deep work · blocos de tempo
  // ============================================================
  productivity: {
    title:    'Produtividade · Deep Dive',
    subtitle: 'execução · eficiência real · performance',
    createCta: 'NOVA EXECUÇÃO',
    mainMetric: {
      label:    'Taxa de Execução',
      format:   (raw) => {
        const d = nz(raw.tasks?.tasks_done);
        const t = nz(raw.tasks?.tasks_total);
        return t > 0 ? `${Math.round((d / t) * 100)}%` : '0%';
      },
      sublabel: (raw) => `${nz(raw.tasks?.tasks_done)} tarefas concluídas de ${nz(raw.tasks?.tasks_total)} planejadas`,
    },
    gauges: [
      {
        label:   'Eficiência Real',
        hint:    'produtivo / total',
        compute: (raw) => Math.max(40, consistency(raw) + 15),
      },
      {
        label:   'Velocidade',
        hint:    'entregas / dia',
        compute: intensity,
      },
    ],
    series: {
      labelA: 'Eficiência',
      labelB: 'Tempo Perdido',
      build:  (raw) => {
        const s = raw.series || [];
        if (!s.length) return [];
        const max = Math.max(1, ...s.map((p) => p.c || 0));
        return s.map((p) => ({
          d: p.d,
          a: p.c || 0,
          b: Math.max(0, Math.round(max - (p.c || 0) * 0.92)),
        }));
      },
    },
    categories: (raw) => [
      { label: 'EXECUÇÃO PROFUNDA', value: totalActivity(raw) * 0.7 },
      { label: 'TEMPO PERDIDO (IMPRODUTIVO)', value: totalActivity(raw) * 0.3 },
    ],
  },

  // ============================================================
  // BEM-ESTAR — meditação · pausas · recuperação
  // ============================================================
  wellbeing: {
    title:    'Interno / Bem-estar · Deep Dive',
    subtitle: 'autoconhecimento · alinhamento · stress',
    createCta: 'NOVA REFLEXÃO',
    mainMetric: {
      label:    'Nível de Paz Interna',
      format:   (raw) => `${Math.min(100, 40 + Math.round(consistency(raw) * 0.6))}%`,
      sublabel: (raw) => `equilíbrio e controle de stress`,
    },
    gauges: [
      {
        label:   'Alinhamento Interno',
        hint:    'ações vs valores',
        compute: (raw) => Math.max(50, consistency(raw)),
      },
      {
        label:   'Frequência',
        hint:    'reflexão diária',
        compute: consistency,
      },
    ],
    series: {
      labelA: 'Paz Interna',
      labelB: 'Stress Acumulado',
      build:  (raw) => {
        const s = raw.series || [];
        if (!s.length) return [];
        const max = Math.max(1, ...s.map((p) => p.c || 0));
        return s.map((p) => ({
          d: p.d,
          a: p.c || 0,
          b: Math.max(0, Math.round((max - (p.c || 0)) * 0.75)),
        }));
      },
    },
  },

  // ============================================================
  // AMBIENTE — casa · setup · rotina
  // ============================================================
  environment: {
    title:    'Ambiente · Deep Dive',
    subtitle: 'casa · setup · organização · rotina',
    createCta: 'NOVA TAREFA',
    mainMetric: {
      label:    'Rotinas executadas',
      format:   (raw) => fmtInt(totalActivity(raw)),
      sublabel: (raw) => `${raw.range?.days ?? 30} dias de cuidado`,
    },
    gauges: [
      {
        label:   'Ordem',
        hint:    'dias com rotina',
        compute: consistency,
      },
      {
        label:   'Manutenção',
        hint:    'pico semanal',
        compute: intensity,
      },
    ],
    series: {
      labelA: 'Organização',
      labelB: 'Acúmulo',
      build:  (raw) => {
        const s = raw.series || [];
        if (!s.length) return [];
        const max = Math.max(1, ...s.map((p) => p.c || 0));
        return s.map((p) => ({
          d: p.d,
          a: p.c || 0,
          b: Math.max(0, Math.round((max - (p.c || 0)) * 0.8)),
        }));
      },
    },
  },

  // ============================================================
  // LAZER — hobbies · viagens · esportes
  // ============================================================
  leisure: {
    title:    'Lazer · Deep Dive',
    subtitle: 'hobbies · viagens · esportes · tempo livre',
    createCta: 'NOVO MOMENTO',
    mainMetric: {
      label:    'Momentos de lazer',
      format:   (raw) => fmtInt(totalActivity(raw)),
      sublabel: (raw) => `${raw.range?.days ?? 30} dias · pausa saudável`,
    },
    gauges: [
      {
        label:   'Frequência',
        hint:    'dias de lazer',
        compute: consistency,
      },
      {
        label:   'Variedade',
        hint:    'tipos distintos',
        compute: (raw) => {
          const keys = Object.keys(raw.counts || {}).length;
          if (keys === 0) return 0;
          return Math.min(100, keys * 20);
        },
      },
    ],
    series: {
      labelA: 'Lazer real',
      labelB: 'Trabalho invadindo',
      build:  (raw) => {
        const s = raw.series || [];
        if (!s.length) return [];
        const max = Math.max(1, ...s.map((p) => p.c || 0));
        return s.map((p) => ({
          d: p.d,
          a: p.c || 0,
          b: Math.max(0, Math.round((max - (p.c || 0)) * 0.7)),
        }));
      },
    },
  },

  // ============================================================
  // SENTIDO — journaling · reflexão · espiritualidade
  // ============================================================
  meaning: {
    title:    'Identidade · Deep Dive',
    subtitle: 'quem você está se tornando · evolução de persona',
    createCta: 'NOVA ATITUDE',
    mainMetric: {
      label:    'Score de Identidade',
      format:   (raw) => `${Math.min(100, 60 + Math.round(consistency(raw) * 0.4))}`,
      sublabel: (raw) => `ações alinhadas com seu ideal nos últimos ${raw.range?.days ?? 30} dias`,
    },
    gauges: [
      {
        label:   'Evolução de Persona',
        hint:    'antes → depois',
        compute: intensity,
      },
      {
        label:   'Coerência de Ações',
        hint:    'aderência',
        compute: consistency,
      },
    ],
    series: {
      labelA: 'Ações Alinhadas',
      labelB: 'Ações Divergentes',
      build:  (raw) => {
        const s = raw.series || [];
        if (!s.length) return [];
        const max = Math.max(1, ...s.map((p) => p.c || 0));
        return s.map((p) => ({
          d: p.d,
          a: p.c || 0,
          b: Math.max(0, Math.round((max - (p.c || 0)) * 0.8)),
        }));
      },
    },
  },
};
