-- =============================================================
-- ORVAX — Life OS: visão consolidada (Performance Matrix)
-- Devolve em UMA chamada:
--   • lista de aspectos com total, c7, c7_prev, delta%, série 14d
--   • execution map dos últimos 30 dias (heat por dia)
--   • totais (hoje, semana, 30d)
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_life_overview()
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
AS $FN$
DECLARE
  v_uid    UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'aspects', '[]'::jsonb,
      'exec_map', '[]'::jsonb,
      'totals', jsonb_build_object('today',0,'week',0,'month',0)
    );
  END IF;

  PERFORM public.ensure_user_life_aspects(v_uid);

  WITH base AS (
    SELECT DISTINCT ON (la.key)
           la.key, la.label, la.icon, la.color, la.description,
           la.is_active, la.sort_order
      FROM public.life_aspects la
     WHERE la.user_id = v_uid OR la.user_id IS NULL
     ORDER BY la.key,
              (la.user_id = v_uid) DESC NULLS LAST,
              la.sort_order
  ),
  links AS (
    SELECT al.aspect_key, al.created_at
      FROM public.aspect_links al
     WHERE al.user_id = v_uid
       AND al.created_at >= now() - INTERVAL '60 days'
  ),
  counts AS (
    SELECT b.key,
      (SELECT count(*) FROM public.aspect_links a
        WHERE a.user_id = v_uid AND a.aspect_key = b.key) AS total,
      coalesce(sum(CASE WHEN l.created_at >= now() - INTERVAL '7 days' THEN 1 END), 0) AS c7,
      coalesce(sum(CASE WHEN l.created_at >= now() - INTERVAL '14 days'
                         AND l.created_at <  now() - INTERVAL '7 days' THEN 1 END), 0) AS c7_prev,
      coalesce(sum(CASE WHEN l.created_at >= now() - INTERVAL '30 days' THEN 1 END), 0) AS c30
    FROM base b
    LEFT JOIN links l ON l.aspect_key = b.key
    GROUP BY b.key
  ),
  spark_days AS (
    SELECT b.key, dd::date AS d
      FROM base b
      CROSS JOIN generate_series(
        (now() - INTERVAL '13 days')::date,
        now()::date,
        INTERVAL '1 day'
      ) dd
  ),
  spark AS (
    SELECT sd.key,
      jsonb_agg(
        jsonb_build_object('d', sd.d, 'c', coalesce(daily.c, 0))
        ORDER BY sd.d
      ) AS series
    FROM spark_days sd
    LEFT JOIN (
      SELECT aspect_key, created_at::date AS d, count(*) AS c
        FROM links
       WHERE created_at >= now() - INTERVAL '14 days'
       GROUP BY aspect_key, created_at::date
    ) daily ON daily.aspect_key = sd.key AND daily.d = sd.d
    GROUP BY sd.key
  ),
  exec_days AS (
    SELECT dd::date AS d
      FROM generate_series(
        (now() - INTERVAL '29 days')::date,
        now()::date,
        INTERVAL '1 day'
      ) dd
  ),
  exec_map AS (
    SELECT jsonb_agg(
      jsonb_build_object('d', ed.d, 'c', coalesce(daily.c, 0))
      ORDER BY ed.d
    ) AS heat
    FROM exec_days ed
    LEFT JOIN (
      SELECT created_at::date AS d, count(*) AS c
        FROM links
       WHERE created_at >= now() - INTERVAL '30 days'
       GROUP BY created_at::date
    ) daily ON daily.d = ed.d
  )
  SELECT jsonb_build_object(
    'aspects', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'key',         b.key,
          'label',       b.label,
          'icon',        b.icon,
          'color',       b.color,
          'description', b.description,
          'is_active',   b.is_active,
          'sort_order',  b.sort_order,
          'total',       c.total,
          'c7',          c.c7,
          'c7_prev',     c.c7_prev,
          'c30',         c.c30,
          'delta_pct',   CASE
                           WHEN c.c7_prev > 0
                             THEN round(((c.c7 - c.c7_prev)::numeric / c.c7_prev) * 100)::int
                           WHEN c.c7 > 0 THEN 100
                           ELSE NULL
                         END,
          'series',      coalesce(s.series, '[]'::jsonb)
        )
        ORDER BY b.sort_order, b.label
      )
      FROM base b
      JOIN counts c ON c.key = b.key
      LEFT JOIN spark  s ON s.key = b.key
      WHERE b.is_active
    ), '[]'::jsonb),
    'exec_map', coalesce((SELECT heat FROM exec_map), '[]'::jsonb),
    'totals', jsonb_build_object(
      'today', (SELECT count(*) FROM public.aspect_links
                 WHERE user_id = v_uid AND created_at::date = current_date),
      'week',  (SELECT count(*) FROM public.aspect_links
                 WHERE user_id = v_uid AND created_at >= now() - INTERVAL '7 days'),
      'month', (SELECT count(*) FROM public.aspect_links
                 WHERE user_id = v_uid AND created_at >= now() - INTERVAL '30 days')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$FN$;

GRANT EXECUTE ON FUNCTION public.get_life_overview() TO authenticated;
