// ============================================================
// ORVAX — Life OS PILLARS em EN. Espelha pillars.ts por key.
// Usado onde o pilar é exibido (label/short/description) quando en.
// ============================================================

export const PILLARS_EN: Record<string, { label: string; short: string; description: string }> = {
  health:        { label: 'Health & Body',        short: 'HEALTH',   description: 'Sleep · hydration · training · diet · weight' },
  mind:          { label: 'Mind & Intellect',     short: 'MIND',     description: 'Study · reading · focus · courses' },
  finance:       { label: 'Finance',              short: 'FINANCE',  description: 'Income · expenses · investments · net worth' },
  career:        { label: 'Career & Profession',  short: 'CAREER',   description: 'Projects · networking · entrepreneurship' },
  relationships: { label: 'Relationships',        short: 'RELATIONS',description: 'Family · friends · partner · new connections' },
  productivity:  { label: 'Productivity',         short: 'EXEC',     description: 'Tasks · Deep Work · time blocks' },
  wellbeing:     { label: 'Well-being',           short: 'WELL-BEING', description: 'Meditation · breaks · anxiety · recovery' },
  environment:   { label: 'Environment',          short: 'ENVIRON',  description: 'Home · setup · cleaning routine' },
  leisure:       { label: 'Leisure & Hobbies',    short: 'LEISURE',  description: 'Travel · games · sports · free time' },
  meaning:       { label: 'Meaning & Contemplation', short: 'MEANING', description: 'Journaling · reflection · philosophy · spirituality' },
};
