-- =============================================================
-- ORVAX — Life OS: dedupe de aspectos
-- get_user_life_aspects estava devolvendo 2 linhas por chave
-- (a do sistema com user_id IS NULL e a do usuário criada pelo
-- ensure_user_life_aspects). Usa DISTINCT ON pra preferir a do
-- usuário, evitando keys duplicadas no React.
-- =============================================================

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
  WITH base AS (
    SELECT DISTINCT ON (la.key)
           la.key, la.label, la.icon, la.color, la.description,
           la.is_system, la.is_active, la.sort_order, la.user_id
      FROM public.life_aspects la
     WHERE la.user_id = v_uid OR la.user_id IS NULL
     ORDER BY la.key,
              -- prefere row do usuário; depois a do sistema
              (la.user_id = v_uid) DESC NULLS LAST,
              la.sort_order
  )
  SELECT b.key, b.label, b.icon, b.color, b.description,
         b.is_system, b.is_active, b.sort_order,
         coalesce(tot.c, 0)::INT,
         coalesce(rec.c, 0)::INT
    FROM base b
    LEFT JOIN (
      SELECT aspect_key, count(*) AS c FROM public.aspect_links
       WHERE user_id = v_uid GROUP BY aspect_key
    ) tot ON tot.aspect_key = b.key
    LEFT JOIN (
      SELECT aspect_key, count(*) AS c FROM public.aspect_links
       WHERE user_id = v_uid AND created_at >= now() - INTERVAL '7 days'
       GROUP BY aspect_key
    ) rec ON rec.aspect_key = b.key
   ORDER BY b.sort_order, b.label;
END;
$FN$;

GRANT EXECUTE ON FUNCTION public.get_user_life_aspects() TO authenticated;
