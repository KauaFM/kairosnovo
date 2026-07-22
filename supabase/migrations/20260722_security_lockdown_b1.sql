-- ============================================================
-- ORVAX — SECURITY LOCKDOWN · Bloco 1 da auditoria pré-Play Store
-- 2026-07-22
--
-- Achados dos advisors (nível ERROR) corrigidos aqui:
--  A) 9 tabelas públicas SEM RLS → qualquer autenticado lia tudo
--  B) 10 policies "Service role full access" com roles={public} e
--     USING(true) → acesso TOTAL cross-user em transactions,
--     conversation_history, media_vault, financial_goals etc.
--     (service_role BYPASSA RLS; essas policies só abriam buraco)
--  C) v_ranking expunha e-mail de todos + JOIN em auth.users
--     (sem nenhum consumidor no app → DROP)
--  D) 3 views SECURITY DEFINER → security_invoker (RLS do caller)
--  E) 36 funções sem search_path fixo → hardening
-- ============================================================

-- ── A) RLS nas 9 tabelas expostas ──────────────────────────────
-- Usadas pelo app → policies de dono/catálogo:
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS achievements_read ON public.achievements;
CREATE POLICY achievements_read ON public.achievements
  FOR SELECT TO authenticated USING (true);          -- catálogo global (read-only)

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_achievements_own ON public.user_achievements;
CREATE POLICY user_achievements_own ON public.user_achievements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conversations_select_own ON public.conversations;
CREATE POLICY conversations_select_own ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);           -- escrita só via mentor-chat (service)

ALTER TABLE public.orvax_agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orvax_agenda_own ON public.orvax_agenda;
CREATE POLICY orvax_agenda_own ON public.orvax_agenda
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.registros_dinamicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS registros_dinamicos_select_own ON public.registros_dinamicos;
CREATE POLICY registros_dinamicos_select_own ON public.registros_dinamicos
  FOR SELECT USING (auth.uid() = user_id);           -- escrito pelo agente n8n (service)

-- Legadas do agente n8n (app não usa) → RLS SEM policies:
-- clientes ficam 100% bloqueados; n8n/service_role segue funcionando.
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orvax_capital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orvax_gamificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orvax_regras_gamificacao ENABLE ROW LEVEL SECURITY;

-- ── B) Dropar as 10 policies always-true de roles públicos ─────
-- (cada tabela mantém suas policies *_own de dono — verificado)
DROP POLICY IF EXISTS "Service role full access actions"            ON public.agent_actions;
DROP POLICY IF EXISTS "Service role full access"                    ON public.conversation_history;
DROP POLICY IF EXISTS "Service role full access financial_goals"    ON public.financial_goals;
DROP POLICY IF EXISTS "Service role full access media_vault"        ON public.media_vault;
DROP POLICY IF EXISTS "Service role full access orvax_habitos"      ON public.orvax_habitos;
DROP POLICY IF EXISTS "Service role full access orvax_workouts"     ON public.orvax_workouts;
DROP POLICY IF EXISTS "Service role full access group_members"      ON public.ranking_group_members;
DROP POLICY IF EXISTS "Service role full access groups"             ON public.ranking_groups;
DROP POLICY IF EXISTS "Service role full access telemetry_metrics"  ON public.telemetry_metrics;
DROP POLICY IF EXISTS "Service role full access transactions"       ON public.transactions;
-- NOTA: ranking_groups_read (SELECT true) foi MANTIDA de propósito —
-- o fluxo de convite precisa achar o grupo pelo código antes de ser membro.

-- ── C) v_ranking: expunha e-mails + auth.users; sem consumidores ──
DROP VIEW IF EXISTS public.v_ranking;

-- ── D) Views restantes → RLS do chamador ───────────────────────
ALTER VIEW public.v_user_pillars_7d       SET (security_invoker = true);
ALTER VIEW public.v_user_pillars_prev7d   SET (security_invoker = true);
ALTER VIEW public.monthly_financial_summary SET (security_invoker = true);

-- ── E) search_path fixo nas funções flagadas pelo linter ───────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'get_personal_bests','get_calorie_range','get_daily_summary',
      'inserir_dado_dinamico','award_xp_on_task_done','immutable_unaccent',
      'pillar_to_aspect','ensure_user_life_aspects','auto_link_aspect',
      'auto_link_finance','auto_link_nutrition','auto_link_body',
      'auto_link_event','recalc_goal_progress','trg_friendships_touch',
      'get_aspect_dashboard','goal_category_to_aspect','auto_link_goal',
      'get_today_pending','recompute_goal_progress','get_user_life_aspects',
      'get_life_overview','veritas_end_focus','veritas_today',
      'veritas_submit_review','veritas_set_tomorrow','veritas_apply_xp',
      'veritas_current_season','add_xp_and_update_streak','protect_xp_column',
      'veritas_bump_trust','veritas_start_focus','veritas_dimension_metrics',
      'veritas_dimension_metrics_for','veritas_season_ranking','veritas_season_info'
    )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- ── F) SECURITY DEFINER fora do alcance do anon ────────────────
-- O grant vinha de PUBLIC (anon herdava). Revoga de PUBLIC/anon e
-- concede explicitamente a authenticated + service_role.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n2 ON n2.oid = p.pronamespace
    WHERE n2.nspname = 'public' AND p.prosecdef
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- ── G) Storage: mata a ENUMERAÇÃO dos buckets públicos ─────────
-- O app nunca usa .list(); leitura via getPublicUrl (CDN) não depende
-- dessas policies em bucket público. (Aplicado junto com esta migration.)
DROP POLICY IF EXISTS avatars_public_read     ON storage.objects;
DROP POLICY IF EXISTS food_photos_public_read ON storage.objects;
DROP POLICY IF EXISTS vault_media_public_read ON storage.objects;

-- ============================================================
-- VERIFICADO em produção (2026-07-22):
--  · atacante autenticado: 0 linhas em transactions/conversation_history/
--    media_vault/registros_dinamicos alheios (havia 5/23/5/21 linhas reais)
--  · storage.objects: listagem = 0
--  · dono continua vendo os próprios dados; RPCs principais OK
--  · advisors: 14 ERROR → 0 ERROR (141 → 69 achados)
--  · funções SECURITY DEFINER executáveis por anon: 29 → 0
-- PENDENTE (manual, dashboard): ligar "Leaked password protection"
-- em Auth → Settings; rotacionar o token do n8n exposto no git.
-- ============================================================
