-- ============================================================
-- ORVAX — PROTOCOLO VERITAS · F2.1 (Verificação N2 + Trust Score)
-- 2026-07-21 · docs/GDD_SISTEMA_EVOLUCAO.md §3
--
-- Substitui os fixos Q=0.6/T=0.75 da F1 por dinâmica real:
--   · verifications  — registro de nível/prova por conclusão
--   · trust_scores   — Índice de Integridade 0–100 (default 50)
--   · trust_events   — ledger de variações (transparência/contestação)
--   · veritas_bump_trust() — mutação atômica (só service_role)
--
-- F2.1: N1 (autodeclaração) e N2 (micro-entrevista heurística).
-- N3 (provas) e N4 (IA) chegam na F2.2/F2.3.
-- ============================================================

-- ▸ verifications -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verifications (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_type  TEXT NOT NULL,
    source_id    TEXT,
    level        SMALLINT NOT NULL DEFAULT 1,     -- 1..4
    kind         TEXT,                            -- selfdeclare|interview|photo|timer|file|audio|geo|integration
    answers      JSONB DEFAULT '{}',
    ai_confidence NUMERIC,
    status       TEXT NOT NULL DEFAULT 'valid',   -- valid|rejected|contested|pending
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON public.verifications (user_id, created_at DESC);
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verifications_select_own ON public.verifications;
CREATE POLICY verifications_select_own ON public.verifications FOR SELECT USING (auth.uid() = user_id);

-- ▸ trust_scores --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trust_scores (
    user_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    score      NUMERIC NOT NULL DEFAULT 50,       -- 0–100 (nasce neutro)
    p          NUMERIC DEFAULT 50,                -- prova
    coher      NUMERIC DEFAULT 50,                -- coerência das respostas
    temp       NUMERIC DEFAULT 50,                -- padrão temporal
    cross_c    NUMERIC DEFAULT 50,                -- consistência cruzada
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trust_scores_select_own ON public.trust_scores;
CREATE POLICY trust_scores_select_own ON public.trust_scores FOR SELECT USING (auth.uid() = user_id);

-- ▸ trust_events (transparência / contestação) --------------------
CREATE TABLE IF NOT EXISTS public.trust_events (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    delta      NUMERIC NOT NULL,
    reason     TEXT NOT NULL,
    ref        JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trust_events_user ON public.trust_events (user_id, created_at DESC);
ALTER TABLE public.trust_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trust_events_select_own ON public.trust_events;
CREATE POLICY trust_events_select_own ON public.trust_events FOR SELECT USING (auth.uid() = user_id);

-- ▸ veritas_bump_trust — mutação atômica (só service_role) --------
CREATE OR REPLACE FUNCTION public.veritas_bump_trust(
    p_user uuid, p_delta numeric, p_reason text, p_ref jsonb DEFAULT '{}'::jsonb)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_score numeric;
BEGIN
    INSERT INTO public.trust_scores (user_id) VALUES (p_user)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.trust_scores
       SET score = GREATEST(0, LEAST(100, score + p_delta)),
           updated_at = now()
     WHERE user_id = p_user
     RETURNING score INTO v_score;

    INSERT INTO public.trust_events (user_id, delta, reason, ref)
    VALUES (p_user, p_delta, p_reason, COALESCE(p_ref, '{}'::jsonb));

    RETURN v_score;
END; $$;

REVOKE EXECUTE ON FUNCTION public.veritas_bump_trust(uuid, numeric, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.veritas_bump_trust(uuid, numeric, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.veritas_bump_trust(uuid, numeric, text, jsonb) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.veritas_bump_trust(uuid, numeric, text, jsonb) TO service_role;
