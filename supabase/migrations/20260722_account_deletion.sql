-- ============================================================
-- ORVAX — Exclusão de conta (Play policy: User Data / Account deletion)
-- 2026-07-22 · Bloco 5 da auditoria pré-Play Store
--
-- profiles NÃO tem FK para auth.users → deletar o usuário do Auth
-- não limpa nada. E várias tabelas referenciam profiles com NO ACTION
-- (bloqueiam a exclusão). Esta RPC (service-role only, chamada pela
-- Edge Function delete-account):
--   1. anula a autoria de conteúdo COMPARTILHADO (foods/recipes/teams/
--      community_groups) — o conteúdo público sobrevive, órfão
--   2. apaga dados PESSOAIS legados (orvax_* do antigo agente)
--   3. deleta a linha de profiles → CASCATA apaga ~40 tabelas de dados
-- Depois a Edge Function remove o usuário do Auth + arquivos do Storage.
-- ============================================================

CREATE OR REPLACE FUNCTION public.veritas_purge_user_data(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    -- 1) conteúdo compartilhado: preserva, desautora (colunas nuláveis)
    UPDATE public.foods            SET created_by = NULL WHERE created_by = p_user;
    UPDATE public.recipes          SET created_by = NULL WHERE created_by = p_user;
    UPDATE public.teams            SET created_by = NULL WHERE created_by = p_user;
    UPDATE public.community_groups SET owner_id   = NULL WHERE owner_id   = p_user;

    -- 2) dados pessoais legados (NO ACTION → precisam sair antes)
    DELETE FROM public.orvax_agenda      WHERE user_id = p_user;
    DELETE FROM public.orvax_capital     WHERE user_id = p_user;
    DELETE FROM public.orvax_gamificacao WHERE user_id = p_user;
    DELETE FROM public.orvax_habitos     WHERE user_id = p_user;

    -- 3) o resto cai por CASCADE ao remover a linha de profiles
    DELETE FROM public.profiles WHERE id = p_user;
END; $$;

REVOKE EXECUTE ON FUNCTION public.veritas_purge_user_data(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.veritas_purge_user_data(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.veritas_purge_user_data(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.veritas_purge_user_data(uuid) TO service_role;
