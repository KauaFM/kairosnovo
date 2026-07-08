// =============================================================
// ORVAX · Life OS — Definição dos 10 pilares da vida
// =============================================================
import type { PillarConfig, PillarKey } from './types';

export const PILLARS: PillarConfig[] = [
  { key: 'health',        label: 'Saúde e Corpo',         short: 'SAÚDE',
    description: 'Sono · hidratação · treino · dieta · peso',
    icon: 'HeartPulse',    accent: '#ef4444', aspectKey: 'health' },

  { key: 'mind',          label: 'Mente e Intelecto',     short: 'MENTE',
    description: 'Estudos · leitura · foco · cursos',
    icon: 'BrainCircuit',  accent: '#8b5cf6', aspectKey: 'studies' },

  { key: 'finance',       label: 'Finanças',              short: 'FINANÇAS',
    description: 'Receitas · despesas · investimentos · patrimônio',
    icon: 'Wallet',        accent: '#22c55e', aspectKey: 'finance' },

  { key: 'career',        label: 'Carreira e Profissão',  short: 'CARREIRA',
    description: 'Projetos · networking · empreendedorismo',
    icon: 'Briefcase',     accent: '#3b82f6', aspectKey: 'career' },

  { key: 'relationships', label: 'Relacionamentos',       short: 'RELAÇÕES',
    description: 'Família · amigos · conjugal · novas conexões',
    icon: 'Users',         accent: '#ec4899', aspectKey: 'relationships' },

  { key: 'productivity',  label: 'Produtividade',         short: 'EXEC',
    description: 'Tarefas · Deep Work · blocos de tempo',
    icon: 'Zap',           accent: '#eab308', aspectKey: 'productivity' },

  { key: 'wellbeing',     label: 'Bem-estar',             short: 'BEM-ESTAR',
    description: 'Meditação · pausas · ansiedade · recuperação',
    icon: 'Leaf',          accent: '#10b981', aspectKey: 'mental' },

  { key: 'environment',   label: 'Ambiente',              short: 'AMBIENTE',
    description: 'Casa · setup · rotina de limpeza',
    icon: 'Home',          accent: '#a78bfa', aspectKey: 'home' },

  { key: 'leisure',       label: 'Lazer e Hobbies',       short: 'LAZER',
    description: 'Viagens · games · esportes · tempo livre',
    icon: 'Gamepad2',      accent: '#f97316', aspectKey: 'hobbies' },

  { key: 'meaning',       label: 'Sentido e Contemplação',short: 'SENTIDO',
    description: 'Journaling · reflexão · filosofia · espiritualidade',
    icon: 'Sparkles',      accent: '#06b6d4', aspectKey: 'spiritual' },
];

export const PILLAR_BY_KEY: Record<PillarKey, PillarConfig> =
  PILLARS.reduce((acc, p) => ({ ...acc, [p.key]: p }), {} as Record<PillarKey, PillarConfig>);

export const getPillar = (k: PillarKey) => PILLAR_BY_KEY[k];
