-- ============================================================
-- ORVAX — PROTOCOLO VERITAS · F3 (Ritual "Registrar Dia" 2.0)
-- 2026-07-22 · docs/GDD_SISTEMA_EVOLUCAO.md §4
--
-- daily_reviews: 1 linha por usuário/dia. Escrita SÓ via RPC
-- (SECURITY DEFINER) — a nota do dia é CALCULADA no servidor:
--   40% execução real (xp_events de hoje — fonte confiável)
-- + 20% equilíbrio (nº de dimensões distintas tocadas hoje)
-- + 15% autoavaliação (self_score 0-10, importa mas não domina)
-- + 15% qualidade do ritual (atos completados + especificidade)
-- + 10% consistência (streak PRÓPRIO do ritual)
-- O XP do ritual sai do xp-engine (source_type='ritual'), que
-- valida a review de hoje e marca xp_awarded (1×/dia).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.daily_reviews (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day             DATE NOT NULL,
    -- Ato III — Escaneamento
    energy          SMALLINT,          -- 1-5
    emotions        TEXT[],            -- até 2 da grade de 8
    sleep_h         NUMERIC(4,1),      -- horas de sono
    sleep_q         SMALLINT,          -- 1-5
    -- Ato IV — Interrogatório Gentil (coração do N2 diário)
    victory         TEXT,
    challenge       TEXT,
    learning        TEXT,
    gratitude       TEXT,
    self_score      SMALLINT,          -- 0-10 autoavaliação
    -- Ato II — Acerto de Contas (decisões sobre pendências)
    reconciled      JSONB,             -- { migrated:[], abandoned:[{id,reason}] }
    -- Ato V/VI — Veredito e Amanhã
    computed_score  NUMERIC(4,1),      -- nota 0-10 CALCULADA (servidor)
    ai_reflection   TEXT,
    tomorrow_intent TEXT,              -- intenção de implementação
    -- Controle
    acts            SMALLINT NOT NULL DEFAULT 0,   -- atos completados (0-6)
    ritual_streak   INTEGER  NOT NULL DEFAULT 1,   -- streak próprio do ritual
    xp_awarded      BOOLEAN  NOT NULL DEFAULT FALSE, -- consumido pelo xp-engine
    completed       BOOLEAN  NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, day)
);
CREATE INDEX IF NOT EXISTS idx_daily_reviews_user_day ON public.daily_reviews (user_id, day DESC);

ALTER TABLE public.daily_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_reviews_select_own ON public.daily_reviews;
CREATE POLICY daily_reviews_select_own ON public.daily_reviews FOR SELECT USING (auth.uid() = user_id);
-- Sem policies de write: só as RPCs abaixo (e o xp-engine via service_role) escrevem.

-- ▸ Dia VERITAS: o dia "vira" às 03:00 de São Paulo (igual ao xp-engine)
CREATE OR REPLACE FUNCTION public.veritas_today()
RETURNS date LANGUAGE sql STABLE AS
$$ SELECT ((now() AT TIME ZONE 'America/Sao_Paulo') - interval '3 hours')::date $$;

-- ▸ SUBMIT — grava os Atos II-IV e calcula a nota do dia no servidor
CREATE OR REPLACE FUNCTION public.veritas_submit_review(
    p_energy     int      DEFAULT NULL,
    p_emotions   text[]   DEFAULT NULL,
    p_sleep_h    numeric  DEFAULT NULL,
    p_sleep_q    int      DEFAULT NULL,
    p_victory    text     DEFAULT NULL,
    p_challenge  text     DEFAULT NULL,
    p_learning   text     DEFAULT NULL,
    p_gratitude  text     DEFAULT NULL,
    p_self_score int      DEFAULT NULL,
    p_acts       int      DEFAULT 0,
    p_reconciled jsonb    DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_uid      uuid;
    v_day      date;
    v_start    timestamptz;
    v_actions  int;
    v_dims     int;
    v_streak   int;
    v_exec     numeric; v_bal numeric; v_self numeric; v_qual numeric; v_cons numeric;
    v_spec     int := 0;
    v_score    numeric;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
    v_day   := public.veritas_today();
    v_start := (v_day + time '03:00') AT TIME ZONE 'America/Sao_Paulo';

    -- execução real: eventos de conclusão de HOJE no ledger (fonte só-servidor)
    SELECT count(*), count(DISTINCT dimension) INTO v_actions, v_dims
      FROM public.xp_events
     WHERE user_id = v_uid AND created_at >= v_start
       AND source_type IN ('task','habit','event','meeting','reminder','payment');

    -- streak próprio do ritual (ontem completou? streak+1 : 1)
    SELECT COALESCE(ritual_streak, 0) INTO v_streak
      FROM public.daily_reviews
     WHERE user_id = v_uid AND day = v_day - 1 AND completed;
    v_streak := COALESCE(v_streak, 0) + 1;

    -- especificidade: cada resposta do Ato IV com substância (≥15 chars) conta
    IF length(trim(coalesce(p_victory,'')))   >= 15 THEN v_spec := v_spec + 1; END IF;
    IF length(trim(coalesce(p_challenge,''))) >= 15 THEN v_spec := v_spec + 1; END IF;
    IF length(trim(coalesce(p_learning,'')))  >= 15 THEN v_spec := v_spec + 1; END IF;
    IF length(trim(coalesce(p_gratitude,''))) >= 15 THEN v_spec := v_spec + 1; END IF;

    -- componentes 0-10
    v_exec := least(10, v_actions * 2.0);                          -- 5 conclusões = 10
    v_bal  := least(10, v_dims * 2.5);                             -- 4 dimensões = 10
    v_self := greatest(0, least(10, coalesce(p_self_score, 5)));
    v_qual := least(10, (least(6, greatest(0, p_acts)) * 1.0) + v_spec);  -- 6 atos + 4 textos
    v_cons := least(10, v_streak);

    v_score := round(0.40*v_exec + 0.20*v_bal + 0.15*v_self + 0.15*v_qual + 0.10*v_cons, 1);

    INSERT INTO public.daily_reviews AS dr
        (user_id, day, energy, emotions, sleep_h, sleep_q,
         victory, challenge, learning, gratitude, self_score,
         reconciled, computed_score, acts, ritual_streak, completed)
    VALUES
        (v_uid, v_day,
         greatest(1, least(5, coalesce(p_energy, 3))),
         p_emotions[1:2], p_sleep_h, p_sleep_q,
         left(p_victory, 500), left(p_challenge, 500), left(p_learning, 500), left(p_gratitude, 500),
         greatest(0, least(10, coalesce(p_self_score, 5))),
         p_reconciled, v_score, least(6, greatest(0, p_acts)), v_streak, TRUE)
    ON CONFLICT (user_id, day) DO UPDATE SET
         energy = EXCLUDED.energy, emotions = EXCLUDED.emotions,
         sleep_h = EXCLUDED.sleep_h, sleep_q = EXCLUDED.sleep_q,
         victory = EXCLUDED.victory, challenge = EXCLUDED.challenge,
         learning = EXCLUDED.learning, gratitude = EXCLUDED.gratitude,
         self_score = EXCLUDED.self_score, reconciled = EXCLUDED.reconciled,
         computed_score = EXCLUDED.computed_score, acts = EXCLUDED.acts,
         ritual_streak = EXCLUDED.ritual_streak, completed = TRUE;
         -- xp_awarded NÃO é resetado: refazer o ritual não re-emite XP

    RETURN jsonb_build_object(
        'day', v_day, 'score', v_score, 'streak', v_streak,
        'actions', v_actions, 'dims', v_dims,
        'parts', jsonb_build_object('exec', v_exec, 'balance', v_bal,
                 'self', v_self, 'quality', v_qual, 'consistency', v_cons));
END; $$;

-- ▸ AMANHÃ — Ato VI: grava a intenção de implementação na review de hoje
CREATE OR REPLACE FUNCTION public.veritas_set_tomorrow(p_intent text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_uid uuid;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
    UPDATE public.daily_reviews
       SET tomorrow_intent = left(p_intent, 300)
     WHERE user_id = v_uid AND day = public.veritas_today();
END; $$;

REVOKE EXECUTE ON FUNCTION public.veritas_submit_review(int,text[],numeric,int,text,text,text,text,int,int,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.veritas_submit_review(int,text[],numeric,int,text,text,text,text,int,int,jsonb) FROM anon;
GRANT  EXECUTE ON FUNCTION public.veritas_submit_review(int,text[],numeric,int,text,text,text,text,int,int,jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.veritas_set_tomorrow(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.veritas_set_tomorrow(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.veritas_set_tomorrow(text) TO authenticated;
