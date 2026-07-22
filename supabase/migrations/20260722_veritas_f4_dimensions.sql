-- ============================================================
-- ORVAX — PROTOCOLO VERITAS · F4 (Dimensões com métricas reais)
-- 2026-07-22 · docs/GDD_SISTEMA_EVOLUCAO.md §5 e §10.1
--
-- 1) metric_definitions / metric_samples: fundação do catálogo
--    de métricas por dimensão (usado pelo Conselho de IAs na F5).
-- 2) veritas_dimension_metrics(): agregados REAIS de 30 dias por
--    módulo (GymRats, FitCal, foco, ritual, tarefas, XP) em uma
--    chamada — o Compass 2.0 lê daqui em vez de inventar números.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.metric_definitions (
    key         TEXT PRIMARY KEY,
    dimension   TEXT NOT NULL,
    source      TEXT NOT NULL,          -- D=declarada · V=verificada · I=integração · C=derivada
    unit        TEXT,
    window_days INTEGER DEFAULT 30,
    direction   TEXT DEFAULT 'up',      -- up | down | range
    weight      NUMERIC DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.metric_samples (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    metric_key TEXT NOT NULL REFERENCES public.metric_definitions(key),
    value      NUMERIC NOT NULL,
    sampled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metric_samples_user ON public.metric_samples (user_id, metric_key, sampled_at DESC);

ALTER TABLE public.metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_samples ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS metric_definitions_read ON public.metric_definitions;
CREATE POLICY metric_definitions_read ON public.metric_definitions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS metric_samples_select_own ON public.metric_samples;
CREATE POLICY metric_samples_select_own ON public.metric_samples FOR SELECT USING (auth.uid() = user_id);
-- escrita só via servidor (service_role / crons futuros)

-- ▸ Catálogo inicial (subconjunto operacional do GDD §5)
INSERT INTO public.metric_definitions (key, dimension, source, unit, window_days, direction) VALUES
    ('workouts',        'body',      'I', 'sessões', 30, 'up'),
    ('workout_minutes', 'body',      'I', 'min',     30, 'up'),
    ('nutrition_days',  'body',      'I', 'dias',    30, 'up'),
    ('water_days',      'body',      'I', 'dias',    30, 'up'),
    ('weight_logs',     'body',      'I', 'registros',30,'up'),
    ('focus_minutes',   'mind',      'V', 'min',     30, 'up'),
    ('focus_sessions',  'mind',      'V', 'sessões', 30, 'up'),
    ('tasks_done',      'execution', 'I', 'tarefas', 30, 'up'),
    ('tasks_failed',    'execution', 'I', 'tarefas', 30, 'down'),
    ('rituals',         'evolution', 'D', 'rituais', 30, 'up'),
    ('ritual_streak',   'evolution', 'D', 'dias',    30, 'up'),
    ('avg_energy',      'internal',  'D', '1-5',     30, 'up'),
    ('avg_sleep_h',     'internal',  'D', 'h',       30, 'range'),
    ('gratitude_days',  'internal',  'D', 'dias',    30, 'up'),
    ('xp_total',        'evolution', 'V', 'xp',      30, 'up')
ON CONFLICT (key) DO NOTHING;

-- ▸ Agregados reais de 30d — uma chamada, todas as fontes
CREATE OR REPLACE FUNCTION public.veritas_dimension_metrics()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
    v_uid uuid;
    d30   date := current_date - 29;
    t30   timestamptz := now() - interval '30 days';
    res   jsonb;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;

    SELECT jsonb_build_object(
        -- CORPO (GymRats + FitCal)
        'workouts_30d',       (SELECT count(*) FROM public.workouts w WHERE w.user_id = v_uid AND w.created_at >= t30),
        'workout_min_30d',    COALESCE((SELECT sum(w.duration_min) FROM public.workouts w WHERE w.user_id = v_uid AND w.created_at >= t30), 0),
        'nutrition_days_30d', (SELECT count(DISTINCT d) FROM (
                                   SELECT log_date AS d FROM public.meal_entries WHERE user_id = v_uid AND log_date >= d30
                                   UNION SELECT log_date FROM public.food_logs WHERE user_id = v_uid AND log_date >= d30) x),
        'water_days_30d',     (SELECT count(DISTINCT log_date) FROM public.water_logs WHERE user_id = v_uid AND log_date >= d30),
        'weight_logs_30d',    (SELECT count(*) FROM public.weight_logs WHERE user_id = v_uid AND log_date >= d30),
        -- MENTE (foco provado — veritas_focus é só-servidor)
        'focus_min_30d',      COALESCE((SELECT round(sum(seconds)/60.0) FROM public.veritas_focus WHERE user_id = v_uid AND status = 'ended' AND created_at >= t30), 0),
        'focus_sessions_30d', (SELECT count(*) FROM public.veritas_focus WHERE user_id = v_uid AND status = 'ended' AND seconds >= 300 AND created_at >= t30),
        -- EXECUÇÃO
        'tasks_done_30d',     (SELECT count(*) FROM public.tasks WHERE user_id = v_uid AND state = 'done' AND scheduled_date >= d30),
        'tasks_failed_30d',   (SELECT count(*) FROM public.tasks WHERE user_id = v_uid AND state = 'failed' AND scheduled_date >= d30),
        -- INTERNO / EVOLUÇÃO (ritual)
        'rituals_30d',        (SELECT count(*) FROM public.daily_reviews WHERE user_id = v_uid AND completed AND day >= d30),
        'ritual_streak',      COALESCE((SELECT ritual_streak FROM public.daily_reviews WHERE user_id = v_uid AND completed ORDER BY day DESC LIMIT 1), 0),
        'avg_energy_30d',     (SELECT round(avg(energy)::numeric, 1) FROM public.daily_reviews WHERE user_id = v_uid AND completed AND day >= d30),
        'avg_sleep_h_30d',    (SELECT round(avg(sleep_h)::numeric, 1) FROM public.daily_reviews WHERE user_id = v_uid AND completed AND day >= d30),
        'avg_sleep_q_30d',    (SELECT round(avg(sleep_q)::numeric, 1) FROM public.daily_reviews WHERE user_id = v_uid AND completed AND day >= d30),
        'gratitude_days_30d', (SELECT count(*) FROM public.daily_reviews WHERE user_id = v_uid AND completed AND day >= d30 AND length(trim(coalesce(gratitude, ''))) >= 5),
        -- XP (ledger só-servidor)
        'xp_30d',             COALESCE((SELECT sum(xp_final) FROM public.xp_events WHERE user_id = v_uid AND created_at >= t30), 0)
    ) INTO res;
    RETURN res;
END; $$;

REVOKE EXECUTE ON FUNCTION public.veritas_dimension_metrics() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.veritas_dimension_metrics() FROM anon;
GRANT  EXECUTE ON FUNCTION public.veritas_dimension_metrics() TO authenticated;
