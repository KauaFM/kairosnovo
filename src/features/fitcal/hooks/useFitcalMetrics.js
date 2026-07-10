// =============================================================
// ORVAX — useFitcalMetrics
// Hook que substitui os dados MOCK de FitCalHome (generateWeeklyData +
// generateHeatmap). Puxa real de fitcal_daily_metrics via RPCs.
// =============================================================
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { getExecutionMap, getIntakeOutput } from '../services/foodServiceV2';
import { toLocalDateStr } from '../../../utils/dateUtils';

const DAY_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];

export function useFitcalMetrics(period = 'week') {
  const [chartData, setChartData] = useState([]);   // [{day, intake, output}]
  const [heatmap, setHeatmap] = useState([]);        // number[12][7] (execution_level 0-4)
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const [io, em] = await Promise.all([
        getIntakeOutput(period),
        getExecutionMap(12),
      ]);

      // Chart
      setChartData(
        (io || []).map(row => ({
          day: DAY_LABELS[new Date(row.bucket).getDay()],
          date: row.bucket,
          intake: Math.round(row.intake || 0),
          output: Math.round(row.output || 0),
        }))
      );

      // Heatmap — monta matriz 12 semanas x 7 dias
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - (12 * 7) + 1);
      const byDate = new Map((em || []).map(r => [r.log_date, r.execution_level]));

      const weeks = [];
      for (let w = 0; w < 12; w++) {
        const week = [];
        for (let d = 0; d < 7; d++) {
          const dt = new Date(start);
          dt.setDate(start.getDate() + w * 7 + d);
          // data LOCAL — toISOString (UTC) desalinha o heatmap após 21h BRT
          const iso = toLocalDateStr(dt);
          week.push(byDate.get(iso) ?? 0);
        }
        weeks.push(week);
      }
      setHeatmap(weeks);
    } catch (e) {
      console.error('useFitcalMetrics:', e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: atualiza quando métricas diárias mudam
  useEffect(() => {
    const ch = supabase
      .channel('fitcal-metrics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fitcal_daily_metrics' }, refresh)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [refresh]);

  return { chartData, heatmap, loading, refresh };
}
