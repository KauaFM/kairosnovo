// ============================================================
// ORVAX — Dimensões / métricas reais (Protocolo VERITAS · F4)
//
// Uma chamada → agregados de 30d de TODOS os módulos (GymRats,
// FitCal, foco provado, ritual, tarefas, XP), calculados no
// servidor pela RPC veritas_dimension_metrics().
// O Compass 2.0 usa isso pra ancorar as dimensões em dados reais.
// ============================================================
import { supabase } from '../lib/supabase';

let _cache = null;
let _cachedAt = 0;
const TTL = 60_000; // 1 min — evita repetir a RPC a cada pilar do radar

/** @returns {Promise<Object|null>} agregados 30d ou null se indisponível */
export async function getDimensionMetrics(force = false) {
  if (!force && _cache && Date.now() - _cachedAt < TTL) return _cache;
  try {
    const { data, error } = await supabase.rpc('veritas_dimension_metrics');
    if (error) throw error;
    _cache = data || null;
    _cachedAt = Date.now();
    return _cache;
  } catch (e) {
    console.warn('[dimensions] veritas_dimension_metrics falhou:', e?.message || e);
    return null;
  }
}

export function clearDimensionMetricsCache() {
  _cache = null;
  _cachedAt = 0;
}
