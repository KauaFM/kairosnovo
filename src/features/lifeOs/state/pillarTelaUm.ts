// =============================================================
// ORVAX · pillarTelaUm — Tier 1 metadata por pilar.
// Score 0-100 · status (verde/amarelo/vermelho) · storytelling phrase
// É a "frase de capa" que aparece no card de cada pilar.
//
// Determinístico no v1; em produção virá de getPillarScore() agregando
// histórico real do usuário no Supabase.
// =============================================================
import type { PillarKey } from '../types';

export type PillarStatus = 'good' | 'attention' | 'critical';

export interface PillarTelaUm {
  /** score 0-100 · derivado da consistência + delta + qualidade */
  score:    number;
  status:   PillarStatus;
  /** % vs período anterior (semana) */
  trendPct: number;
  /** subtítulo · interpretação curta · 1 linha · "Boa estabilidade nos últimos dias" */
  subtitle: string;
  /** storytelling · frase humana que interpreta · "Seu foco está melhorando, mas..." */
  story:    string;
}

const RAW: Record<PillarKey, PillarTelaUm> = {
  health: {
    score:    78,
    trendPct: +9,
    subtitle: 'Corpo respondendo bem',
    story:    'Treinos consistentes · sono ainda irregular nos finais de semana',
    status:   'good',
  },
  mind: {
    score:    74,
    trendPct: +12,
    subtitle: 'Estabilidade mental crescente',
    story:    'Foco está melhorando · ansiedade base ainda alta nas tardes',
    status:   'good',
  },
  finance: {
    score:    82,
    trendPct: +8,
    subtitle: 'Saldo no positivo',
    story:    'Gastos previsíveis · reserva crescendo de forma orgânica',
    status:   'good',
  },
  career: {
    score:    65,
    trendPct: -2,
    subtitle: 'Atenção · estudo abaixo do plano',
    story:    'Execução firme em projetos · estudo está caindo nas últimas 2 semanas',
    status:   'attention',
  },
  relationships: {
    score:    71,
    trendPct: +5,
    subtitle: 'Vínculos profundos',
    story:    'Tempo de qualidade com família alto · presença plena na maior parte',
    status:   'good',
  },
  productivity: {
    score:    80,
    trendPct: +18,
    subtitle: 'Deep work em alta',
    story:    'Sessões consistentes de foco profundo · quebras curtas e voluntárias',
    status:   'good',
  },
  wellbeing: {
    score:    68,
    trendPct: 0,
    subtitle: 'Estável · sem grandes picos',
    story:    'Humor médio estável · pequenas oscilações nas terças e quintas',
    status:   'attention',
  },
  environment: {
    score:    72,
    trendPct: +4,
    subtitle: 'Setup otimizado pra foco',
    story:    'Casa organizada · zero atrito visível em ambiente de trabalho',
    status:   'good',
  },
  leisure: {
    score:    60,
    trendPct: -6,
    subtitle: 'Recuperação ainda fraca',
    story:    'Descanso virou produtivo demais · você tá esquecendo de não-fazer-nada',
    status:   'attention',
  },
  meaning: {
    score:    76,
    trendPct: +9,
    subtitle: 'Propósito claro',
    story:    'Reflexão regular · gratidões diárias · alinhamento crescendo',
    status:   'good',
  },
};

export function getPillarTelaUm(key: PillarKey): PillarTelaUm {
  return RAW[key];
}

export function statusOf(score: number): PillarStatus {
  if (score >= 70) return 'good';
  if (score >= 50) return 'attention';
  return 'critical';
}

// Tom visual por status · usado no card e no header dos deep dives
export const STATUS_DOT: Record<PillarStatus, string> = {
  good:      'bg-emerald-500',
  attention: 'bg-amber-500',
  critical:  'bg-rose-500',
};

export const STATUS_LABEL: Record<PillarStatus, string> = {
  good:      'BOM',
  attention: 'ATENÇÃO',
  critical:  'CRÍTICO',
};

export const STATUS_RING: Record<PillarStatus, string> = {
  good:      'ring-emerald-500/30',
  attention: 'ring-amber-500/30',
  critical:  'ring-rose-500/30',
};
