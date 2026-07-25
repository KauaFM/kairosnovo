// ============================================================
// ORVAX — Entitlements (acesso por plano, SEM venda no app)
//
// Fonte de verdade: profiles.plan / profiles.is_premium — atualizados
// pelo webhook do Stripe DEPOIS da compra na Landing Page. O app só LÊ.
// Nada de preço, checkout ou billing aqui.
// ============================================================
import { supabase } from '../lib/supabase';

// Hierarquia de planos (maior número = mais acesso)
export const TIER_RANK = { gratuito: 0, essencial: 1, completo: 2 };

// Qual plano MÍNIMO cada recurso exige. O que não estiver aqui é livre
// pra todos (gratuito). Amplie conforme for gateando mais recursos.
export const FEATURE_MIN_TIER = {
  fitcal: 'completo', // Rastreador Nutricional = plano Completo
};

/** Normaliza o valor de profiles.plan/is_premium para um tier limpo. */
export function normalizeTier(plan, isPremium) {
  const p = String(plan || '').toLowerCase();
  if (p.includes('completo') || isPremium) return 'completo';
  if (p.includes('essencial')) return 'essencial';
  return 'gratuito';
}

/** Lê o entitlement do usuário logado a partir do profiles. */
export async function getEntitlement() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { tier: 'gratuito', plan: 'gratuito', isAdmin: false };
  const { data } = await supabase
    .from('profiles')
    .select('plan, is_premium, role')
    .eq('id', session.user.id)
    .maybeSingle();
  const isAdmin = data?.role === 'admin';
  // Admin enxerga tudo (dono/testes)
  const tier = isAdmin ? 'completo' : normalizeTier(data?.plan, data?.is_premium);
  return { tier, plan: data?.plan || 'gratuito', isAdmin };
}

/** O tier tem acesso ao recurso? */
export function tierHasFeature(tier, feature) {
  const need = FEATURE_MIN_TIER[feature];
  if (!need) return true; // recurso livre
  return (TIER_RANK[tier] ?? 0) >= (TIER_RANK[need] ?? 99);
}

/** Conveniência: o usuário logado tem o recurso? */
export async function hasFeature(feature) {
  const { tier } = await getEntitlement();
  return tierHasFeature(tier, feature);
}

/**
 * Pede upgrade: NÃO abre pagamento. Dispara um e-mail (server) com o
 * link da Landing Page. Retorna { ok, emailed, email }.
 */
export async function requestUpgrade(tier = 'completo', feature = null) {
  const { data, error } = await supabase.functions.invoke('request-upgrade', {
    body: { tier, feature },
  });
  if (error) throw new Error(error.message || 'Falha ao registrar o pedido.');
  if (data?.error) throw new Error(data.error);
  return data; // { ok, emailed, email }
}

/** Rótulo amigável do plano atual (para a tela "Seu Plano"). */
export function tierLabel(tier) {
  return { gratuito: 'Gratuito', essencial: 'Essencial', completo: 'Completo' }[tier] || 'Gratuito';
}
