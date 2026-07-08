// =============================================================
// ORVAX · Life OS — Finance service
// Agregações no cliente sobre `transactions` e `financial_goals`.
// =============================================================
import { supabase } from '../../../lib/supabase';
import type { FinanceSnapshot, FinancialGoal, SeriesPoint, Transaction } from '../types';

const WD_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const daysBetween = (a: string, b: string) =>
  Math.round((+new Date(b + 'T00:00:00') - +new Date(a + 'T00:00:00')) / 86400000);

/** Fetch transactions dos últimos `days` dias. */
export async function listTransactions(days = 30): Promise<Transaction[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', toDateStr(since))
    .order('date', { ascending: true });
  if (error) throw error;
  return (data || []) as Transaction[];
}

export async function listGoals(): Promise<FinancialGoal[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('target_amount', { ascending: false });
  if (error) throw error;
  return (data || []) as FinancialGoal[];
}

export async function createTransaction(tx: {
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  description?: string;
  date?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('sem sessão');
  const payload = {
    user_id:     user.id,
    amount:      Math.abs(tx.amount),
    type:        tx.type,
    category:    tx.category ?? null,
    description: tx.description ?? null,
    date:        tx.date || toDateStr(new Date()),
  };
  const { data, error } = await supabase.from('transactions').insert(payload).select().single();
  if (error) throw error;
  return data as Transaction;
}

export async function createGoal(goal: {
  title: string;
  target_amount: number;
  current_amount?: number;
  deadline?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('sem sessão');
  const payload = {
    user_id:        user.id,
    title:          goal.title,
    target_amount:  goal.target_amount,
    current_amount: goal.current_amount ?? 0,
    deadline:       goal.deadline || null,
  };
  const { data, error } = await supabase.from('financial_goals').insert(payload).select().single();
  if (error) throw error;
  return data as FinancialGoal;
}

// -------------------------------------------------------------
// Agregações
// -------------------------------------------------------------

/** Snapshot consolidado pra UI do Deep Dive (período `days`). */
export async function getFinanceSnapshot(days = 30): Promise<FinanceSnapshot> {
  // Carrega 2× o período pra calcular delta vs período anterior
  const all = await listTransactions(days * 2);

  const today = new Date();
  const periodStart = new Date();
  periodStart.setDate(today.getDate() - (days - 1));
  const periodStartStr = toDateStr(periodStart);
  const prevStart = new Date();
  prevStart.setDate(today.getDate() - (days * 2 - 1));
  const prevStartStr = toDateStr(prevStart);

  const current = all.filter((t) => t.date >= periodStartStr);
  const previous = all.filter((t) => t.date >= prevStartStr && t.date < periodStartStr);

  const sumBy = (rows: Transaction[], type: 'income' | 'expense') =>
    rows.filter((r) => r.type === type).reduce((s, r) => s + Number(r.amount || 0), 0);

  const totalIncome = sumBy(current, 'income');
  const totalExpense = sumBy(current, 'expense');
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.min(1, balance / totalIncome)) : 0;
  const avgDaily = current.length > 0 ? (totalIncome + totalExpense) / days : 0;

  // série diária
  const byDayMap = new Map<string, { income: number; expense: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(periodStart);
    d.setDate(periodStart.getDate() + i);
    byDayMap.set(toDateStr(d), { income: 0, expense: 0 });
  }
  for (const t of current) {
    const slot = byDayMap.get(t.date);
    if (!slot) continue;
    if (t.type === 'income') slot.income += Number(t.amount);
    else slot.expense += Number(t.amount);
  }
  const byDay: SeriesPoint[] = [];
  const incomeSeries: SeriesPoint[] = [];
  const expenseSeries: SeriesPoint[] = [];
  for (const [d, v] of byDayMap) {
    byDay.push({ d, v: v.income - v.expense });
    incomeSeries.push({ d, v: v.income });
    expenseSeries.push({ d, v: v.expense });
  }

  // top categorias (despesa)
  const catMap = new Map<string, { total: number; count: number }>();
  for (const t of current.filter((x) => x.type === 'expense')) {
    const k = (t.category || 'outros').toLowerCase();
    const prev = catMap.get(k) || { total: 0, count: 0 };
    prev.total += Number(t.amount);
    prev.count += 1;
    catMap.set(k, prev);
  }
  const topCategories = Array.from(catMap.entries())
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // heatmap 365d (densidade de lançamentos)
  const heatMap = new Map<string, { c: number; net: number }>();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (364 - i));
    heatMap.set(toDateStr(d), { c: 0, net: 0 });
  }
  // precisa de dados dos 365 dias — re-query barata
  const yearAgo = new Date(today);
  yearAgo.setDate(today.getDate() - 364);
  const { data: yearData } = await supabase
    .from('transactions')
    .select('amount,type,date')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
    .gte('date', toDateStr(yearAgo));
  for (const t of (yearData || []) as Transaction[]) {
    const slot = heatMap.get(t.date);
    if (!slot) continue;
    slot.c += 1;
    slot.net += (t.type === 'income' ? 1 : -1) * Number(t.amount);
  }
  const heatmap = Array.from(heatMap.entries()).map(([d, v]) => ({ d, ...v }));

  // streak: dias consecutivos com ≥1 lançamento contando de hoje pra trás
  let streakDays = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const slot = heatMap.get(toDateStr(d));
    if (slot && slot.c > 0) streakDays++;
    else if (i > 0) break;
  }

  // melhor dia da semana (maior fluxo líquido)
  const wdTotals = [0, 0, 0, 0, 0, 0, 0];
  for (const p of heatmap) {
    const wd = new Date(p.d + 'T00:00:00').getDay();
    wdTotals[wd] += p.net;
  }
  let bestIdx = 0;
  wdTotals.forEach((v, i) => { if (v > wdTotals[bestIdx]) bestIdx = i; });
  const bestWeekday = { weekday: bestIdx, label: WD_LABELS[bestIdx], total: wdTotals[bestIdx] };

  // delta vs período anterior (balance)
  const prevBalance = sumBy(previous, 'income') - sumBy(previous, 'expense');
  const deltaPct = prevBalance !== 0 ? Math.round(((balance - prevBalance) / Math.abs(prevBalance)) * 100) : null;

  return {
    totalIncome,
    totalExpense,
    balance,
    savingsRate,
    avgDaily,
    topCategories,
    byDay,
    incomeSeries,
    expenseSeries,
    heatmap,
    streakDays,
    bestWeekday,
    txCount: current.length,
    periodDays: days,
    deltaPct,
  };
}

/** Empurra progresso em uma meta financeira (soma ao current_amount). */
export async function addGoalProgress(goalId: string, amount: number) {
  const { data: existing } = await supabase
    .from('financial_goals')
    .select('current_amount')
    .eq('id', goalId)
    .single();
  const next = (existing?.current_amount || 0) + amount;
  const { error } = await supabase
    .from('financial_goals')
    .update({ current_amount: next })
    .eq('id', goalId);
  if (error) throw error;
  return next;
}

export const financeHelpers = { toDateStr, daysBetween };
