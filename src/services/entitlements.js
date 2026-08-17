// ============================================================
// ORVAX — Entitlements (acesso por plano, SEM venda no app)
//
// Fonte de verdade: profiles.plan / profiles.is_premium — atualizados
// pelo webhook do Stripe DEPOIS da compra na Landing Page. O app só LÊ.
// Nada de preço, checkout ou billing aqui.
// ============================================================
import { supabase } from '../lib/supabase';

// Hierarquia de planos. NÃO existe plano gratuito: são 2 planos pagos
// (essencial | completo). 'none' = conta sem plano ativo (não usa o app).
//
// 'demo' é a amostra de 15 minutos da Landing Page. Vale como 'completo'
// para ENXERGAR (a pessoa precisa ver o produto inteiro para decidir),
// mas fica de fora da IA — ver AI_FEATURES abaixo.
export const TIER_RANK = { none: 0, demo: 2, essencial: 1, completo: 2 };

// Qual plano MÍNIMO cada recurso exige. O que não estiver aqui exige
// apenas um plano ativo (essencial). Amplie conforme for gateando mais.
export const FEATURE_MIN_TIER = {
  fitcal: 'completo', // Rastreador Nutricional = plano Completo
};

// Recursos que custam dinheiro por uso (OpenAI). A demonstração é aberta
// a qualquer visitante, sem cadastro — liberar IA aqui seria entregar o
// saldo da OpenAI a quem passar na rua. O servidor também recusa por
// conta própria (hasCompleto nas Edge Functions), isto é a segunda trava.
export const AI_FEATURES = new Set(['mentor', 'vitalis', 'scanner', 'council']);

/**
 * Normaliza profiles.plan/is_premium para um tier limpo.
 * @param expiresAt profiles.current_period_end — usado só pela demo, que
 *        reaproveita esse campo como prazo em vez de exigir migração.
 */
export function normalizeTier(plan, isPremium, expiresAt = null) {
  const p = String(plan || '').toLowerCase();
  if (p === 'demo') {
    const fim = expiresAt ? new Date(expiresAt).getTime() : 0;
    return fim > Date.now() ? 'demo' : 'none'; // venceu → tela informativa
  }
  if (p.includes('completo') || isPremium) return 'completo';
  if (p.includes('essencial')) return 'essencial';
  return 'none'; // sem plano ativo
}

/** Quanto falta da demonstração, em ms. 0 quando não é demo ou já venceu. */
export function demoMsRestantes(plan, expiresAt) {
  if (String(plan || '').toLowerCase() !== 'demo' || !expiresAt) return 0;
  return Math.max(0, new Date(expiresAt).getTime() - Date.now());
}

/** Tem plano ativo (contratou na Landing Page)? */
export function hasActivePlan(tier) {
  return (TIER_RANK[tier] ?? 0) > 0;
}

/** Lê o entitlement do usuário logado a partir do profiles. */
export async function getEntitlement() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { tier: 'none', plan: 'none', isAdmin: false };
  const { data } = await supabase
    .from('profiles')
    .select('plan, is_premium, role, current_period_end')
    .eq('id', session.user.id)
    .maybeSingle();
  const isAdmin = data?.role === 'admin';
  // Admin enxerga tudo (dono/testes)
  const tier = isAdmin
    ? 'completo'
    : normalizeTier(data?.plan, data?.is_premium, data?.current_period_end);
  return {
    tier,
    plan: data?.plan || 'none',
    isAdmin,
    expiraEm: data?.current_period_end || null,
    msRestantes: demoMsRestantes(data?.plan, data?.current_period_end),
  };
}

/** O tier tem acesso ao recurso? */
export function tierHasFeature(tier, feature) {
  // A demo mostra o produto, mas não gasta IA (ver AI_FEATURES).
  if (tier === 'demo' && AI_FEATURES.has(feature)) return false;
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
  return { none: 'Sem plano ativo', demo: 'Demonstração', essencial: 'Essencial', completo: 'Completo' }[tier] || 'Sem plano ativo';
}
