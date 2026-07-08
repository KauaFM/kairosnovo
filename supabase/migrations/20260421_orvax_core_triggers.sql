-- =============================================================
-- ORVAX CORE — Triggers + View (Parte 3.3 e 3.4)
-- Depende de: 20260421_orvax_core_unified.sql (tabelas habits,
--             habit_logs, xp_log, daily_metrics já criadas)
--
-- Adapta os triggers ao schema REAL do app:
--   - tabela: public.tasks  (não "orvax_agenda")
--   - coluna: state = 'done' (não "status = 'concluida'")
--
-- 100% idempotente.
-- =============================================================

-- Colunas de ligação na tabela tasks (vincula tarefa a hábito + pilar)
ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS pillar   TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_habit ON public.tasks(habit_id);

-- =============================================================
-- Função central: registra qualquer evento (XP + daily_metrics)
-- =============================================================
CREATE OR REPLACE FUNCTION public.fn_register_event(
    p_user   UUID,
    p_source TEXT,   -- 'task_done' | 'habit_done' | 'goal_progress'
    p_ref    UUID,
    p_xp     INT,
    p_pillar TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_day DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
    v_pillar TEXT := COALESCE(NULLIF(p_pillar,''), 'disciplina');
BEGIN
    -- 1. Audit trail de XP
    INSERT INTO public.xp_log(user_id, source, source_id, amount)
    VALUES (p_user, p_source, p_ref, p_xp);

    -- 2. Incrementa XP do perfil
    UPDATE public.profiles
       SET xp = COALESCE(xp, 0) + p_xp,
           updated_at = NOW()
     WHERE id = p_user;

    -- 3. Upsert daily_metrics (1 linha por user/dia)
    INSERT INTO public.daily_metrics(
        user_id, day, xp_gained,
        disciplina, consistencia, foco, energia, evolucao,
        tasks_done, habits_done
    ) VALUES (
        p_user, v_day, p_xp,
        CASE WHEN v_pillar = 'disciplina'   THEN 1 ELSE 0 END,
        CASE WHEN v_pillar = 'consistencia' THEN 1 ELSE 0 END,
        CASE WHEN v_pillar = 'foco'         THEN 1 ELSE 0 END,
        CASE WHEN v_pillar = 'energia'      THEN 1 ELSE 0 END,
        CASE WHEN v_pillar = 'evolucao'     THEN 1 ELSE 0 END,
        CASE WHEN p_source = 'task_done'    THEN 1 ELSE 0 END,
        CASE WHEN p_source = 'habit_done'   THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_id, day) DO UPDATE SET
        xp_gained    = public.daily_metrics.xp_gained    + EXCLUDED.xp_gained,
        disciplina   = public.daily_metrics.disciplina   + EXCLUDED.disciplina,
        consistencia = public.daily_metrics.consistencia + EXCLUDED.consistencia,
        foco         = public.daily_metrics.foco         + EXCLUDED.foco,
        energia      = public.daily_metrics.energia      + EXCLUDED.energia,
        evolucao     = public.daily_metrics.evolucao     + EXCLUDED.evolucao,
        tasks_done   = public.daily_metrics.tasks_done   + EXCLUDED.tasks_done,
        habits_done  = public.daily_metrics.habits_done  + EXCLUDED.habits_done;

    -- 4. Marca pilar de Consistência também (presença no dia)
    IF p_source IN ('task_done', 'habit_done') AND v_pillar <> 'consistencia' THEN
        UPDATE public.daily_metrics
           SET consistencia = LEAST(consistencia + 1, 5)
         WHERE user_id = p_user AND day = v_day;
    END IF;
END;
$$;

-- =============================================================
-- Trigger 1: habit_log inserido → cascata
-- =============================================================
CREATE OR REPLACE FUNCTION public.trg_habit_log_ins() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_xp INT;
    v_pillar TEXT;
BEGIN
    SELECT xp_reward, pillar
      INTO v_xp, v_pillar
      FROM public.habits
     WHERE id = NEW.habit_id;

    PERFORM public.fn_register_event(
        NEW.user_id,
        'habit_done',
        NEW.habit_id,
        COALESCE(v_xp, 10),
        COALESCE(v_pillar, 'disciplina')
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t_habit_log_ins ON public.habit_logs;
CREATE TRIGGER t_habit_log_ins
AFTER INSERT ON public.habit_logs
FOR EACH ROW EXECUTE FUNCTION public.trg_habit_log_ins();

-- =============================================================
-- Trigger 2: tasks.state → 'done' → cascata
-- (adaptado ao schema real: tabela tasks + coluna state)
-- =============================================================
CREATE OR REPLACE FUNCTION public.trg_task_done() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.state = 'done' AND (OLD.state IS DISTINCT FROM 'done') THEN
        -- Registra evento task_done (+5 XP, pilar disciplina por default)
        PERFORM public.fn_register_event(
            NEW.user_id,
            'task_done',
            NEW.id,
            5,
            COALESCE(NEW.pillar, 'disciplina')
        );

        -- Incrementa contador no profile (compat com achievements legados)
        UPDATE public.profiles
           SET total_tasks_completed = COALESCE(total_tasks_completed, 0) + 1
         WHERE id = NEW.user_id;

        -- Se a tarefa está vinculada a hábito, cria habit_log
        -- (trigger t_habit_log_ins vai disparar de novo, somando XP do hábito)
        IF NEW.habit_id IS NOT NULL THEN
            INSERT INTO public.habit_logs(user_id, habit_id, quality, note)
            VALUES (NEW.user_id, NEW.habit_id, 3, 'via-task');
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t_task_done ON public.tasks;
CREATE TRIGGER t_task_done
AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.trg_task_done();

-- =============================================================
-- Trigger 3: goals.progress atingiu 100 → bônus
-- =============================================================
CREATE OR REPLACE FUNCTION public.trg_goal_complete() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.progress >= 100 AND COALESCE(OLD.progress, 0) < 100 THEN
        PERFORM public.fn_register_event(
            NEW.user_id,
            'goal_complete',
            NEW.id,
            100,          -- bônus gordo
            'evolucao'
        );
        UPDATE public.goals SET status = 'concluida' WHERE id = NEW.id;
    ELSIF NEW.progress > COALESCE(OLD.progress, 0) THEN
        -- Incremento normal → pequeno XP proporcional
        PERFORM public.fn_register_event(
            NEW.user_id,
            'goal_progress',
            NEW.id,
            GREATEST(1, (NEW.progress - COALESCE(OLD.progress, 0)) / 5),
            'evolucao'
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t_goal_complete ON public.goals;
CREATE TRIGGER t_goal_complete
AFTER UPDATE OF progress ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.trg_goal_complete();

-- =============================================================
-- VIEW: pilares da última semana (cérebro do dashboard)
-- DROP primeiro para evitar erro de mudança de tipo de coluna
-- =============================================================
DROP VIEW IF EXISTS public.v_user_pillars_prev7d;
DROP VIEW IF EXISTS public.v_user_pillars_7d;

CREATE VIEW public.v_user_pillars_7d AS
SELECT
    user_id,
    LEAST(100, ROUND(AVG(disciplina)   * 20))::BIGINT AS disciplina,
    LEAST(100, ROUND(AVG(consistencia) * 20))::BIGINT AS consistencia,
    LEAST(100, ROUND(AVG(foco)         * 20))::BIGINT AS foco,
    LEAST(100, ROUND(AVG(energia)      * 20))::BIGINT AS energia,
    LEAST(100, ROUND(AVG(evolucao)     * 20))::BIGINT AS evolucao,
    SUM(xp_gained)                                    AS xp_7d,
    SUM(tasks_done)                                   AS tasks_7d,
    SUM(habits_done)                                  AS habits_7d
FROM public.daily_metrics
WHERE day >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY user_id;

-- =============================================================
-- VIEW: semana anterior (para delta e tendência real)
-- =============================================================
CREATE VIEW public.v_user_pillars_prev7d AS
SELECT
    user_id,
    LEAST(100, ROUND(AVG(disciplina)   * 20))::BIGINT AS disciplina,
    LEAST(100, ROUND(AVG(consistencia) * 20))::BIGINT AS consistencia,
    LEAST(100, ROUND(AVG(foco)         * 20))::BIGINT AS foco,
    LEAST(100, ROUND(AVG(energia)      * 20))::BIGINT AS energia,
    LEAST(100, ROUND(AVG(evolucao)     * 20))::BIGINT AS evolucao
FROM public.daily_metrics
WHERE day >= CURRENT_DATE - INTERVAL '14 days'
  AND day <  CURRENT_DATE - INTERVAL '7 days'
GROUP BY user_id;

-- =============================================================
-- RPC: get_dashboard (1 chamada → tudo que o dashboard precisa)
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard(p_user UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user UUID := COALESCE(p_user, auth.uid());
    v_curr RECORD;
    v_prev RECORD;
    v_xp   INT;
    v_streak INT := 0;
    v_today RECORD;
BEGIN
    IF v_user IS NULL THEN
        RETURN jsonb_build_object('error', 'no-user');
    END IF;

    SELECT * INTO v_curr FROM public.v_user_pillars_7d WHERE user_id = v_user;
    SELECT * INTO v_prev FROM public.v_user_pillars_prev7d WHERE user_id = v_user;

    SELECT COALESCE(xp, 0) INTO v_xp FROM public.profiles WHERE id = v_user;

    -- Streak: dias consecutivos (indo pra trás) com algum evento
    WITH dias AS (
        SELECT day
          FROM public.daily_metrics
         WHERE user_id = v_user
           AND (tasks_done > 0 OR habits_done > 0)
         ORDER BY day DESC
    ),
    numerados AS (
        SELECT day,
               ROW_NUMBER() OVER (ORDER BY day DESC) AS rn,
               day + (ROW_NUMBER() OVER (ORDER BY day DESC) || ' days')::INTERVAL AS grp
          FROM dias
    )
    SELECT COUNT(*) INTO v_streak FROM numerados WHERE grp = (
        SELECT day + (1 || ' days')::INTERVAL FROM numerados WHERE rn = 1
    );
    -- fallback simples se a janela acima não pegar
    IF v_streak IS NULL THEN v_streak := 0; END IF;

    SELECT * INTO v_today FROM public.daily_metrics
     WHERE user_id = v_user
       AND day = (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

    RETURN jsonb_build_object(
        'pillars', jsonb_build_object(
            'disciplina',   COALESCE(v_curr.disciplina, 0),
            'consistencia', COALESCE(v_curr.consistencia, 0),
            'foco',         COALESCE(v_curr.foco, 0),
            'energia',      COALESCE(v_curr.energia, 0),
            'evolucao',     COALESCE(v_curr.evolucao, 0)
        ),
        'deltas', jsonb_build_object(
            'disciplina',   COALESCE(v_curr.disciplina, 0)   - COALESCE(v_prev.disciplina, 0),
            'consistencia', COALESCE(v_curr.consistencia, 0) - COALESCE(v_prev.consistencia, 0),
            'foco',         COALESCE(v_curr.foco, 0)         - COALESCE(v_prev.foco, 0),
            'energia',      COALESCE(v_curr.energia, 0)      - COALESCE(v_prev.energia, 0),
            'evolucao',     COALESCE(v_curr.evolucao, 0)     - COALESCE(v_prev.evolucao, 0)
        ),
        'xp_total',  v_xp,
        'xp_7d',     COALESCE(v_curr.xp_7d, 0),
        'tasks_7d',  COALESCE(v_curr.tasks_7d, 0),
        'habits_7d', COALESCE(v_curr.habits_7d, 0),
        'streak',    v_streak,
        'today', jsonb_build_object(
            'xp',          COALESCE(v_today.xp_gained, 0),
            'tasks_done',  COALESCE(v_today.tasks_done, 0),
            'habits_done', COALESCE(v_today.habits_done, 0)
        ),
        'has_data', (v_curr.user_id IS NOT NULL)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard(UUID) TO authenticated;

-- =============================================================
-- Realtime publication (permite Supabase realtime nas novas tabelas)
-- =============================================================
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.habits;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_logs;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_metrics;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_log;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
