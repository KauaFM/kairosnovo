-- =============================================================
-- ORVAX — Life OS: fix de volatilidade
-- get_user_life_aspects e get_today_pending precisam escrever
-- (bootstrap de aspectos), portanto devem ser VOLATILE.
-- Tambem adiciona colunas ricas em goals para drill-down detalhado.
-- =============================================================

-- ---- 1) Tornar as RPCs VOLATILE (permite INSERT via PERFORM) ----
DROP FUNCTION IF EXISTS public.get_user_life_aspects();

CREATE OR REPLACE FUNCTION public.get_user_life_aspects()
RETURNS TABLE (
  key          TEXT,
  label        TEXT,
  icon         TEXT,
  color        TEXT,
  description  TEXT,
  is_system    BOOLEAN,
  is_active    BOOLEAN,
  sort_order   INT,
  total_links  INT,
  recent_links INT
)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
AS $FN$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  PERFORM public.ensure_user_life_aspects(v_uid);

  RETURN QUERY
  SELECT la.key, la.label, la.icon, la.color, la.description,
         la.is_system, la.is_active, la.sort_order,
         coalesce(tot.c, 0)::INT,
         coalesce(rec.c, 0)::INT
    FROM public.life_aspects la
    LEFT JOIN (
      SELECT aspect_key, count(*) AS c FROM public.aspect_links
       WHERE user_id = v_uid GROUP BY aspect_key
    ) tot ON tot.aspect_key = la.key
    LEFT JOIN (
      SELECT aspect_key, count(*) AS c FROM public.aspect_links
       WHERE user_id = v_uid AND created_at >= now() - INTERVAL '7 days'
       GROUP BY aspect_key
    ) rec ON rec.aspect_key = la.key
   WHERE la.user_id = v_uid OR la.user_id IS NULL
   ORDER BY la.sort_order, la.label;
END;
$FN$;

GRANT EXECUTE ON FUNCTION public.get_user_life_aspects() TO authenticated;

-- get_today_pending tambem pode chamar ensure_* no futuro; manter VOLATILE
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
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
AS $FN$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT 'task'::TEXT, t.id, t.title::TEXT,
         coalesce(t.category, t.pillar)::TEXT,
         public.pillar_to_aspect(t.pillar),
         NULL::TIMESTAMPTZ, true, (t.state = 'done'),
         jsonb_build_object('pillar', t.pillar, 'state', t.state,
           'category', t.category, 'time_start', t.time_start, 'duration', t.duration)
    FROM public.tasks t
   WHERE t.user_id = v_uid AND t.scheduled_date = p_date;

  RETURN QUERY
  SELECT 'habit'::TEXT, h.id, h.title::TEXT, h.pillar::TEXT,
         public.pillar_to_aspect(h.pillar),
         NULL::TIMESTAMPTZ, true,
         EXISTS (SELECT 1 FROM public.habit_logs hl
                  WHERE hl.habit_id = h.id AND hl.user_id = v_uid
                    AND hl.logged_at::DATE = p_date),
         jsonb_build_object('pillar', h.pillar, 'xp_reward', h.xp_reward)
    FROM public.habits h
   WHERE h.user_id = v_uid AND h.active = true;

  RETURN QUERY
  SELECT CASE e.event_type
           WHEN 'meeting'     THEN 'meeting'
           WHEN 'appointment' THEN 'meeting'
           WHEN 'reminder'    THEN 'reminder'
           WHEN 'payment'     THEN 'payment'
           ELSE 'event' END::TEXT,
         e.id, e.title::TEXT, e.description::TEXT,
         coalesce(e.aspect_key, 'productivity'),
         e.starts_at, e.all_day, (e.status = 'done'),
         jsonb_build_object('location', e.location, 'ends_at', e.ends_at, 'type', e.event_type)
    FROM public.universal_events e
   WHERE e.user_id = v_uid
     AND e.starts_at::DATE = p_date
     AND e.status <> 'canceled';
END;
$FN$;

GRANT EXECUTE ON FUNCTION public.get_today_pending(DATE) TO authenticated;

-- get_aspect_dashboard pode ficar STABLE (nao escreve)
-- ja e STABLE na versao original — nao mexer.

-- ---- 2) Enriquecer GOALS para drill-down real ----
-- Adiciona colunas pra meta virar um dashboard completo
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS goal_type         TEXT,
  ADD COLUMN IF NOT EXISTS target_value      NUMERIC,
  ADD COLUMN IF NOT EXISTS current_value     NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit              TEXT,
  ADD COLUMN IF NOT EXISTS aspect_key        TEXT,
  ADD COLUMN IF NOT EXISTS category          TEXT,
  ADD COLUMN IF NOT EXISTS priority          TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS started_at        DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS metadata          JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ---- 3) Tabela de checkpoints da meta (evolução ao longo do tempo) ----
CREATE TABLE IF NOT EXISTS public.goal_checkpoints (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id    UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  value      NUMERIC NOT NULL,
  note       TEXT,
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gc_goal   ON public.goal_checkpoints (goal_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_gc_user   ON public.goal_checkpoints (user_id, logged_at);

ALTER TABLE public.goal_checkpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gc_rw ON public.goal_checkpoints;
CREATE POLICY gc_rw ON public.goal_checkpoints
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- 4) Trigger: quando checkpoint inserido, atualiza current_value e progress ----
CREATE OR REPLACE FUNCTION public.recompute_goal_progress()
RETURNS TRIGGER LANGUAGE plpgsql AS $FN$
DECLARE v_target NUMERIC; v_current NUMERIC;
BEGIN
  SELECT target_value INTO v_target FROM public.goals WHERE id = NEW.goal_id;
  v_current := NEW.value;
  UPDATE public.goals
     SET current_value = v_current,
         progress = LEAST(100, GREATEST(0,
           CASE WHEN coalesce(v_target,0) > 0
                THEN round((v_current / v_target) * 100)::INT
                ELSE progress END)),
         updated_at = now()
   WHERE id = NEW.goal_id;
  RETURN NEW;
END;
$FN$;

DROP TRIGGER IF EXISTS trg_gc_recompute ON public.goal_checkpoints;
CREATE TRIGGER trg_gc_recompute
  AFTER INSERT ON public.goal_checkpoints
  FOR EACH ROW EXECUTE FUNCTION public.recompute_goal_progress();

-- ---- 5) Auto-link de goals usando aspect_key direto (nova coluna) ----
CREATE OR REPLACE FUNCTION public.auto_link_goal()
RETURNS TRIGGER LANGUAGE plpgsql AS $FN$
DECLARE v_aspect TEXT;
BEGIN
  v_aspect := coalesce(NEW.aspect_key, public.goal_category_to_aspect(NEW.category));
  PERFORM public.ensure_user_life_aspects(NEW.user_id);
  INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
  VALUES (NEW.user_id, v_aspect, 'goals', NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$FN$;
