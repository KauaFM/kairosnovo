-- ============================================================
-- ORVAX — PROTOCOLO VERITAS · F6 (Temporadas)
-- 2026-07-22 · docs/GDD_SISTEMA_EVOLUCAO.md §7.3 e §10.1
--
-- Duas moedas (GDD): XP VITALÍCIO (profiles.xp — rank, nunca some)
-- e XP SAZONAL (profiles.season_xp — Arena, zera a cada trimestre).
-- Fresh start effect institucionalizado: competição recomeça justa.
--
-- Reset LAZY (sem cron): todo XP passa por veritas_apply_xp; se a
-- temporada do perfil mudou, season_xp recomeça daquele evento.
-- Ranking sazonal tem GATE DE TRUST (score >= 30) — fraudador some
-- da competição sem acusação frontal (GDD §7: escada de resposta).
-- Temporada 1 = trimestre atual (Q3/2026); ids seguem o calendário.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.seasons (
    id     SMALLINT PRIMARY KEY,
    name   TEXT NOT NULL,
    starts DATE NOT NULL,
    ends   DATE NOT NULL
);
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS seasons_read ON public.seasons;
CREATE POLICY seasons_read ON public.seasons FOR SELECT TO authenticated USING (true);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS season_xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS season_id SMALLINT;

-- ▸ Temporada corrente (trimestre SP) — cria a linha sob demanda
CREATE OR REPLACE FUNCTION public.veritas_current_season()
RETURNS public.seasons LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    d   date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
    sid smallint;
    s   public.seasons;
BEGIN
    -- Temporada 1 = Q3/2026 (lançamento do VERITAS); segue o calendário
    sid := (extract(year from d)::int - 2026) * 4 + extract(quarter from d)::int - 2;
    IF sid < 1 THEN sid := 1; END IF;
    INSERT INTO public.seasons (id, name, starts, ends)
    VALUES (sid, 'Temporada ' || sid,
            date_trunc('quarter', d)::date,
            (date_trunc('quarter', d) + interval '3 months' - interval '1 day')::date)
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO s FROM public.seasons WHERE id = sid;
    RETURN s;
END; $$;

-- ▸ veritas_apply_xp v2 — moeda dupla + reset lazy da temporada
CREATE OR REPLACE FUNCTION public.veritas_apply_xp(p_user_id uuid, p_xp integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_new_xp INT; v_season_xp INT;
    s public.seasons;
BEGIN
    s := public.veritas_current_season();
    UPDATE public.profiles
       SET xp = COALESCE(xp, 0) + GREATEST(p_xp, 0),
           season_xp = CASE WHEN season_id IS DISTINCT FROM s.id
                            THEN GREATEST(p_xp, 0)                          -- temporada virou: recomeça
                            ELSE COALESCE(season_xp, 0) + GREATEST(p_xp, 0) END,
           season_id = s.id,
           last_xp_date = (now() AT TIME ZONE 'America/Sao_Paulo')::date,
           updated_at = now()
     WHERE id = p_user_id
     RETURNING xp, season_xp INTO v_new_xp, v_season_xp;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'profile not found');
    END IF;
    RETURN jsonb_build_object('new_xp', v_new_xp, 'season_xp', v_season_xp, 'season', s.id);
END; $$;

-- ▸ Ranking sazonal (gate de Trust >= 30 — GDD §7)
-- VOLATILE (não STABLE): chama veritas_current_season(), que INSERE a
-- temporada sob demanda — PostgREST roda STABLE em transação read-only.
CREATE OR REPLACE FUNCTION public.veritas_season_ranking(p_limit int DEFAULT 20)
RETURNS TABLE (user_id uuid, full_name text, avatar_url text, season_xp int, pos bigint)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE s public.seasons;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
    s := public.veritas_current_season();
    RETURN QUERY
    SELECT p.id, p.full_name, p.avatar_url, COALESCE(p.season_xp, 0),
           row_number() OVER (ORDER BY p.season_xp DESC)
      FROM public.profiles p
      LEFT JOIN public.trust_scores t ON t.user_id = p.id
     WHERE p.season_id = s.id AND COALESCE(p.season_xp, 0) > 0
       AND COALESCE(t.score, 50) >= 30
     ORDER BY p.season_xp DESC
     LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
END; $$;

-- ▸ Resumo da temporada pro Dossiê (meu XP sazonal + posição + dias restantes)
-- VOLATILE pelo mesmo motivo acima.
CREATE OR REPLACE FUNCTION public.veritas_season_info()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_uid uuid; s public.seasons;
    my_xp int; my_pos bigint;
    d date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
    s := public.veritas_current_season();
    SELECT CASE WHEN season_id = s.id THEN COALESCE(season_xp, 0) ELSE 0 END
      INTO my_xp FROM public.profiles WHERE id = v_uid;
    my_xp := COALESCE(my_xp, 0);
    SELECT count(*) + 1 INTO my_pos
      FROM public.profiles p
      LEFT JOIN public.trust_scores t ON t.user_id = p.id
     WHERE p.season_id = s.id AND COALESCE(p.season_xp, 0) > my_xp
       AND COALESCE(t.score, 50) >= 30;
    RETURN jsonb_build_object(
        'season_id', s.id, 'name', s.name,
        'starts', s.starts, 'ends', s.ends,
        'days_left', GREATEST(0, s.ends - d),
        'season_xp', my_xp,
        'position', CASE WHEN my_xp > 0 THEN my_pos ELSE NULL END);
END; $$;

REVOKE EXECUTE ON FUNCTION public.veritas_current_season() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.veritas_current_season() FROM anon;
GRANT  EXECUTE ON FUNCTION public.veritas_current_season() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.veritas_season_ranking(int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.veritas_season_ranking(int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.veritas_season_ranking(int) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.veritas_season_info() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.veritas_season_info() FROM anon;
GRANT  EXECUTE ON FUNCTION public.veritas_season_info() TO authenticated;
