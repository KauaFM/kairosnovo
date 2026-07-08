-- =============================================================
-- ORVAX — Perfil Público para Ranking
-- Expõe métricas agregadas de qualquer usuário para outros
-- usuários autenticados verem (motivação social).
--
-- RPC get_public_profile(p_user) retorna JSON com:
--   - profile (nome, avatar, xp, rank posição, streak)
--   - pilares 7d (5 dimensões)
--   - stats semanais (tasks_done, habits_done, xp_7d)
--   - últimas 8 atividades com título real (tasks/habits/goals)
--
-- SECURITY DEFINER + grant só para authenticated → outros users
-- NÃO conseguem ler xp_log direto, só via esta função curada.
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_public_profile(p_user UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile JSONB;
    v_pillars JSONB;
    v_stats   JSONB;
    v_rank    INT;
    v_feed    JSONB;
BEGIN
    -- Bloqueia se o usuário requisitante não estiver autenticado
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not-authenticated';
    END IF;

    -- Posição no ranking global (por XP)
    SELECT rn INTO v_rank FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY COALESCE(xp,0) DESC) AS rn
        FROM public.profiles
    ) r WHERE r.id = p_user;

    -- Profile base
    SELECT jsonb_build_object(
        'id',           p.id,
        'full_name',    p.full_name,
        'avatar_url',   p.avatar_url,
        'xp',           COALESCE(p.xp, 0),
        'streak_days',  COALESCE(p.streak_days, 0),
        'total_tasks',  COALESCE(p.total_tasks_completed, 0),
        'rank_position', v_rank,
        'created_at',   p.created_at
    ) INTO v_profile
    FROM public.profiles p
    WHERE p.id = p_user;

    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('error', 'not-found');
    END IF;

    -- Pilares últimos 7 dias
    SELECT jsonb_build_object(
        'disciplina',   COALESCE(disciplina, 0),
        'consistencia', COALESCE(consistencia, 0),
        'foco',         COALESCE(foco, 0),
        'energia',      COALESCE(energia, 0),
        'evolucao',     COALESCE(evolucao, 0),
        'xp_7d',        COALESCE(xp_7d, 0),
        'tasks_7d',     COALESCE(tasks_7d, 0),
        'habits_7d',    COALESCE(habits_7d, 0)
    ) INTO v_pillars
    FROM public.v_user_pillars_7d
    WHERE user_id = p_user;

    -- Fallback se não houver linha na view
    IF v_pillars IS NULL THEN
        v_pillars := jsonb_build_object(
            'disciplina', 0, 'consistencia', 0, 'foco', 0,
            'energia', 0, 'evolucao', 0,
            'xp_7d', 0, 'tasks_7d', 0, 'habits_7d', 0
        );
    END IF;

    -- Stats de hoje (linha atual em daily_metrics)
    SELECT jsonb_build_object(
        'today_xp',     COALESCE(xp_gained, 0),
        'today_tasks',  COALESCE(tasks_done, 0),
        'today_habits', COALESCE(habits_done, 0)
    ) INTO v_stats
    FROM public.daily_metrics
    WHERE user_id = p_user
      AND day = (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

    IF v_stats IS NULL THEN
        v_stats := jsonb_build_object('today_xp', 0, 'today_tasks', 0, 'today_habits', 0);
    END IF;

    -- Últimas 8 atividades — título resolvido em tasks/habits/goals
    SELECT COALESCE(jsonb_agg(item ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_feed
    FROM (
        SELECT
            jsonb_build_object(
                'id',       xl.id,
                'source',   xl.source,
                'amount',   xl.amount,
                'created_at', xl.created_at,
                'title', COALESCE(
                    (SELECT title FROM public.tasks  WHERE id = xl.source_id),
                    (SELECT title FROM public.habits WHERE id = xl.source_id),
                    (SELECT title FROM public.goals  WHERE id = xl.source_id),
                    'Atividade ORVAX'
                )
            ) AS item,
            xl.created_at
        FROM public.xp_log xl
        WHERE xl.user_id = p_user
        ORDER BY xl.created_at DESC
        LIMIT 8
    ) sub;

    -- Merge final
    RETURN v_profile
        || jsonb_build_object('pillars', v_pillars)
        || jsonb_build_object('stats', v_stats)
        || jsonb_build_object('recent', v_feed);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(UUID) TO authenticated;
