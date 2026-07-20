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
// Nome/tagline/features vêm do i18n (t('plans.<id>.*')).
//
// `family` decide o acesso: 'completo' libera o Rastreador Nutricional
// (is_premium). `period` = 'month' | 'quarter'. `badge` = null | 'save'
// | 'popular'. As chaves 'essencial'/'completo' seguem sendo os MENSAIS
// (compat com os price IDs já configurados no Stripe).
export const PLANS = {
  essencial:     { id: 'essencial',     family: 'essencial', price: 'R$ 29,99', period: 'month',   highlight: false, badge: null },
  essencial_tri: { id: 'essencial_tri', family: 'essencial', price: 'R$ 59,90', period: 'quarter', highlight: false, badge: 'save' },
  completo:      { id: 'completo',      family: 'completo',  price: 'R$ 39,99', period: 'month',   highlight: false, badge: null },
  completo_tri:  { id: 'completo_tri',  family: 'completo',  price: 'R$ 79,90', period: 'quarter', highlight: true,  badge: 'popular' },
};

export const PLAN_ORDER = ['essencial', 'essencial_tri', 'completo', 'completo_tri'];
