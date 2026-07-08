-- =============================================================
-- ORVAX — Life OS: auto-link de GOALS em aspectos
-- Mapeia goals.category (biofisico, cognitivo, social, ...)
-- para life_aspects.key (health/body, studies, relationships,...)
-- =============================================================

CREATE OR REPLACE FUNCTION public.goal_category_to_aspect(p_cat TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $FN$
  SELECT CASE lower(coalesce(p_cat,''))
    WHEN 'biofisico'    THEN 'body'
    WHEN 'cognitivo'    THEN 'studies'
    WHEN 'social'       THEN 'relationships'
    WHEN 'digital'      THEN 'productivity'
    WHEN 'emocional'    THEN 'mental'
    WHEN 'crescimento'  THEN 'studies'
    WHEN 'profissional' THEN 'career'
    WHEN 'espiritual'   THEN 'spiritual'
    WHEN 'financas'     THEN 'finance'
    WHEN 'saude'        THEN 'health'
    WHEN 'corpo'        THEN 'body'
    WHEN 'nutricao'     THEN 'nutrition'
    WHEN 'carreira'     THEN 'career'
    WHEN 'estudos'      THEN 'studies'
    WHEN 'mental'       THEN 'mental'
    WHEN 'hobby'        THEN 'hobbies'
    WHEN 'casa'         THEN 'home'
    ELSE 'productivity'
  END
$FN$;

CREATE OR REPLACE FUNCTION public.auto_link_goal()
RETURNS TRIGGER LANGUAGE plpgsql AS $FN$
DECLARE v_aspect TEXT;
BEGIN
  v_aspect := public.goal_category_to_aspect(NEW.category);
  PERFORM public.ensure_user_life_aspects(NEW.user_id);
  INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
  VALUES (NEW.user_id, v_aspect, 'goals', NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$FN$;

DROP TRIGGER IF EXISTS trg_goals_aspect ON public.goals;
CREATE TRIGGER trg_goals_aspect
  AFTER INSERT ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_goal();

-- Backfill das metas existentes
INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
SELECT g.user_id, public.goal_category_to_aspect(g.category), 'goals', g.id
  FROM public.goals g
 WHERE g.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- habit_logs, focus_sessions, activity_logs, transactions — garantir que
-- o link da entidade-pai (habit) herde via habit_logs (opcional; hoje ja
-- cobrimos pelas inserts em habits/food_logs/weight_logs). Ficar só de
-- goals por enquanto para nao duplicar linhas.
