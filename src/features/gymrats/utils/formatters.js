import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function timeAgo(date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

export function formatDate(date) {
  return format(new Date(date), "dd MMM yyyy", { locale: ptBR });
}

export function formatDuration(minutes) {
  if (!minutes) return '0min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const ACTIVITY_TYPES = [
  { value: 'gym', label: 'Musculacao', icon: '🏋️' },
  { value: 'run', label: 'Corrida', icon: '🏃' },
  { value: 'yoga', label: 'Yoga', icon: '🧘' },
  { value: 'cycling', label: 'Ciclismo', icon: '🚴' },
  { value: 'swim', label: 'Natacao', icon: '🏊' },
  { value: 'hiit', label: 'HIIT', icon: '⚡' },
  { value: 'martial_arts', label: 'Luta', icon: '🥊' },
  { value: 'other', label: 'Outro', icon: '💪' },
];

export const SCORING_TYPES = [
  { value: 'workouts', label: 'Por registro', desc: '1 ponto cada vez que você registra' },
  { value: 'minutes', label: 'Por minuto', desc: 'Pontos pela duração' },
  { value: 'calories', label: 'Por caloria', desc: 'Pontos por caloria queimada' },
  { value: 'steps', label: 'Por passos', desc: 'Pontos por 1000 passos' },
  { value: 'custom', label: 'Por atividade', desc: 'Peso diferente para cada tipo' },
];

// MODELOS DE DESAFIO
//
// O módulo nasceu como clone de app de academia — o nome da pasta é
// "gymrats" e a pontuação inteira fala de treino, caloria e passo.
// Mas o desafio que as pessoas realmente criaram aqui foi um CLUBE
// DO LIVRO. Quem quisesse algo fora da academia tinha que traduzir
// sozinho "1 livro por mês" para "pontos por treino".
//
// Estes modelos preenchem o formulário de uma vez e, principalmente,
// mostram que a Arena serve para qualquer coisa repetível — não é
// preciso mudar o motor de pontuação para isso, só parar de falar
// só de academia.
export const MODELOS_DESAFIO = [
  {
    id: 'leitura', icone: '📚', titulo: 'Clube do livro',
    nome: 'Clube do livro',
    descricao: 'Um livro por mês. Cada mês, um tema.',
    scoring_type: 'workouts', scoring_config: { per_workout: 1 },
    dica: 'Registre quando terminar um livro.',
  },
  {
    id: 'estudo', icone: '🎓', titulo: 'Maratona de estudo',
    nome: 'Maratona de estudo',
    descricao: 'Quem acumula mais horas de estudo no período.',
    scoring_type: 'minutes', scoring_config: { per_minute: 1 },
    dica: 'Cada sessão vale pelos minutos estudados.',
  },
  {
    id: 'treino', icone: '🏋️', titulo: 'Desafio de treino',
    nome: 'Desafio de treino',
    descricao: 'Quem treina mais vezes ganha.',
    scoring_type: 'workouts', scoring_config: { per_workout: 1 },
    dica: 'Um ponto por treino registrado.',
  },
  {
    id: 'passos', icone: '🚶', titulo: 'Guerra dos passos',
    nome: 'Guerra dos passos',
    descricao: 'Quem anda mais durante o período.',
    scoring_type: 'steps', scoring_config: { per_1k_steps: 1 },
    dica: 'Um ponto a cada mil passos.',
  },
  {
    id: 'consistencia', icone: '🔥', titulo: 'Consistência',
    nome: 'Desafio da consistência',
    descricao: 'Não importa quanto. Importa não faltar.',
    scoring_type: 'workouts', scoring_config: { per_workout: 1 },
    dica: 'Um ponto por dia em que você aparecer.',
  },
  {
    id: 'livre', icone: '✳️', titulo: 'Começar do zero',
    nome: '', descricao: '',
    scoring_type: 'workouts', scoring_config: { per_workout: 1 },
    dica: 'Você define tudo.',
  },
];
