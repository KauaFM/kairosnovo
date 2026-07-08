// =============================================================
// ORVAX · Life OS — Tipos compartilhados
// =============================================================

/** Os 10 pilares da vida monitorados pelo sistema. */
export type PillarKey =
  | 'health'         // Saúde e Corpo
  | 'mind'           // Mente e Intelecto
  | 'finance'        // Finanças
  | 'career'         // Carreira e Profissão
  | 'relationships'  // Relacionamentos
  | 'productivity'   // Produtividade e Execução
  | 'wellbeing'      // Bem-estar e Recuperação
  | 'environment'    // Ambiente
  | 'leisure'        // Lazer e Hobbies
  | 'meaning';       // Sentido e Contemplação

export type IconName = string; // nome de ícone do lucide-react

export interface PillarConfig {
  key:        PillarKey;
  label:      string;
  short:      string;
  description:string;
  icon:       IconName;
  accent:     string;  // hex hero color
  aspectKey:  string;  // mapeamento pra life_aspects.key
}

/** Tipos de entidade criáveis pelo Creation Hub. */
export type CreateKind = 'task' | 'habit' | 'goal' | 'event' | 'reminder' | 'payment' | 'transaction';

export interface CreatePayload {
  kind:       CreateKind;
  pillar:     PillarKey;
  title:      string;
  description?: string;
  amount?:    number;           // finance only
  txType?:    'income' | 'expense'; // finance only
  category?:  string;
  date?:      string;           // YYYY-MM-DD
  time?:      string;           // HH:MM
  deadline?:  string;           // YYYY-MM-DD
  target?:    number;
  unit?:      string;
}

/** Transação financeira persistida. */
export interface Transaction {
  id:          string;
  user_id:     string;
  amount:      number;
  type:        'income' | 'expense';
  category:    string | null;
  description: string | null;
  date:        string;  // YYYY-MM-DD
  created_at?: string;
}

/** Meta financeira. */
export interface FinancialGoal {
  id:             string;
  user_id:        string;
  title:          string;
  target_amount:  number;
  current_amount: number;
  deadline:       string | null;
  created_at?:    string;
}

/** Ponto de série temporal genérico. */
export interface SeriesPoint {
  d: string;  // YYYY-MM-DD
  v: number;  // valor
}

/** Agregações do pilar Finanças. */
export interface FinanceSnapshot {
  totalIncome:    number;
  totalExpense:   number;
  balance:        number;
  savingsRate:    number;     // 0-1
  avgDaily:       number;
  topCategories:  Array<{ category: string; total: number; count: number }>;
  byDay:          SeriesPoint[];   // 30d net flow
  incomeSeries:   SeriesPoint[];
  expenseSeries:  SeriesPoint[];
  heatmap:        Array<{ d: string; c: number; net: number }>; // 365d
  streakDays:     number;
  bestWeekday:    { weekday: number; label: string; total: number };
  txCount:        number;
  periodDays:     number;
  deltaPct:       number | null; // vs período anterior de mesmo tamanho
}

/** Item unificado de tarefa pendente do dia (Omni-Sync). */
export interface PendingItem {
  kind:       'task' | 'habit' | 'event' | 'meeting' | 'reminder' | 'payment';
  source_id:  string;
  title:      string;
  subtitle:   string | null;
  aspect_key: string | null;
  starts_at:  string | null;
  all_day:    boolean;
  done:       boolean;
  extra:      Record<string, unknown>;
}
