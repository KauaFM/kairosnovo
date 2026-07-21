-- ============================================================
-- ORVAX — PROTOCOLO VERITAS · F1 (Fundação)
-- 2026-07-20 · docs/GDD_SISTEMA_EVOLUCAO.md
--
-- 1. Ledger imutável de XP (xp_events): única fonte da verdade.
-- 2. Tranca a RPC legada add_xp_and_update_streak (só service role).
-- 3. Blinda profiles.xp contra UPDATE vindo do cliente (trigger).
-- 4. veritas_apply_xp: aplicação atômica de XP (só service role).
--
-- NOTA F1: streak_days segue client-writable porque o FitCal
-- (streakService.js) o usa para o streak de refeições. O engine lê
-- streak_days para o fator C (limitado a 1.5x — risco residual
-- aceitável). Migrar streak para o servidor é escopo da F2.
-- ============================================================

-- 1 ▸ LEDGER ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xp_events (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,             -- task|habit|event|meeting|reminder|payment|goal_progress|goal_complete|ritual|challenge|arena|finance
    source_id   TEXT,
    dimension   TEXT NOT NULL DEFAULT 'general',
    title_norm  TEXT,                      -- título normalizado p/ raridade e saturação
    base NUMERIC NOT NULL,
    d NUMERIC NOT NULL, q NUMERIC NOT NULL, c NUMERIC NOT NULL,
    t NUMERIC NOT NULL, s NUMERIC NOT NULL, k NUMERIC NOT NULL,
    crit BOOLEAN NOT NULL DEFAULT FALSE,
    xp_final INT NOT NULL,
    meta JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON public.xp_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_title   ON public.xp_events (user_id, title_norm, created_at DESC);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS xp_events_select_own ON public.xp_events;
CREATE POLICY xp_events_select_own ON public.xp_events
    FOR SELECT USING (auth.uid() = user_id);
-- Sem policies de INSERT/UPDATE/DELETE → cliente não escreve.
-- Service role (xp-engine) ignora RLS. Ledger é append-only por construção.

-- 2 ▸ TRANCA A RPC LEGADA ----------------------------------------
-- Falha original: SECURITY DEFINER + p_user_id como parâmetro
-- = qualquer usuário dava XP arbitrário a QUALQUER conta.
REVOKE EXECUTE ON FUNCTION public.add_xp_and_update_streak(uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_xp_and_update_streak(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_xp_and_update_streak(uuid, integer, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.add_xp_and_update_streak(uuid, integer, text) TO service_role;

-- 3 ▸ BLINDA profiles.xp -----------------------------------------
-- Cliente pode atualizar o próprio perfil (nome, avatar, FitCal...),
-- mas alterações em xp vindas de sessão não-service são revertidas.
CREATE OR REPLACE FUNCTION public.protect_xp_column()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_role TEXT;
BEGIN
    v_role := COALESCE(
        NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'role',
        'none');
    IF v_role <> 'service_role' THEN
        NEW.xp := OLD.xp;   -- silencioso: o resto do UPDATE passa
    END IF;
    RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_xp ON public.profiles;
CREATE TRIGGER trg_protect_xp
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_xp_column();

-- 4 ▸ APLICADOR ATÔMICO ------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_xp_date DATE;

CREATE OR REPLACE FUNCTION public.veritas_apply_xp(p_user_id uuid, p_xp integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new_xp INT;
BEGIN
    UPDATE public.profiles
       SET xp = COALESCE(xp, 0) + GREATEST(p_xp, 0),
           last_xp_date = (now() AT TIME ZONE 'America/Sao_Paulo')::date,
           updated_at = now()
     WHERE id = p_user_id
     RETURNING xp INTO v_new_xp;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'profile not found');
    END IF;
    RETURN jsonb_build_object('new_xp', v_new_xp);
END; $$;

REVOKE EXECUTE ON FUNCTION public.veritas_apply_xp(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.veritas_apply_xp(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.veritas_apply_xp(uuid, integer) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.veritas_apply_xp(uuid, integer) TO service_role;
