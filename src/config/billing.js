// ============================================================
// ORVAX — Configuração de planos/assinatura
//
// Gate global do app: quando ligado, exige assinatura ativa
// (profiles.is_subscribed). Admins (role='admin') sempre passam.
// O acesso ao Rastreador Nutricional (FitCal) usa profiles.is_premium,
// que o webhook marca = true para qualquer variante do tier "completo".
// ============================================================

// Liga/desliga o paywall do app inteiro. Ative só quando o Stripe
// estiver configurado (chaves + deploy das Edge Functions + webhook).
export const SUBSCRIPTION_GATE_ENABLED = true;

// 4 planos = 2 tiers (essencial | completo) × 2 intervalos (mensal | trimestral).
// Preço é o mesmo nos dois idiomas (BR). Nome/tagline/features/período vêm do
// i18n (t('plans.<id>.*')). `tier` decide o acesso; `interval` só muda a cobrança.
export const PLANS = {
  essencial_mensal:     { id: 'essencial_mensal',     tier: 'essencial', interval: 'mensal',     price: 'R$ 29,99', highlight: false },
  essencial_trimestral: { id: 'essencial_trimestral', tier: 'essencial', interval: 'trimestral', price: 'R$ 59,90', highlight: false, badge: 'save' },
  completo_mensal:      { id: 'completo_mensal',      tier: 'completo',  interval: 'mensal',     price: 'R$ 39,99', highlight: false },
  completo_trimestral:  { id: 'completo_trimestral',  tier: 'completo',  interval: 'trimestral', price: 'R$ 79,90', highlight: true,  badge: 'popular' },
};

export const PLAN_ORDER = ['essencial_mensal', 'essencial_trimestral', 'completo_mensal', 'completo_trimestral'];
