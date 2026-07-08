-- ============================================================
-- ORVAX — Suporte aos workflows n8n
-- 2026-04-22
--
-- Adiciona:
--   1. Tabela push_notifications (feed in-app)
--   2. Coluna phone em profiles (integração WhatsApp)
--   3. RPC get_users_with_pending_habits (workflow 02)
--   4. RPC detect_performance_drops (workflow 03)
--   5. RPC weekly_insight_data (workflow futuro)
-- ============================================================

-- ------------------------------------------------------------
-- 1. push_notifications (feed in-app vindo do n8n / edge fns)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    kind       TEXT NOT NULL,                -- habit_reminder | drop_alert | weekly_insight | system
    meta       JSONB DEFAULT '{}'::jsonb,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_notifications_user_created
    ON public.push_notifications(user_id, created_at DESC);

ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY push_select_own ON public.push_notifications
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY push_update_own ON public.push_notifications
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- INSERT é feito com service_role (bypassa RLS) — sem policy pra cliente

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.push_notifications;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- ------------------------------------------------------------
-- 2. Coluna phone em profiles (WhatsApp opt-in)
-- ------------------------------------------------------------
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS full_name TEXT;

-- ------------------------------------------------------------
-- 3. RPC: usuários com hábitos pendentes hoje
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_users_with_pending_habits()
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    phone TEXT,
    pending_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH hoje AS (
        SELECT (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE AS d
    ),
    check_ins_hoje AS (
        SELECT hl.user_id, hl.habit_id
          FROM public.habit_logs hl, hoje
         WHERE hl.logged_at::DATE = hoje.d
    ),
    pendentes AS (
        SELECT h.user_id, COUNT(*) AS c
          FROM public.habits h
         WHERE h.active = TRUE
           AND h.frequency = 'daily'
           AND NOT EXISTS (
               SELECT 1 FROM check_ins_hoje c
                WHERE c.user_id = h.user_id AND c.habit_id = h.id
           )
         GROUP BY h.user_id
    )
    SELECT p.id::UUID                      AS user_id,
           COALESCE(p.full_name, split_part(p.email, '@', 1))::TEXT AS name,
           p.phone::TEXT                   AS phone,
           pend.c::INT                     AS pending_count
      FROM pendentes pend
      JOIN public.profiles p ON p.id = pend.user_id
     WHERE pend.c > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_with_pending_habits() TO service_role;

-- ------------------------------------------------------------
-- 4. RPC: detecta queda de desempenho (últimos 3 dias vs 14 anteriores)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.detect_performance_drops(p_threshold_pct INT DEFAULT 30)
RETURNS TABLE (
    user_id UUID,
    name TEXT,
    pillar TEXT,
    drop_pct INT,
    top_missing_habit TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH recent AS (
        SELECT user_id,
               AVG(disciplina)   AS disciplina,
               AVG(consistencia) AS consistencia,
               AVG(foco)         AS foco,
               AVG(energia)      AS energia,
               AVG(evolucao)     AS evolucao
          FROM public.daily_metrics
         WHERE day >= CURRENT_DATE - INTERVAL '3 days'
         GROUP BY user_id
    ),
    baseline AS (
        SELECT user_id,
               AVG(disciplina)   AS disciplina,
               AVG(consistencia) AS consistencia,
               AVG(foco)         AS foco,
               AVG(energia)      AS energia,
               AVG(evolucao)     AS evolucao
          FROM public.daily_metrics
         WHERE day >= CURRENT_DATE - INTERVAL '17 days'
           AND day <  CURRENT_DATE - INTERVAL '3 days'
         GROUP BY user_id
    ),
    deltas AS (
        SELECT r.user_id,
               unnest(ARRAY['disciplina','consistencia','foco','energia','evolucao']) AS pillar,
               unnest(ARRAY[
                   CASE WHEN b.disciplina   > 0 THEN ROUND(((b.disciplina   - r.disciplina)   / b.disciplina)   * 100) ELSE 0 END,
                   CASE WHEN b.consistencia > 0 THEN ROUND(((b.consistencia - r.consistencia) / b.consistencia) * 100) ELSE 0 END,
                   CASE WHEN b.foco         > 0 THEN ROUND(((b.foco         - r.foco)         / b.foco)         * 100) ELSE 0 END,
                   CASE WHEN b.energia      > 0 THEN ROUND(((b.energia      - r.energia)      / b.energia)      * 100) ELSE 0 END,
                   CASE WHEN b.evolucao     > 0 THEN ROUND(((b.evolucao     - r.evolucao)     / b.evolucao)     * 100) ELSE 0 END
               ])::INT AS drop_pct
          FROM recent r
          JOIN baseline b USING (user_id)
    )
    SELECT d.user_id,
           COALESCE(p.full_name, split_part(p.email, '@', 1))::TEXT AS name,
           d.pillar,
           d.drop_pct,
           (SELECT h.title FROM public.habits h
             WHERE h.user_id = d.user_id AND h.pillar = d.pillar AND h.active
             ORDER BY h.created_at ASC LIMIT 1)::TEXT AS top_missing_habit
      FROM deltas d
      JOIN public.profiles p ON p.id = d.user_id
     WHERE d.drop_pct >= p_threshold_pct
     ORDER BY d.drop_pct DESC
     LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.detect_performance_drops(INT) TO service_role;

-- ------------------------------------------------------------
-- 5. RPC: dados para insight semanal (workflow futuro)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.weekly_insight_data(p_user UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'xp_7d',        COALESCE(SUM(xp_gained), 0),
        'tasks_7d',     COALESCE(SUM(tasks_done), 0),
        'habits_7d',    COALESCE(SUM(habits_done), 0),
        'best_pillar',  (
            SELECT pillar FROM (
                VALUES
                    ('disciplina',   AVG(disciplina)),
                    ('consistencia', AVG(consistencia)),
                    ('foco',         AVG(foco)),
                    ('energia',      AVG(energia)),
                    ('evolucao',     AVG(evolucao))
            ) AS v(pillar, val) ORDER BY val DESC LIMIT 1
        ),
        'best_day',     (SELECT TO_CHAR(day, 'Day') FROM public.daily_metrics
                          WHERE user_id = p_user AND day >= CURRENT_DATE - INTERVAL '7 days'
                          ORDER BY (disciplina + consistencia + foco + energia + evolucao) DESC LIMIT 1)
    )
    INTO v_result
    FROM public.daily_metrics
    WHERE user_id = p_user AND day >= CURRENT_DATE - INTERVAL '7 days';

    RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.weekly_insight_data(UUID) TO authenticated, service_role;
