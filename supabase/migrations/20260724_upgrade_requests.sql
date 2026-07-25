-- ============================================================
-- ORVAX — Intenção de upgrade (app = só acesso; venda fora do app)
-- 2026-07-24
--
-- O app NÃO vende. Quando o usuário toca "quero desbloquear", grava
-- a intenção aqui e a Edge Function request-upgrade manda um e-mail
-- com o link da Landing Page. Compatível com Google Play (nenhum
-- preço/checkout/link de compra dentro do app).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.upgrade_requests (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_tier TEXT NOT NULL,              -- essencial | completo
    source_feature TEXT,                       -- ex.: 'fitcal' (de onde partiu)
    emailed        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_user ON public.upgrade_requests (user_id, created_at DESC);

ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS upgrade_requests_select_own ON public.upgrade_requests;
CREATE POLICY upgrade_requests_select_own ON public.upgrade_requests
  FOR SELECT USING (auth.uid() = user_id);
-- escrita só via Edge Function (service_role) — o cliente não insere direto
