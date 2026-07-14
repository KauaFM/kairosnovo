// ============================================================
// ORVAX — Títulos e status de rank em EN (espelha RANK_DEFS de db.js).
// getRankFromXP (db.js) devolve title/status em PT (UPPERCASE); os
// componentes localizam por rank code / status quando lang === 'en'.
// ============================================================

export const RANK_TITLE_EN = {
  'E-': 'INERTIA PHASE', 'E': 'PASSIVE OBSERVER', 'E+': 'TECHNICAL AWAKENING',
  'D-': 'SYSTEMIC BEGINNER', 'D': 'LOW-FREQ. OPERATOR', 'D+': 'AGENT CANDIDATE',
  'C-': 'STABILITY MODULE', 'C': 'DISCIPLINED OPERATOR', 'C+': 'PERFORMANCE TECHNICIAN',
  'B-': 'FIELD AGENT', 'B': 'KAIROS AGENT', 'B+': 'VETERAN AGENT',
  'A-': 'FLOW SPECIALIST', 'A': 'COMPUTATIONAL ELITE', 'A+': 'EXECUTION MASTER',
  'S-': 'SUPERIOR ARCHETYPE', 'S': 'SOVEREIGN', 'S+': 'PERFORMANCE ENTITY',
  'SS-': 'ABSOLUTE SOVEREIGN', 'SS': 'TECHNICAL DEITY', 'SS+': 'NEURAL VANGUARD',
  'X-': 'SYSTEM CIPHER', 'X': 'DREADNOUGHT', 'X+': 'NEMESIS OF CHAOS',
  'Ø': 'OMEGA SINGULARITY',
};

export const RANK_STATUS_EN = {
  'CRÍTICO': 'CRITICAL', 'ALERTA': 'ALERT', 'INSTÁVEL': 'UNSTABLE',
  'ADAPTANDO': 'ADAPTING', 'ESTÁVEL': 'STABLE', 'OPERANTE': 'OPERATIONAL',
  'AVANÇADO': 'ADVANCED', 'ELITE': 'ELITE', 'MÁXIMO': 'MAXIMUM',
  'SUPREMO': 'SUPREME', 'ABSOLUTO': 'ABSOLUTE', 'TRANSCENDENTE': 'TRANSCENDENT',
  'OMEGA': 'OMEGA',
};

// Helpers: recebem o rank code / status PT e o lang, devolvem localizado.
export const locRankTitle = (code, ptTitle, lang) =>
  (lang === 'en' && RANK_TITLE_EN[code]) ? RANK_TITLE_EN[code] : ptTitle;
export const locRankStatus = (ptStatus, lang) =>
  (lang === 'en' && RANK_STATUS_EN[ptStatus]) ? RANK_STATUS_EN[ptStatus] : ptStatus;
