// Compass — Data hooks for real-time Supabase data
import { useState, useEffect, useCallback } from 'react';
import type { PillarData, GlobalMetrics } from '../types';
import type { CompassPillarSlug } from '../pillars';
import { buildPillarData } from '../adapters/pillarDataAdapter';
import { buildGlobalMetrics } from '../adapters/globalMetricsAdapter';
import { appEvents } from '../../../../lib/events';

export function useCompassPillar(slug: CompassPillarSlug | null) {
  const [data, setData] = useState<PillarData | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!slug) { setData(null); return; }
    setLoading(true);
    try {
      const result = await buildPillarData(slug);
      setData(result);
    } catch (err) {
      console.warn('[useCompassPillar]', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { 
    refresh(); 
    return appEvents.subscribe(() => refresh());
  }, [refresh]);

  return { data, loading, refresh };
}

export function useCompassGlobal() {
  const [data, setData] = useState<GlobalMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await buildGlobalMetrics();
      setData(result);
    } catch (err) {
      console.warn('[useCompassGlobal]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    refresh(); 
    return appEvents.subscribe(() => refresh());
  }, [refresh]);

  return { data, loading, refresh };
}
