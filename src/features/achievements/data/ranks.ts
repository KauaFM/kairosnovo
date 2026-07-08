// =============================================================
// ORVAX · Cartas de Evolução — definição dos ranks.
//
// Cada rank vira uma carta que o usuário desbloqueia ao atingir
// o XP requerido. Os nomes são arquetípicos · português puro · sem
// gamification cliché.
// =============================================================

export type RankSlug =
  | 'despertar'
  | 'iniciante'
  | 'aprendiz'
  | 'disciplinado'
  | 'construtor'
  | 'resoluto'
  | 'perseverante'
  | 'comandante'
  | 'mestre'
  | 'visionario'
  | 'legado'
  | 'soberano';

export interface Rank {
  /** identificador estável */
  slug:        RankSlug;
  /** índice ordinal · 1..12 */
  ordinal:     number;
  /** "Despertar", "Iniciante" — usado em destaque */
  name:        string;
  /** XP necessário pra desbloquear · 0 = primeiro */
  xpRequired:  number;
  /** subtítulo curto · "começo silencioso", "primeira disciplina" */
  subtitle:    string;
  /** frase motivacional revelada na carta */
  phrase:      string;
  /** mensagem de progresso · "agora você entrou na arena" */
  progressMsg: string;
  /** ícone Lucide name */
  icon:        string;
  /** acento sempre é #10B981 — esse campo é apenas pra hint visual */
  archetype:   'inicio' | 'forja' | 'comando' | 'lenda';
}

export const RANKS: Rank[] = [
  // ─── Início · arquétipo silencioso ────────────────────────
  {
    slug: 'despertar',
    ordinal: 1,
    name: 'Despertar',
    xpRequired: 0,
    subtitle: 'O primeiro registro',
    phrase:
      'Toda construção começa com um único ato consciente.\nVocê acabou de fazer o seu.',
    progressMsg: 'Você entrou no sistema.',
    icon: 'Sunrise',
    archetype: 'inicio',
  },
  {
    slug: 'iniciante',
    ordinal: 2,
    name: 'Iniciante',
    xpRequired: 200,
    subtitle: 'Primeiros padrões',
    phrase:
      'Você fez o que a maioria não faz: voltou no segundo dia.\nIsso é raro.',
    progressMsg: 'Constância > intensidade.',
    icon: 'Footprints',
    archetype: 'inicio',
  },
  {
    slug: 'aprendiz',
    ordinal: 3,
    name: 'Aprendiz',
    xpRequired: 500,
    subtitle: 'Você está estudando a si mesmo',
    phrase:
      'Cada registro é uma página da sua autobiografia operacional.\nO sistema agora começa a te conhecer.',
    progressMsg: 'O espelho começa a se formar.',
    icon: 'BookOpen',
    archetype: 'inicio',
  },

  // ─── Forja · arquétipo de construção ──────────────────────
  {
    slug: 'disciplinado',
    ordinal: 4,
    name: 'Disciplinado',
    xpRequired: 1000,
    subtitle: 'Hábito virou identidade',
    phrase:
      'Você não precisa mais querer fazer.\nApenas faz.',
    progressMsg: 'A disciplina parou de ser conflito.',
    icon: 'Anchor',
    archetype: 'forja',
  },
  {
    slug: 'construtor',
    ordinal: 5,
    name: 'Construtor',
    xpRequired: 1800,
    subtitle: 'Você está empilhando tijolos invisíveis',
    phrase:
      'Cada dia comum é uma camada.\nNinguém vê. Mas a base existe.',
    progressMsg: 'O alicerce está firme.',
    icon: 'Hammer',
    archetype: 'forja',
  },
  {
    slug: 'resoluto',
    ordinal: 6,
    name: 'Resoluto',
    xpRequired: 3000,
    subtitle: 'Decisão sem ruído',
    phrase:
      'Você parou de negociar com a própria fraqueza.\nQuando decide, executa.',
    progressMsg: 'O ruído interno baixou.',
    icon: 'Compass',
    archetype: 'forja',
  },
  {
    slug: 'perseverante',
    ordinal: 7,
    name: 'Perseverante',
    xpRequired: 4500,
    subtitle: 'Você ultrapassou o ponto de desistência',
    phrase:
      'A maioria abandona aqui.\nVocê seguiu.',
    progressMsg: 'Você quebrou o gargalo.',
    icon: 'Flame',
    archetype: 'forja',
  },

  // ─── Comando · arquétipo de domínio ───────────────────────
  {
    slug: 'comandante',
    ordinal: 8,
    name: 'Comandante',
    xpRequired: 6500,
    subtitle: 'Você lidera a si mesmo',
    phrase:
      'Sua rotina obedece sua intenção.\nNão o contrário.',
    progressMsg: 'Você ganhou autoridade interna.',
    icon: 'Shield',
    archetype: 'comando',
  },
  {
    slug: 'mestre',
    ordinal: 9,
    name: 'Mestre',
    xpRequired: 9000,
    subtitle: 'Você ensina mesmo sem falar',
    phrase:
      'O sistema agora é uma extensão sua.\nVocê opera no instinto refinado.',
    progressMsg: 'A consciência virou ferramenta.',
    icon: 'Crown',
    archetype: 'comando',
  },

  // ─── Lenda · arquétipo de transcendência ──────────────────
  {
    slug: 'visionario',
    ordinal: 10,
    name: 'Visionário',
    xpRequired: 12000,
    subtitle: 'Você enxerga padrões antes que apareçam',
    phrase:
      'Você antecipa.\nIsso muda tudo.',
    progressMsg: 'O futuro deixa de ser surpresa.',
    icon: 'Eye',
    archetype: 'lenda',
  },
  {
    slug: 'legado',
    ordinal: 11,
    name: 'Legado',
    xpRequired: 16000,
    subtitle: 'Você está escrevendo algo durável',
    phrase:
      'O que você constrói agora ressoa além de você.\nA escala muda.',
    progressMsg: 'Sua execução virou referência.',
    icon: 'Mountain',
    archetype: 'lenda',
  },
  {
    slug: 'soberano',
    ordinal: 12,
    name: 'Soberano',
    xpRequired: 22000,
    subtitle: 'Domínio absoluto da própria operação',
    phrase:
      'Você não é mais o produto do sistema.\nVocê é o próprio sistema.',
    progressMsg: 'Você atingiu o topo da pirâmide.',
    icon: 'Sun',
    archetype: 'lenda',
  },
];

export const RANK_BY_SLUG: Record<RankSlug, Rank> =
  RANKS.reduce((acc, r) => ({ ...acc, [r.slug]: r }), {} as Record<RankSlug, Rank>);

/** rank atual baseado no XP acumulado · sempre o mais alto desbloqueado */
export function getCurrentRank(xp: number): Rank {
  const sorted = [...RANKS].sort((a, b) => b.xpRequired - a.xpRequired);
  return sorted.find(r => xp >= r.xpRequired) ?? RANKS[0];
}

/** próximo rank · null se já estiver no topo */
export function getNextRank(xp: number): Rank | null {
  const sorted = [...RANKS].sort((a, b) => a.xpRequired - b.xpRequired);
  return sorted.find(r => r.xpRequired > xp) ?? null;
}

/** progresso 0..1 dentro do rank atual */
export function getRankProgress(xp: number): {
  current: Rank;
  next:    Rank | null;
  pct:     number;
  remaining: number;
} {
  const current = getCurrentRank(xp);
  const next    = getNextRank(xp);
  if (!next) return { current, next: null, pct: 1, remaining: 0 };
  const span    = next.xpRequired - current.xpRequired;
  const into    = xp - current.xpRequired;
  return {
    current,
    next,
    pct: Math.max(0, Math.min(1, into / span)),
    remaining: Math.max(0, next.xpRequired - xp),
  };
}
