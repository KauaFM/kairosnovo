-- =============================================================
-- ORVAX — FitCal ↔ Core Integration
-- Ponte entre FitCal e o resto do sistema ORVAX:
--   1. Cada food_log concede XP no profiles.xp
--   2. Primeira refeição do dia dá bônus XP
--   3. Torre score ≥ 85 do dia anterior concede bônus "dia disciplinado"
--   4. View consolidada pro Dashboard (Nexus)
-- =============================================================

-- ─── 1. XP por food_log ──────────────────────────────────────
-- Regras:
--   +2 XP por entry
--   +10 XP na primeira entry do dia (meal_type=breakfast conta)
--   +25 XP bônus se dia anterior teve torre_score ≥ 85 (reforço de streak nutricional)
CREATE OR REPLACE FUNCTION public.trg_fitcal_grant_xp()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_today INTEGER;
    v_bonus INTEGER := 0;
    v_xp INTEGER := 2;
    v_prev_torre INTEGER;
BEGIN
    -- Conta quantas entries o user já tem hoje (antes desta)
    SELECT COUNT(*) INTO v_total_today
      FROM food_logs
     WHERE user_id = NEW.user_id AND log_date = NEW.log_date AND id <> NEW.id;

    IF v_total_today = 0 THEN v_bonus := v_bonus + 10; END IF;

    -- Bônus de continuidade: dia anterior com torre ≥ 85
    SELECT torre_score INTO v_prev_torre
      FROM fitcal_daily_metrics
     WHERE user_id = NEW.user_id AND log_date = NEW.log_date - 1;
    IF v_prev_torre IS NOT NULL AND v_prev_torre >= 85 AND v_total_today = 0 THEN
        v_bonus := v_bonus + 25;
    END IF;

    v_xp := v_xp + v_bonus;

    -- Incrementa XP no profile (usa colunas existentes)
    UPDATE profiles
       SET xp = COALESCE(xp, 0) + v_xp,
           updated_at = NOW()
     WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_food_logs_xp ON public.food_logs;
CREATE TRIGGER trg_food_logs_xp
    AFTER INSERT ON public.food_logs
    FOR EACH ROW EXECUTE FUNCTION public.trg_fitcal_grant_xp();

-- ─── 2. View consolidada para Dashboard (Nexus) ──────────────
CREATE OR REPLACE VIEW public.v_fitcal_dashboard AS
SELECT
    m.user_id,
    m.log_date,
    m.total_calories,
    m.goal_calories,
    m.torre_score,
    m.execution_level,
    m.entries_count,
    m.water_ml,
    m.goal_water_ml,
    CASE
        WHEN m.goal_calories > 0 THEN ROUND((m.total_calories / m.goal_calories * 100)::NUMERIC, 0)
        ELSE 0
    END AS calorie_progress_pct,
    CASE
        WHEN m.goal_water_ml > 0 THEN ROUND((m.water_ml::NUMERIC / m.goal_water_ml * 100)::NUMERIC, 0)
        ELSE 0
    END AS water_progress_pct
FROM public.fitcal_daily_metrics m;

GRANT SELECT ON public.v_fitcal_dashboard TO authenticated;
ALTER VIEW public.v_fitcal_dashboard SET (security_invoker = true);

-- ─── 3. RPC: snapshot do dia para dashboard ──────────────────
CREATE OR REPLACE FUNCTION public.get_fitcal_dashboard_snapshot()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'today', COALESCE((
            SELECT to_jsonb(v) FROM v_fitcal_dashboard v
             WHERE v.user_id = auth.uid()
               AND v.log_date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE
        ), '{}'::jsonb),
        'streak_days', COALESCE((
            WITH days AS (
                SELECT log_date, torre_score
                  FROM fitcal_daily_metrics
                 WHERE user_id = auth.uid()
                   AND log_date <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE
                 ORDER BY log_date DESC
                 LIMIT 30
            ),
            streak AS (
                SELECT log_date,
                       torre_score,
                       ((NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - log_date)::INTEGER AS gap
                  FROM days
                 WHERE torre_score >= 40
            )
            SELECT COUNT(*) FROM streak WHERE gap = (SELECT ROW_NUMBER() OVER (ORDER BY log_date DESC) - 1 FROM streak)
        ), 0),
        'avg_torre_7d', COALESCE((
            SELECT ROUND(AVG(torre_score)::NUMERIC, 0)
              FROM fitcal_daily_metrics
             WHERE user_id = auth.uid()
               AND log_date >= (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - 7
        ), 0)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_fitcal_dashboard_snapshot() TO authenticated;
