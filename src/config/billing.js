// ============================================================
// ORVAX — Configuração de planos/assinatura
//
// Gate global do app: quando ligado, exige assinatura ativa
// (profiles.is_subscribed). Admins (role='admin') sempre passam.
// ============================================================

// Liga/desliga o paywall do app inteiro. Ative só quando o Stripe
// estiver configurado (chaves + deploy das Edge Functions + webhook).
export const SUBSCRIPTION_GATE_ENABLED = true;

export const PLANS = {
  essencial: {
    id: 'essencial',
    name: 'Essencial',
    price: 'R$ 29,99',
    period: '/mês',
    tagline: 'Acesso completo ao sistema ORVAX',
    features: [
      'Cofre, Agenda e Capital',
      'Telemetria e Dimensões da vida',
      'Mentor de IA e Dossiê',
      'Arena e ranking',
    ],
    highlight: false,
  },
  completo: {
    id: 'completo',
    name: 'Completo',
    price: 'R$ 39,99',
    period: '/mês',
    tagline: 'Tudo do Essencial + Rastreador Nutricional',
    features: [
      'Tudo do plano Essencial',
      'Scanner IA de refeições',
      'Diário alimentar e macros',
      'Hidratação, peso e progresso',
    ],
    highlight: true,
  },
};

export const PLAN_ORDER = ['essencial', 'completo'];
