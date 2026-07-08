// =============================================================
// ORVAX · Cartas de Evolução — Public API
//
// Módulo isolado · zero side-effects · seguro pra plugar em qualquer rota.
//
// ┌─────────────────────────────────────────────────────────────────┐
// │ INTEGRATION RECIPE (3 passos)                                    │
// │                                                                   │
// │ 1) Aba de Conquistas (página completa)                            │
// │                                                                   │
// │   import { AchievementsPage } from '@/features/achievements';     │
// │                                                                   │
// │   <AchievementsPage                                                │
// │     currentXp={user.xpTotal}                                       │
// │     onBack={() => goHome()}                                        │
// │   />                                                               │
// │                                                                   │
// │ 2) Auto-overlay quando o user sobe de rank                         │
// │                                                                   │
// │   import {                                                         │
// │     useRankUnlock, EvolutionCardOverlay,                           │
// │   } from '@/features/achievements';                                │
// │                                                                   │
// │   const { pendingRank, markSeen } = useRankUnlock(user.xpTotal);   │
// │                                                                   │
// │   <EvolutionCardOverlay                                            │
// │     rank={pendingRank!}                                            │
// │     open={!!pendingRank}                                           │
// │     onSave={markSeen}                                              │
// │     onDismiss={markSeen}                                           │
// │   />                                                               │
// │                                                                   │
// │ 3) Inspeção do progresso em qualquer canto                         │
// │                                                                   │
// │   import { getCurrentRank, getRankProgress }                       │
// │     from '@/features/achievements';                                │
// │                                                                   │
// │   const { current, next, pct, remaining } =                        │
// │     getRankProgress(user.xpTotal);                                 │
// └─────────────────────────────────────────────────────────────────┘
// =============================================================

// ─── Data + helpers ──────────────────────────────────────────
export {
  RANKS,
  RANK_BY_SLUG,
  getCurrentRank,
  getNextRank,
  getRankProgress,
} from './data/ranks';
export type { Rank, RankSlug } from './data/ranks';

// ─── Hooks ───────────────────────────────────────────────────
export { useRankUnlock } from './hooks/useRankUnlock';
export { useScratchToReveal } from './hooks/useScratchToReveal';

// ─── Components ──────────────────────────────────────────────
export { EvolutionCard } from './components/EvolutionCard';
export { EvolutionCardOverlay } from './components/EvolutionCardOverlay';
export { AchievementsGrid } from './components/AchievementsGrid';
export { AchievementCardModal } from './components/AchievementCardModal';
export { AchievementsPage } from './components/AchievementsPage';
export { AchievementBadges } from './components/AchievementBadges';
export type { AchievementItem } from './components/AchievementBadges';

// ─── Plug-and-play wire-up ───────────────────────────────────
// Drop <AchievementsAutoMount /> em qualquer canto e o sistema
// inteiro funciona automaticamente · zero props · usa Supabase
export { AchievementsAutoMount } from './components/AchievementsAutoMount';
