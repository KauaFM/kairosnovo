// =============================================================
// ORVAX · VERITAS F2.2 — Focus timer (prova N3)
// Início/fim são cronometrados no SERVIDOR (RPCs SECURITY DEFINER).
// O cliente não controla a duração → serve como prova de execução.
// =============================================================
import { supabase } from '../lib/supabase';

/** Inicia uma sessão de foco. Retorna o id (bigint) da sessão. */
export async function startFocus(sourceType, sourceId, title) {
  const { data, error } = await supabase.rpc('veritas_start_focus', {
    p_source_type: sourceType || null,
    p_source_id: sourceId ? String(sourceId) : null,
    p_title: title || null,
  });
  if (error) throw error;
  return data; // session id
}

/** Encerra a sessão. Retorna { seconds } (duração real do servidor). */
export async function endFocus(sessionId) {
  const { data, error } = await supabase.rpc('veritas_end_focus', { p_session_id: sessionId });
  if (error) throw error;
  return data;
}
