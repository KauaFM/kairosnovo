// =============================================================
// Compass — Bidirectional pillar mapping (old 10 ↔ new 12)
// Ensures backward compatibility with existing data.
// =============================================================
import type { PillarKey } from '../../lifeOs/types';
import type { CompassPillarSlug } from './pillars';

/** Map old PillarKey → new CompassPillarSlug */
export const OLD_TO_NEW: Record<PillarKey, CompassPillarSlug> = {
  health:        'health',
  mind:          'mind',
  finance:       'finance',
  career:        'career',
  relationships: 'relationships',
  productivity:  'goals',       // old productivity → new goals (execution-focused)
  wellbeing:     'internal',    // old wellbeing → new internal (emotion + paz)
  environment:   'habits',      // old environment → new habits (system operational)
  leisure:       'leisure',
  meaning:       'identity',    // old meaning → new identity (who you're becoming)
};

/** Map new CompassPillarSlug → old PillarKey (for Supabase queries) */
export const NEW_TO_OLD: Partial<Record<CompassPillarSlug, PillarKey>> = {
  health:        'health',
  mind:          'mind',
  finance:       'finance',
  career:        'career',
  relationships: 'relationships',
  goals:         'productivity',
  internal:      'wellbeing',
  habits:        'environment',
  leisure:       'leisure',
  identity:      'meaning',
  // New pillars without old equivalents:
  nutrition:     'health',     // nutrition maps to health for data queries
  learning:      'mind',       // learning maps to mind for data queries
};

/** Map old aspect_key (from life_aspects/Supabase) → CompassPillarSlug */
export const ASPECT_TO_COMPASS: Record<string, CompassPillarSlug> = {
  health:       'health',
  studies:      'learning',
  finance:      'finance',
  career:       'career',
  relationships:'relationships',
  productivity: 'goals',
  mental:       'internal',
  home:         'habits',
  hobbies:      'leisure',
  spiritual:    'identity',
  // Extended
  body:         'health',
  nutrition:    'nutrition',
  social:       'relationships',
};

/** Map old telemetry metric keys → CompassPillarSlug */
export const TELEMETRY_TO_COMPASS: Record<string, CompassPillarSlug> = {
  'Cognitivo':     'mind',
  'BioFisico':     'health',
  'Social':        'relationships',
  'Digital':       'goals',
  'Emocional':     'internal',
  'Crescimento':   'learning',
  'Profissional':  'career',
  'Espiritual':    'identity',
};

/** Map old habit pillar strings → CompassPillarSlug */
export const HABIT_PILLAR_TO_COMPASS: Record<string, CompassPillarSlug> = {
  disciplina:      'habits',
  consistencia:    'habits',
  foco:            'mind',
  energia:         'health',
  evolucao:        'learning',
  financas:        'finance',
  profissao:       'career',
  saude:           'health',
  corpo:           'health',
  nutricao:        'nutrition',
  relacionamento:  'relationships',
  estudos:         'learning',
  mental:          'internal',
  espiritual:      'identity',
  hobby:           'leisure',
  casa:            'habits',
  social:          'relationships',
};
