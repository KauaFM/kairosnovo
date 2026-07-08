-- =============================================================
-- ORVAX — Life OS FIX
-- Ajusta get_today_pending pras colunas reais de tasks/habits.
-- tasks:  (id, user_id, title, category, pillar, state,
--          scheduled_date, time_start, duration, habit_id, ...)
-- habits: (id, user_id, title, pillar, xp_reward, active, ...)
-- =============================================================

DROP FUNCTION IF EXISTS public.get_today_pending(DATE);

CREATE OR REPLACE FUNCTION public.get_today_pending(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  kind         TEXT,
  source_id    UUID,
  title        TEXT,
  subtitle     TEXT,
  aspect_key   TEXT,
  starts_at    TIMESTAMPTZ,
  all_day      BOOLEAN,
  done         BOOLEAN,
  extra        JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $FN$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  -- Tasks agendadas pra data
  RETURN QUERY
  SELECT 'task'::TEXT,
         t.id,
         t.title::TEXT,
         coalesce(t.category, t.pillar)::TEXT,
         public.pillar_to_aspect(t.pillar),
         NULL::TIMESTAMPTZ,
         true,
         (t.state = 'done'),
         jsonb_build_object(
           'pillar',    t.pillar,
           'state',     t.state,
           'category',  t.category,
           'time_start',t.time_start,
           'duration',  t.duration
         )
    FROM public.tasks t
   WHERE t.user_id = v_uid
     AND t.scheduled_date = p_date;

  -- Habitos ativos
  RETURN QUERY
  SELECT 'habit'::TEXT,
         h.id,
         h.title::TEXT,
         h.pillar::TEXT,
         public.pillar_to_aspect(h.pillar),
         NULL::TIMESTAMPTZ,
         true,
         EXISTS (SELECT 1 FROM public.habit_logs hl
                  WHERE hl.habit_id = h.id AND hl.user_id = v_uid
                    AND hl.logged_at::DATE = p_date),
         jsonb_build_object('pillar', h.pillar, 'xp_reward', h.xp_reward)
    FROM public.habits h
   WHERE h.user_id = v_uid AND h.active = true;

  -- Eventos universais (esse tem description)
  RETURN QUERY
  SELECT CASE e.event_type
           WHEN 'meeting'     THEN 'meeting'
           WHEN 'appointment' THEN 'meeting'
           WHEN 'reminder'    THEN 'reminder'
           WHEN 'payment'     THEN 'payment'
           ELSE 'event' END::TEXT,
         e.id,
         e.title::TEXT,
         e.description::TEXT,
         coalesce(e.aspect_key, 'productivity'),
         e.starts_at,
         e.all_day,
         (e.status = 'done'),
         jsonb_build_object('location', e.location, 'ends_at', e.ends_at, 'type', e.event_type)
    FROM public.universal_events e
   WHERE e.user_id = v_uid
     AND e.starts_at::DATE = p_date
     AND e.status <> 'canceled';
END;
$FN$;

GRANT EXECUTE ON FUNCTION public.get_today_pending(DATE) TO authenticated;
