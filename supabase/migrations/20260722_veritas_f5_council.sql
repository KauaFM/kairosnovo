-- ============================================================
-- ORVAX — PROTOCOLO VERITAS · F5 (Conselho de IAs)
-- 2026-07-22 · docs/GDD_SISTEMA_EVOLUCAO.md §6
--
-- ai_insights: saída estruturada dos especialistas (VITALIS/NOÛS/
-- FORGE/AUREUS/ASCENT/NEXUS/LUMEN/MENTOR), gerada pela Edge Function
-- dimension-coach (o front NUNCA chama o LLM direto). 1 lote/semana.
-- veritas_dimension_metrics_for(uuid): variante service-role dos
-- agregados 30d (o coach roda com service key, sem auth.uid()).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_insights (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    dimension  TEXT NOT NULL,
    specialist TEXT,
    kind       TEXT NOT NULL,             -- insight | risk | plan | challenge | correction
    title      TEXT,
    body       TEXT,
    data_ref   TEXT,                      -- o dado que sustenta ("12 treinos em 30d")
    content    JSONB,
    week       DATE NOT NULL,             -- segunda-feira da semana (SP)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_week ON public.ai_insights (user_id, week DESC);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_insights_select_own ON public.ai_insights;
CREATE POLICY ai_insights_select_own ON public.ai_insights FOR SELECT USING (auth.uid() = user_id);
-- escrita só via service_role (dimension-coach)

-- ▸ Agregados 30d por usuário-alvo (SÓ service_role — usada pelo coach)
CREATE OR REPLACE FUNCTION public.veritas_dimension_metrics_for(p_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
    d30 date := current_date - 29;
    t30 timestamptz := now() - interval '30 days';
    res jsonb;
BEGIN
    SELECT jsonb_build_object(
        'workouts_30d',       (SELECT count(*) FROM public.workouts w WHERE w.user_id = p_user AND w.created_at >= t30),
        'workout_min_30d',    COALESCE((SELECT sum(w.duration_min) FROM public.workouts w WHERE w.user_id = p_user AND w.created_at >= t30), 0),
        'nutrition_days_30d', (SELECT count(DISTINCT d) FROM (
                                   SELECT log_date AS d FROM public.meal_entries WHERE user_id = p_user AND log_date >= d30
                                   UNION SELECT log_date FROM public.food_logs WHERE user_id = p_user AND log_date >= d30) x),
        'water_days_30d',     (SELECT count(DISTINCT log_date) FROM public.water_logs WHERE user_id = p_user AND log_date >= d30),
        'weight_logs_30d',    (SELECT count(*) FROM public.weight_logs WHERE user_id = p_user AND log_date >= d30),
        'focus_min_30d',      COALESCE((SELECT round(sum(seconds)/60.0) FROM public.veritas_focus WHERE user_id = p_user AND status = 'ended' AND created_at >= t30), 0),
        'focus_sessions_30d', (SELECT count(*) FROM public.veritas_focus WHERE user_id = p_user AND status = 'ended' AND seconds >= 300 AND created_at >= t30),
        'tasks_done_30d',     (SELECT count(*) FROM public.tasks WHERE user_id = p_user AND state = 'done' AND scheduled_date >= d30),
        'tasks_failed_30d',   (SELECT count(*) FROM public.tasks WHERE user_id = p_user AND state = 'failed' AND scheduled_date >= d30),
        'rituals_30d',        (SELECT count(*) FROM public.daily_reviews WHERE user_id = p_user AND completed AND day >= d30),
        'ritual_streak',      COALESCE((SELECT ritual_streak FROM public.daily_reviews WHERE user_id = p_user AND completed ORDER BY day DESC LIMIT 1), 0),
        'avg_energy_30d',     (SELECT round(avg(energy)::numeric, 1) FROM public.daily_reviews WHERE user_id = p_user AND completed AND day >= d30),
        'avg_sleep_h_30d',    (SELECT round(avg(sleep_h)::numeric, 1) FROM public.daily_reviews WHERE user_id = p_user AND completed AND day >= d30),
        'gratitude_days_30d', (SELECT count(*) FROM public.daily_reviews WHERE user_id = p_user AND completed AND day >= d30 AND length(trim(coalesce(gratitude, ''))) >= 5),
        'xp_30d',             COALESCE((SELECT sum(xp_final) FROM public.xp_events WHERE user_id = p_user AND created_at >= t30), 0)
    ) INTO res;
    RETURN res;
END; $$;

REVOKE EXECUTE ON FUNCTION public.veritas_dimension_metrics_for(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.veritas_dimension_metrics_for(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.veritas_dimension_metrics_for(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.veritas_dimension_metrics_for(uuid) TO service_role;
