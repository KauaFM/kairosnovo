// =============================================================
// ORVAX · Life OS — useLifeOverview
// Carrega dados consolidados do overview (RPC get_life_overview)
// com realtime em aspect_links.
// =============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export interface OverviewAspect {
  key: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  total: number;
  c7: number;
  c7_prev: number;
  c30: number;
  delta_pct: number | null;
  series: Array<{ d: string; c: number }>;
}

export interface OverviewData {
  aspects: OverviewAspect[];
  exec_map: Array<{ d: string; c: number }>;
  totals: { today: number; week: number; month: number };
}

const EMPTY: OverviewData = {
  aspects: [],
  exec_map: [],
  totals: { today: 0, week: 0, month: 0 },
};

export function useLifeOverview() {
  const [data, setData] = useState<OverviewData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data: raw, error: err } = await supabase.rpc('get_life_overview');
      if (err) throw err;
      if (!aliveRef.current) return;

      // dedupe defensivo
      const map = new Map<string, OverviewAspect>();
      for (const r of (raw?.aspects || []) as OverviewAspect[]) {
        const prev = map.get(r.key);
        if (!prev || (r.total || 0) > (prev.total || 0)) map.set(r.key, r);
      }
      setData({
        aspects: Array.from(map.values()),
        exec_map: raw?.exec_map || [],
        totals: raw?.totals || { today: 0, week: 0, month: 0 },
      });
      setError(null);
    } catch (e: any) {
      console.warn('[useLifeOverview]', e);
      if (aliveRef.current) setError(e?.message || 'falha ao carregar overview');
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => { aliveRef.current = false; };
  }, [load]);

  // realtime
  useEffect(() => {
    const ch = supabase.channel('life-overview-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aspect_links' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { data, loading, error, reload: load };
}
