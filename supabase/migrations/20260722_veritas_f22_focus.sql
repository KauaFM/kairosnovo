-- ============================================================
-- ORVAX — PROTOCOLO VERITAS · F2.2 (Verificação N3 · Timer de Foco)
-- 2026-07-22 · docs/GDD_SISTEMA_EVOLUCAO.md §3.2 (N3)
--
-- Tabela PRÓPRIA do VERITAS (veritas_focus), separada da focus_sessions
-- da agenda do app (que é client-writable e não serve como prova).
-- veritas_focus é SÓ-SERVIDOR: sem policies de write; started_at/ended_at/
-- seconds vêm do NOW() do servidor via as RPCs abaixo → duração não-forjável.
-- O xp-engine lê a duração real para conceder N3 (Q=1.1).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.veritas_focus (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_type TEXT,
    source_id   TEXT,
    title       TEXT,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at    TIMESTAMPTZ,
    seconds     INTEGER,
    status      TEXT NOT NULL DEFAULT 'running',   -- running | ended | abandoned
    consumed    BOOLEAN NOT NULL DEFAULT FALSE,     -- já virou XP? (impede reuso)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_veritas_focus_user ON public.veritas_focus (user_id, created_at DESC);

ALTER TABLE public.veritas_focus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS veritas_focus_select_own ON public.veritas_focus;
CREATE POLICY veritas_focus_select_own ON public.veritas_focus FOR SELECT USING (auth.uid() = user_id);
-- Sem policies de write: só as RPCs (SECURITY DEFINER) escrevem, com now() do servidor.

-- ▸ START — cria a sessão (started_at do servidor), devolve o id
CREATE OR REPLACE FUNCTION public.veritas_start_focus(
    p_source_type text DEFAULT NULL, p_source_id text DEFAULT NULL, p_title text DEFAULT NULL)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id bigint; v_uid uuid;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
    -- encerra sessões penduradas (só 1 timer ativo por vez)
    UPDATE public.veritas_focus
       SET status = 'abandoned', ended_at = now(),
           seconds = GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at))::int)
     WHERE user_id = v_uid AND status = 'running';
    INSERT INTO public.veritas_focus (user_id, source_type, source_id, title)
    VALUES (v_uid, p_source_type, left(p_source_id, 64), left(p_title, 200))
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$;

-- ▸ END — fecha a sessão, calcula seconds no servidor
CREATE OR REPLACE FUNCTION public.veritas_end_focus(p_session_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_uid uuid; v_secs int;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
    UPDATE public.veritas_focus
       SET status = 'ended', ended_at = now(),
           seconds = GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at))::int)
     WHERE id = p_session_id AND user_id = v_uid AND status = 'running'
     RETURNING seconds INTO v_secs;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'sessao invalida'); END IF;
    RETURN jsonb_build_object('seconds', v_secs);
END; $$;

REVOKE EXECUTE ON FUNCTION public.veritas_start_focus(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.veritas_start_focus(text, text, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.veritas_start_focus(text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.veritas_end_focus(bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.veritas_end_focus(bigint) FROM anon;
GRANT  EXECUTE ON FUNCTION public.veritas_end_focus(bigint) TO authenticated;
