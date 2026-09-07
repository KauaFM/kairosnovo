-- =============================================================
-- ORVAX — Arena: destrava a leitura do perfil de quem divide
--                 um desafio com você
--
-- DIAGNÓSTICO
--
-- A Arena estava funcionando pela metade: dava para entrar na sala,
-- mas membros, ranking, feed e chat vinham vazios ou sem nome.
--
-- A causa não está em nenhuma tabela da Arena — todas existem e
-- todas as políticas delas estão corretas e permissivas o bastante
-- (challenge_members e workout_comments são USING(true); workouts e
-- messages liberam para quem é membro do desafio).
--
-- O bloqueio é o `profiles`:
--
--   CREATE POLICY "profiles_select" ON public.profiles
--     FOR SELECT USING (auth.uid() = id);
--
-- Você só lê o SEU perfil. E a Arena inteira é social: todas as
-- telas fazem join com profiles para mostrar nome e foto dos
-- outros. Com essa política, esse join volta nulo — o membro
-- aparece sem nome, o ranking sem quem, o feed como "Anon".
--
-- Vale registrar como isso aconteceu: a Arena é de março
-- (20260325_gymrats_module.sql) e o travamento de profiles é de
-- abril (20260413_launch_audit_fixes.sql). Um endurecimento de
-- segurança quebrou um recurso social existente, em silêncio,
-- porque nada testava os dois juntos.
--
-- A CORREÇÃO
--
-- Uma política ADICIONAL — não removo nenhuma. Políticas de RLS
-- permissivas se somam (OR), então a regra "só o meu perfil"
-- continua valendo e esta acrescenta "e o de quem divide um desafio
-- comigo". Não dropar nada é deliberado: dropar para recriar abre
-- uma janela onde a proteção não existe, e um erro de digitação no
-- meio deixaria a tabela aberta.
--
-- ⚠️ O QUE ISSO EXPÕE — leia antes de rodar
--
-- RLS controla LINHAS, não colunas. Então quem divide um desafio
-- com você passa a poder ler a sua linha inteira em profiles, o que
-- inclui o que houver de sensível ali (e-mail, plano, papel).
-- O app só pede username e avatar_url, mas alguém que monte uma
-- chamada de API à mão consegue o resto.
--
-- Se isso não for aceitável, o caminho mais fechado é expor uma
-- VIEW só com id/username/avatar_url e reescrever as consultas da
-- Arena para ela — some a exposição, mas perde-se o embed
-- automático do PostgREST e é bem mais trabalho. Ficou como opção
-- consciente, não como esquecimento.
-- =============================================================

BEGIN;

DROP POLICY IF EXISTS profiles_select_colegas_de_desafio ON public.profiles;

CREATE POLICY profiles_select_colegas_de_desafio ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.challenge_members meu
            JOIN public.challenge_members outro
                 ON outro.challenge_id = meu.challenge_id
            WHERE meu.user_id = auth.uid()
              AND outro.user_id = public.profiles.id
        )
    );

COMMIT;

-- ─── CONFERÊNCIA ──────────────────────────────────────────────
-- Esperado: a política antiga (só o próprio perfil) CONTINUA na
-- lista, e a nova aparece junto. Se a antiga tiver sumido, algo
-- deu errado — ela é a proteção base.
SELECT policyname, cmd, permissive, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
ORDER BY policyname;

-- =============================================================
-- PARA DESFAZER (a Arena volta a ficar sem nomes):
--
--   DROP POLICY IF EXISTS profiles_select_colegas_de_desafio
--     ON public.profiles;
-- =============================================================
