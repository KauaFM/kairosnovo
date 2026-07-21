// ============================================================
// ORVAX — XP client (Protocolo VERITAS · F1)
//
// O cliente NÃO decide valores de XP. Ele reporta FATOS
// ("concluí a tarefa X") ao xp-engine (Edge Function), que aplica
// a fórmula B×D×Q×C×T×S×K server-side e devolve o valor real.
// Docs: docs/GDD_SISTEMA_EVOLUCAO.md §2.
// ============================================================
import { supabase } from '../lib/supabase';

/**
 * Reporta um evento de execução ao motor de XP.
 * @param {Object} facts
 * @param {string} facts.source_type  task|habit|event|meeting|reminder|payment|goal_progress|goal_complete|ritual|challenge|arena|finance
 * @param {string} [facts.source_id]
 * @param {string} [facts.title]      título real (alimenta raridade/saturação)
 * @param {string} [facts.dimension]
 * @param {number} [facts.difficulty] 1–5
 * @param {number} [facts.minutes]
 * @param {number} [facts.priority]   1–3
 * @returns {Promise<{xp:number,total:number,streak:number,factors:Object}|null>}
 */
export async function reportXpEvent(facts) {
  try {
    const { data, error } = await supabase.functions.invoke('xp-engine', { body: facts });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    if (data?.xp != null) {
      // Toast global (XpToastLayer escuta) — com o valor REAL do servidor
      window.dispatchEvent(new CustomEvent('orvax:xp-gain', {
        detail: { amount: data.xp, reason: facts.source_type, total: data.total },
      }));
    }
    return data;
  } catch (e) {
    console.warn('[xp] reportXpEvent falhou:', e?.message || e);
    return null;
  }
}
