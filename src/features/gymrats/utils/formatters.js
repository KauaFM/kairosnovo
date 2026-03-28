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
  { value: 'workouts', label: 'Por Treino', desc: '1 ponto por treino registrado' },
  { value: 'minutes', label: 'Por Minuto', desc: 'Pontos baseados na duracao' },
  { value: 'calories', label: 'Por Caloria', desc: 'Pontos por caloria queimada' },
  { value: 'steps', label: 'Por Passos', desc: 'Pontos por 1000 passos' },
  { value: 'custom', label: 'Personalizado', desc: 'Pontos por tipo de atividade' },
];
