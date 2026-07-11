// ============================================================
// ORVAX — billing (cliente das assinaturas Stripe)
//
// Fluxo: startCheckout(plan) → Edge Function create-checkout devolve a
// URL do Stripe Checkout → redireciona. O pagamento é confirmado pelo
// webhook (stripe-webhook), que marca profiles.is_subscribed/is_premium;
// o realtime destrava o app na hora (SubscriptionGate / FitCalGate).
// ============================================================

import { supabase } from '../lib/supabase';

// Lê o estado de assinatura do próprio usuário. Usa select('*') para não
// quebrar caso a migration das colunas ainda não tenha sido aplicada.
export async function getSubscription() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error) { console.warn('[billing] getSubscription falhou:', error.message); return null; }
  return {
    isSubscribed: !!data?.is_subscribed,
    isPremium: !!data?.is_premium,
    plan: data?.plan || 'none',
    status: data?.subscription_status || null,
    role: data?.role || 'user',
    currentPeriodEnd: data?.current_period_end || null,
    hasCustomer: !!data?.stripe_customer_id,
  };
}

// Inicia o checkout de um plano ('essencial' | 'completo') e redireciona.
export async function startCheckout(plan) {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { plan, origin: window.location.origin },
  });
  if (error) throw new Error(error.message || 'Falha ao iniciar o pagamento.');
  if (data?.error) throw new Error(data.error);
  if (data?.url) { window.location.href = data.url; return; }
  throw new Error('Não recebi a URL de pagamento. Verifique a configuração do Stripe.');
}

// Abre o Portal do Cliente do Stripe (gerenciar/cancelar assinatura).
export async function openBillingPortal() {
  const { data, error } = await supabase.functions.invoke('create-portal', {
    body: { origin: window.location.origin },
  });
  if (error) throw new Error(error.message || 'Falha ao abrir o portal.');
  if (data?.error) throw new Error(data.error);
  if (data?.url) { window.location.href = data.url; return; }
  throw new Error('Não recebi a URL do portal.');
}
