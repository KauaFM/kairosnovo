// =============================================================
// ORVAX · Life OS — useXpAward [DEPRECATED — VERITAS F1]
//
// Este hook concedia XP client-side (UPDATE direto em profiles.xp),
// o que permitia manipulação pelo console. Desde a F1 do Protocolo
// VERITAS (docs/GDD_SISTEMA_EVOLUCAO.md), XP só é emitido pelo
// xp-engine (Edge Function) via reportXpEvent(fatos).
//
// Este shim existe para não quebrar código legado: ignora a chamada.
// Use: import { reportXpEvent } from '../../services/xp'
// =============================================================
import { useCallback } from 'react';

export interface XpAwardPayload {
  amount: number;
  reason: string;
  pillar?: string;
}

export function useXpAward() {
  return useCallback(async (_payload: XpAwardPayload): Promise<number | null> => {
    console.warn('[useXpAward] DEPRECATED: XP agora é emitido pelo xp-engine (server). Chamada ignorada — use reportXpEvent(fatos).');
    return null;
  }, []);
}
