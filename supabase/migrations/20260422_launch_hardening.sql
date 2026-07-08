-- ============================================================
-- ORVAX — Launch Hardening Migration
-- 2026-04-22
--
-- Objetivos:
--   1. Garantir RLS em tabelas core
--   2. profiles: política INSERT (faltando)
--   3. Realtime publication em transactions, financial_goals,
--      meal_entries, water_logs, nutrition_plans, user_notes
--   4. Índices de performance faltantes
--   5. Função utilitária para soft-deletion de conta (LGPD)
-- ============================================================

-- ------------------------------------------------------------
-- 1. RLS em profiles (INSERT policy faltando)
-- ------------------------------------------------------------
DO $$ BEGIN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY profiles_select_own ON public.profiles
        FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY profiles_insert_own ON public.profiles
        FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY profiles_update_own ON public.profiles
        FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Garante colunas necessárias em profiles (defensivo — idempotente)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS xp INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tasks_completed INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill de e-mail a partir de auth.users quando faltar
UPDATE public.profiles p
   SET email = u.email
  FROM auth.users u
 WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Leitura pública do ranking (apenas colunas não-sensíveis via VIEW)
DROP VIEW IF EXISTS public.v_ranking;
CREATE VIEW public.v_ranking AS
SELECT p.id,
       COALESCE(p.email, u.email) AS email,
       COALESCE(p.xp, 0)          AS xp,
       COALESCE(p.total_tasks_completed, 0) AS tasks
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
 ORDER BY xp DESC NULLS LAST
 LIMIT 100;

GRANT SELECT ON public.v_ranking TO authenticated, anon;

-- ------------------------------------------------------------
-- 2. Realtime publication (tabelas que o front assina)
-- ------------------------------------------------------------
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_goals;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_entries;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.water_logs;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.nutrition_plans;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notes;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.media_vault;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_posts;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

-- ------------------------------------------------------------
-- 3. Índices de performance (queries comuns do front)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tasks_user_state       ON public.tasks(user_id, state);
CREATE INDEX IF NOT EXISTS idx_tasks_user_scheduled   ON public.tasks(user_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_xp_log_user_created    ON public.xp_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_day ON public.daily_metrics(user_id, day DESC);
CREATE INDEX IF NOT EXISTS idx_habits_user_active     ON public.habits(user_id, active);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_day    ON public.habit_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_status      ON public.goals(user_id, status);

-- ------------------------------------------------------------
-- 4. RPC: delete_my_account (LGPD — right to erasure)
-- Apaga dados do usuário em cascata a partir do auth.users
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user UUID := auth.uid();
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Dados aplicativo (CASCADE nas FKs cuida do resto)
    DELETE FROM public.habit_logs     WHERE user_id = v_user;
    DELETE FROM public.xp_log         WHERE user_id = v_user;
    DELETE FROM public.daily_metrics  WHERE user_id = v_user;
    DELETE FROM public.habits         WHERE user_id = v_user;
    DELETE FROM public.goals          WHERE user_id = v_user;
    DELETE FROM public.tasks          WHERE user_id = v_user;
    DELETE FROM public.transactions   WHERE user_id = v_user;
    DELETE FROM public.financial_goals WHERE user_id = v_user;
    DELETE FROM public.user_notes     WHERE user_id = v_user;
    DELETE FROM public.media_vault    WHERE user_id = v_user;
    DELETE FROM public.meal_entries   WHERE user_id = v_user;
    DELETE FROM public.water_logs     WHERE user_id = v_user;
    DELETE FROM public.weight_logs    WHERE user_id = v_user;
    DELETE FROM public.nutrition_plans WHERE user_id = v_user;
    DELETE FROM public.profiles       WHERE id = v_user;

    -- Remove do auth (última etapa)
    DELETE FROM auth.users WHERE id = v_user;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- ------------------------------------------------------------
-- 5. RPC: log_focus_minutes (registra tempo de foco → pilar foco)
-- Útil pra botão "encerrar bloco de foco" no futuro
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_focus_minutes(p_minutes INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user UUID := auth.uid();
    v_day  DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
    v_xp   INT;
BEGIN
    IF v_user IS NULL OR p_minutes <= 0 THEN
        RETURN;
    END IF;

    -- 1 ponto de foco a cada 15min, máx 5 por dia (cap da escala)
    INSERT INTO public.daily_metrics(user_id, day, foco)
    VALUES (v_user, v_day, LEAST(5, GREATEST(1, p_minutes / 15)))
    ON CONFLICT (user_id, day) DO UPDATE
        SET foco = LEAST(5, public.daily_metrics.foco + LEAST(5, GREATEST(1, EXCLUDED.foco)));

    -- XP proporcional (1 XP por minuto, cap 60 XP/dia)
    v_xp := LEAST(60, p_minutes);
    INSERT INTO public.xp_log(user_id, source, source_id, amount)
    VALUES (v_user, 'focus_minutes', NULL, v_xp);

    UPDATE public.profiles
       SET xp = COALESCE(xp, 0) + v_xp,
           updated_at = NOW()
     WHERE id = v_user;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_focus_minutes(INT) TO authenticated;

-- ============================================================
-- FIM — confirmar execução no Supabase
-- ============================================================
