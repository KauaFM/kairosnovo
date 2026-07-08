// =============================================================
// ORVAX · Life OS — useFinanceData
// Carrega snapshot + metas + transações recentes e escuta
// realtime nas tabelas `transactions` e `financial_goals`.
// =============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  getFinanceSnapshot,
  listGoals,
  listTransactions,
} from '../services/finance';
import type { FinanceSnapshot, FinancialGoal, Transaction } from '../types';

export interface FinanceData {
  snapshot:    FinanceSnapshot | null;
  goals:       FinancialGoal[];
  transactions:Transaction[]; // últimas do período
  loading:     boolean;
  error:       string | null;
  reload:      () => Promise<void>;
  setPeriod:   (days: 7 | 30 | 90 | 180 | 365) => void;
  period:      number;
}

export function useFinanceData(defaultPeriod: 7 | 30 | 90 | 180 | 365 = 30): FinanceData {
  const [period, setPeriod] = useState<number>(defaultPeriod);
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [snap, g, tx] = await Promise.all([
        getFinanceSnapshot(period),
        listGoals(),
        listTransactions(period),
      ]);
      if (!aliveRef.current) return;
      setSnapshot(snap);
      setGoals(g);
      // ordena pela data desc
      setTransactions([...tx].sort((a, b) => (a.date < b.date ? 1 : -1)));
    } catch (e: any) {
      console.error('[useFinanceData]', e);
      if (aliveRef.current) setError(e?.message || 'falha ao carregar finanças');
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    aliveRef.current = true;
    reload();
    return () => { aliveRef.current = false; };
  }, [reload]);

  // realtime
  useEffect(() => {
    const ch = supabase.channel(`finance-live-${period}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_goals' }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [period, reload]);

  return { snapshot, goals, transactions, loading, error, reload, period, setPeriod };
}
