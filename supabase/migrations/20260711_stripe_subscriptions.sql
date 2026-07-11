-- ============================================================
-- ORVAX — Assinaturas Stripe
-- 2026-07-11
--
-- Modelo: 2 planos mensais recorrentes
--   · essencial (R$29,99) → acesso ao app
--   · completo  (R$39,99) → app + Rastreador Nutricional (FitCal)
--
-- Colunas de assinatura em `profiles`. Quem escreve é a Edge Function
-- `stripe-webhook` (service role), reagindo aos eventos do Stripe.
-- O front lê `is_subscribed` (gate global) e `is_premium` (FitCal),
-- ambos já na publication realtime → libera/tranca na hora.
-- ============================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS stripe_customer_id   TEXT,
    ADD COLUMN IF NOT EXISTS subscription_id      TEXT,
    ADD COLUMN IF NOT EXISTS subscription_status  TEXT,          -- active | trialing | past_due | canceled | unpaid | incomplete
    ADD COLUMN IF NOT EXISTS plan                 TEXT DEFAULT 'none',  -- none | essencial | completo
    ADD COLUMN IF NOT EXISTS current_period_end   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_subscribed        BOOLEAN DEFAULT FALSE; -- acesso base ao app
    -- is_premium (FitCal) já existe; o webhook mantém = (plan='completo' e ativo)

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
    ON public.profiles (stripe_customer_id);

-- Garante que profiles está na publication realtime (o gate reage a UPDATE).
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- RLS: o usuário pode LER o próprio status (as escritas são via service role
-- na Edge Function, que ignora RLS). Se já existe policy de select em profiles,
-- estas colunas passam a ser visíveis por ela — nada a fazer.
