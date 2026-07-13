// ============================================================
// ORVAX — Configuração de planos/assinatura
//
// Gate global do app: quando ligado, exige assinatura ativa
// (profiles.is_subscribed). Admins (role='admin') sempre passam.
// ============================================================

// Liga/desliga o paywall do app inteiro. Ative só quando o Stripe
// estiver configurado (chaves + deploy das Edge Functions + webhook).
export const SUBSCRIPTION_GATE_ENABLED = true;

// Dados estruturais dos planos. Preço é o mesmo nos dois idiomas (BR).
// Nome/tagline/features/period vêm do i18n (t('plans.<id>.*')).
export const PLANS = {
  essencial: { id: 'essencial', price: 'R$ 29,99', highlight: false },
  completo: { id: 'completo', price: 'R$ 39,99', highlight: true },
};

export const PLAN_ORDER = ['essencial', 'completo'];
