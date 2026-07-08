// =============================================================
// Compass — 12 Pillar Configs (canonical, English slugs)
// =============================================================
import type { PillarConfig } from './types';

export type CompassPillarSlug =
  | 'mind' | 'health' | 'nutrition' | 'finance' | 'career' | 'goals'
  | 'relationships' | 'internal' | 'habits' | 'learning' | 'leisure' | 'identity';

export const COMPASS_PILLARS: PillarConfig[] = [
  {
    slug: 'mind', name: 'Mente', tagline: 'Foco, clareza e energia cognitiva',
    axes: [
      { key: 'foco', label: 'Foco' },
      { key: 'ansiedade', label: 'Ansiedade', inverted: true },
      { key: 'clareza', label: 'Clareza' },
      { key: 'estabilidade', label: 'Estabilidade' },
      { key: 'energia', label: 'Energia cognitiva' },
    ],
    activities: [
      { key: 'deep_work', label: 'Deep work', type: 'produtivo' },
      { key: 'leitura', label: 'Leitura', type: 'produtivo' },
      { key: 'meditacao', label: 'Meditação', type: 'produtivo' },
      { key: 'redes', label: 'Redes sociais', type: 'distracao' },
      { key: 'noticias', label: 'Notícias', type: 'distracao' },
      { key: 'transicao', label: 'Transição', type: 'neutro' },
    ],
    impacts: ['Produtividade', 'Bem-estar emocional', 'Qualidade de decisão'],
    keyHabit: '30 min de foco profundo antes das 10h',
    priority: 'Reduzir tempo em redes sociais à tarde',
    correlation: { x: 'Horas de sono', y: 'Foco médio', label: 'Sono ↔ Foco' },
  },
  {
    slug: 'health', name: 'Saúde', tagline: 'Corpo, sono e vitalidade',
    axes: [
      { key: 'sono', label: 'Sono' }, { key: 'exercicio', label: 'Exercício' },
      { key: 'hidratacao', label: 'Hidratação' }, { key: 'energia', label: 'Energia física' },
      { key: 'recuperacao', label: 'Recuperação' },
    ],
    activities: [
      { key: 'treino', label: 'Treino', type: 'produtivo' },
      { key: 'caminhada', label: 'Caminhada', type: 'produtivo' },
      { key: 'sono_q', label: 'Sono qualidade', type: 'produtivo' },
      { key: 'sedentarismo', label: 'Sedentarismo', type: 'distracao' },
      { key: 'alcool', label: 'Álcool', type: 'distracao' },
      { key: 'transicao', label: 'Transição', type: 'neutro' },
    ],
    impacts: ['Energia diária', 'Longevidade', 'Humor'],
    keyHabit: 'Dormir antes das 23h', priority: 'Treinar 4x na semana',
    correlation: { x: 'Passos/dia', y: 'Energia', label: 'Movimento ↔ Energia' },
  },
  {
    slug: 'nutrition', name: 'Nutrição', tagline: 'Combustível e composição',
    axes: [
      { key: 'proteina', label: 'Proteína' }, { key: 'fibra', label: 'Fibra' },
      { key: 'ultraproc', label: 'Ultraprocessados', inverted: true },
      { key: 'agua', label: 'Água' }, { key: 'consist', label: 'Consistência' },
    ],
    activities: [
      { key: 'refeicao_real', label: 'Refeição real', type: 'produtivo' },
      { key: 'preparo', label: 'Preparo', type: 'produtivo' },
      { key: 'junk', label: 'Junk food', type: 'distracao' },
      { key: 'delivery', label: 'Delivery rápido', type: 'distracao' },
      { key: 'lanche', label: 'Lanche neutro', type: 'neutro' },
    ],
    impacts: ['Energia', 'Foco', 'Composição corporal'],
    keyHabit: '1.6g de proteína por kg', priority: 'Cortar ultraprocessados à noite',
    correlation: { x: 'Proteína (g)', y: 'Saciedade', label: 'Proteína ↔ Saciedade' },
  },
  {
    slug: 'finance', name: 'Financeiro', tagline: 'Fluxo, reserva e direção',
    axes: [
      { key: 'receita', label: 'Receita' }, { key: 'gasto', label: 'Gasto', inverted: true },
      { key: 'reserva', label: 'Reserva' }, { key: 'investido', label: 'Investido' },
      { key: 'consciencia', label: 'Consciência' },
    ],
    activities: [
      { key: 'trabalho', label: 'Trabalho remunerado', type: 'produtivo' },
      { key: 'invest', label: 'Investir', type: 'produtivo' },
      { key: 'impulso', label: 'Compra por impulso', type: 'distracao' },
      { key: 'subscr', label: 'Assinaturas inúteis', type: 'distracao' },
      { key: 'essencial', label: 'Gasto essencial', type: 'neutro' },
    ],
    impacts: ['Liberdade', 'Estresse', 'Opções de futuro'],
    keyHabit: 'Revisar gastos toda sexta', priority: 'Aumentar taxa de poupança',
    correlation: { x: 'Gasto/dia', y: 'Estresse', label: 'Gasto ↔ Estresse' },
  },
  {
    slug: 'career', name: 'Carreira', tagline: 'Skill, output e reputação',
    axes: [
      { key: 'output', label: 'Output' }, { key: 'skill', label: 'Skill' },
      { key: 'rede', label: 'Rede' }, { key: 'visibilidade', label: 'Visibilidade' },
      { key: 'estrategia', label: 'Estratégia' },
    ],
    activities: [
      { key: 'deepwork', label: 'Trabalho criativo', type: 'produtivo' },
      { key: 'estudo', label: 'Estudo aplicado', type: 'produtivo' },
      { key: 'reunioes', label: 'Reuniões inúteis', type: 'distracao' },
      { key: 'email', label: 'Email reativo', type: 'distracao' },
      { key: 'admin', label: 'Admin necessário', type: 'neutro' },
    ],
    impacts: ['Renda', 'Identidade', 'Oportunidades'],
    keyHabit: '1 entrega significativa por dia', priority: 'Eliminar 50% das reuniões',
    correlation: { x: 'Horas focadas', y: 'Output', label: 'Foco ↔ Output' },
  },
  {
    slug: 'goals', name: 'Metas', tagline: 'Norte e progresso',
    axes: [
      { key: 'clareza', label: 'Clareza' }, { key: 'progresso', label: 'Progresso' },
      { key: 'consistencia', label: 'Consistência' }, { key: 'alinhamento', label: 'Alinhamento' },
      { key: 'ambicao', label: 'Ambição' },
    ],
    activities: [
      { key: 'execucao', label: 'Execução de meta', type: 'produtivo' },
      { key: 'review', label: 'Review semanal', type: 'produtivo' },
      { key: 'drift', label: 'Drift', type: 'distracao' },
      { key: 'procrast', label: 'Procrastinação', type: 'distracao' },
      { key: 'planejar', label: 'Planejar', type: 'neutro' },
    ],
    impacts: ['Direção', 'Sentido', 'Realização'],
    keyHabit: 'Revisar metas todo domingo', priority: 'Eliminar metas ambíguas',
    correlation: { x: 'Reviews/sem', y: 'Progresso', label: 'Review ↔ Progresso' },
  },
  {
    slug: 'relationships', name: 'Relacionamentos', tagline: 'Vínculos e presença',
    axes: [
      { key: 'presenca', label: 'Presença' }, { key: 'qualidade', label: 'Qualidade' },
      { key: 'frequencia', label: 'Frequência' }, { key: 'novos', label: 'Novos vínculos' },
      { key: 'conflito', label: 'Conflito', inverted: true },
    ],
    activities: [
      { key: 'convivio', label: 'Convívio real', type: 'produtivo' },
      { key: 'ligacao', label: 'Ligação significativa', type: 'produtivo' },
      { key: 'scroll_social', label: 'Scroll passivo', type: 'distracao' },
      { key: 'isolamento', label: 'Isolamento', type: 'distracao' },
      { key: 'msg', label: 'Mensagens', type: 'neutro' },
    ],
    impacts: ['Felicidade', 'Saúde mental', 'Suporte'],
    keyHabit: 'Um encontro presencial por semana', priority: 'Reduzir comunicação passiva',
    correlation: { x: 'Encontros', y: 'Humor', label: 'Convívio ↔ Humor' },
  },
  {
    slug: 'internal', name: 'Interno', tagline: 'Emoção, sentido, paz',
    axes: [
      { key: 'humor', label: 'Humor' }, { key: 'estresse', label: 'Estresse', inverted: true },
      { key: 'sentido', label: 'Sentido' }, { key: 'auto', label: 'Autoconhecimento' },
      { key: 'paz', label: 'Paz' },
    ],
    activities: [
      { key: 'journal', label: 'Journaling', type: 'produtivo' },
      { key: 'terapia', label: 'Terapia', type: 'produtivo' },
      { key: 'rumin', label: 'Ruminação', type: 'distracao' },
      { key: 'evitacao', label: 'Evitação', type: 'distracao' },
      { key: 'silencio', label: 'Silêncio', type: 'neutro' },
    ],
    impacts: ['Tudo. Esta é a base.'],
    keyHabit: '10 min de journaling diário', priority: 'Nomear a emoção antes de reagir',
    correlation: { x: 'Journaling', y: 'Humor', label: 'Journal ↔ Humor' },
  },
  {
    slug: 'habits', name: 'Hábitos', tagline: 'Sistema operacional do dia',
    axes: [
      { key: 'manha', label: 'Rotina manhã' }, { key: 'noite', label: 'Rotina noite' },
      { key: 'consist', label: 'Consistência' }, { key: 'skip', label: 'Falhas', inverted: true },
      { key: 'novos', label: 'Novos hábitos' },
    ],
    activities: [
      { key: 'execucao', label: 'Hábito executado', type: 'produtivo' },
      { key: 'stack', label: 'Stack hábitos', type: 'produtivo' },
      { key: 'skip', label: 'Skip', type: 'distracao' },
      { key: 'fricao', label: 'Fricção alta', type: 'distracao' },
      { key: 'trans', label: 'Transição', type: 'neutro' },
    ],
    impacts: ['Todos os outros pilares'],
    keyHabit: 'Encadear 3 hábitos pela manhã', priority: 'Reduzir fricção do hábito chave',
    correlation: { x: 'Hábitos/dia', y: 'Score geral', label: 'Execução ↔ Score' },
  },
  {
    slug: 'learning', name: 'Aprendizado', tagline: 'Skill compounding',
    axes: [
      { key: 'horas', label: 'Horas focadas' }, { key: 'aplic', label: 'Aplicação' },
      { key: 'reten', label: 'Retenção' }, { key: 'diversid', label: 'Diversidade' },
      { key: 'profund', label: 'Profundidade' },
    ],
    activities: [
      { key: 'estudo', label: 'Estudo deliberado', type: 'produtivo' },
      { key: 'pratica', label: 'Prática', type: 'produtivo' },
      { key: 'consumo', label: 'Consumo passivo', type: 'distracao' },
      { key: 'scroll_edu', label: 'Scroll educacional', type: 'distracao' },
      { key: 'review', label: 'Review notas', type: 'neutro' },
    ],
    impacts: ['Carreira', 'Confiança', 'Opcionalidade'],
    keyHabit: '1h de estudo deliberado/dia', priority: 'Trocar consumo por prática',
    correlation: { x: 'Horas estudo', y: 'Retenção', label: 'Estudo ↔ Retenção' },
  },
  {
    slug: 'leisure', name: 'Lazer', tagline: 'Recarga real, não fuga',
    axes: [
      { key: 'qualidade', label: 'Qualidade' }, { key: 'ativo', label: 'Lazer ativo' },
      { key: 'passivo', label: 'Lazer passivo', inverted: true },
      { key: 'novidade', label: 'Novidade' }, { key: 'satis', label: 'Satisfação' },
    ],
    activities: [
      { key: 'hobby', label: 'Hobby ativo', type: 'produtivo' },
      { key: 'natureza', label: 'Natureza', type: 'produtivo' },
      { key: 'tv_passiva', label: 'TV passiva', type: 'distracao' },
      { key: 'scroll', label: 'Scroll', type: 'distracao' },
      { key: 'descanso', label: 'Descanso', type: 'neutro' },
    ],
    impacts: ['Recuperação', 'Criatividade', 'Humor'],
    keyHabit: 'Lazer ativo aos fins de semana', priority: 'Substituir scroll por hobby',
    correlation: { x: 'Lazer ativo', y: 'Energia segunda', label: 'Lazer ↔ Energia' },
  },
  {
    slug: 'identity', name: 'Identidade', tagline: 'Quem você está se tornando',
    axes: [
      { key: 'valores', label: 'Valores' }, { key: 'coerencia', label: 'Coerência' },
      { key: 'narrativa', label: 'Narrativa' }, { key: 'expressao', label: 'Expressão' },
      { key: 'aceitacao', label: 'Aceitação' },
    ],
    activities: [
      { key: 'alinhada', label: 'Ação alinhada', type: 'produtivo' },
      { key: 'criacao', label: 'Criação', type: 'produtivo' },
      { key: 'incoer', label: 'Ação incoerente', type: 'distracao' },
      { key: 'performar', label: 'Performar p/ outros', type: 'distracao' },
      { key: 'refletir', label: 'Refletir', type: 'neutro' },
    ],
    impacts: ['Sentido', 'Confiança', 'Decisões de longo prazo'],
    keyHabit: 'Decisão diária alinhada aos valores', priority: 'Eliminar 1 incoerência',
    correlation: { x: 'Ações alinhadas', y: 'Coerência', label: 'Ação ↔ Coerência' },
  },
];

export const getCompassPillar = (slug: string): PillarConfig | undefined =>
  COMPASS_PILLARS.find((p) => p.slug === slug);

export const COMPASS_PILLAR_BY_SLUG: Record<CompassPillarSlug, PillarConfig> =
  COMPASS_PILLARS.reduce((acc, p) => ({ ...acc, [p.slug]: p }), {} as Record<CompassPillarSlug, PillarConfig>);
