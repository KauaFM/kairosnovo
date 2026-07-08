// =============================================================
// ORVAX · Life OS — Hook de concessão de XP
// Integra com o sistema de XP já existente em `profiles.xp`.
// Lança CustomEvent('orvax:xp-gain') pra qualquer camada superior
// animar/escutar (ex: toast de "+10 XP").
// =============================================================
import { useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export interface XpAwardPayload {
  amount: number;
  reason: string;
  pillar?: string;
}

export function useXpAward() {
  return useCallback(async (payload: XpAwardPayload): Promise<number | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // 1) Lê XP atual
      const { data: profile, error: readErr } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user.id)
        .single();
      if (readErr) throw readErr;

      const newXp = Math.max(0, (profile?.xp || 0) + payload.amount);

      // 2) Atualiza
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ xp: newXp })
        .eq('id', user.id);
      if (updErr) throw updErr;

      // 3) Dispatcha evento global pra animação/toast
      window.dispatchEvent(new CustomEvent('orvax:xp-gain', {
        detail: { amount: payload.amount, reason: payload.reason, pillar: payload.pillar, total: newXp },
      }));

      return newXp;
    } catch (e) {
      console.warn('[useXpAward]', e);
      return null;
    }
  }, []);
}
