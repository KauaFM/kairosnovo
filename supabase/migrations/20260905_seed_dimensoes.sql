-- =============================================================
-- ORVAX — Popular TODAS as dimensões do Terminal Compass
--
-- As dimensões não têm tabela própria: elas são calculadas a partir
-- de HÁBITOS (coluna `pillar`) + os `habit_logs` deles. O mapa está
-- em src/features/metrics/compass/pillarMapping.ts. Então "adicionar
-- dados nas dimensões" é, na prática, criar um hábito para cada
-- pilar e um histórico de execução para eles.
--
-- ⚠️ LEIA ANTES DE RODAR
--
-- 1. Alvo: a conta de DEMONSTRAÇÃO (esteticabrasilia712@gmail.com),
--    não a sua. Seu histórico real fica intocado.
--
-- 2. É histórico inventado, e é esse o objetivo: a conta de
--    demonstração existe para mostrar o produto cheio.
--
-- 3. XP: gatilhos sobre habit_logs podem elevar o XP da conta de
--    demonstração — o que aqui é desejável, não efeito colateral.
--
-- 4. TUDO É REVERSÍVEL. Todo hábito criado aqui leva a marca
--    "[seed]" na coluna `cue`, e o rodapé traz o comando que apaga
--    exatamente esses e mais nada.
-- =============================================================

-- ─── QUEM ─────────────────────────────────────────────────────
-- O e-mail aparece em 4 lugares (2 no seed, 1 na conferência, 2 no
-- rodapé de remoção). Para popular outra conta, troque em todos.

BEGIN;

WITH alvo AS (
    SELECT id AS user_id FROM auth.users WHERE email = 'esteticabrasilia712@gmail.com'
),
-- Um hábito por pilar. Os `pillar` abaixo são exatamente as chaves
-- que o HABIT_PILLAR_TO_COMPASS reconhece — errar a chave faria o
-- hábito existir sem alimentar dimensão nenhuma.
novos(titulo, pilar, dificuldade) AS (
    VALUES
        ('Leitura focada',        'foco',           12),
        ('Treino de força',       'energia',        15),
        ('Refeição planejada',    'nutricao',       10),
        ('Revisar as contas',     'financas',       12),
        ('Bloco de trabalho',     'profissao',      15),
        ('Contato com alguém',    'relacionamento', 10),
        ('Journaling',            'mental',         10),
        ('Arrumar o espaço',      'disciplina',      8),
        ('Estudo dirigido',       'estudos',        15),
        ('Tempo livre sem tela',  'hobby',          10),
        ('Meditação',             'espiritual',     10),
        ('Caminhada',             'corpo',          10)
)
INSERT INTO public.habits (user_id, title, cue, frequency, target_count, pillar, xp_reward, active)
SELECT a.user_id, n.titulo, '[seed] dados de visualização', 'daily', 1, n.pilar, n.dificuldade, true
FROM alvo a CROSS JOIN novos n
-- Não duplica se já rodou antes.
WHERE NOT EXISTS (
    SELECT 1 FROM public.habits h
    WHERE h.user_id = a.user_id AND h.title = n.titulo AND h.cue LIKE '[seed]%'
);

-- ─── HISTÓRICO ────────────────────────────────────────────────
-- 90 dias. A frequência varia por hábito e a escolha do dia usa um
-- hash do (dia + id do hábito): o padrão fica irregular como o de
-- uma pessoa real, e não um bloco cheio que denuncia dado falso.
-- Sendo determinístico, rodar duas vezes gera os MESMOS dias — e o
-- NOT EXISTS abaixo impede duplicata.
WITH alvo AS (
    SELECT id AS user_id FROM auth.users WHERE email = 'esteticabrasilia712@gmail.com'
),
habitos AS (
    SELECT h.id, h.user_id, h.pillar
    FROM public.habits h JOIN alvo a ON a.user_id = h.user_id
    WHERE h.cue LIKE '[seed]%'
),
dias AS (
    SELECT generate_series(0, 89) AS d
),
candidatos AS (
    SELECT
        h.user_id,
        h.id AS habit_id,
        (CURRENT_DATE - dias.d)::timestamptz
            + INTERVAL '8 hour'
            + (('x' || substr(md5(h.id::text || dias.d::text), 1, 4))::bit(16)::int % 600) * INTERVAL '1 minute'
            AS quando,
        -- 0..99 a partir do hash: decide se o dia teve execução
        (('x' || substr(md5(h.id::text || dias.d::text || 'k'), 1, 4))::bit(16)::int % 100) AS sorte
    FROM habitos h CROSS JOIN dias
)
INSERT INTO public.habit_logs (user_id, habit_id, logged_at, quality)
SELECT c.user_id, c.habit_id, c.quando, 3 + (c.sorte % 3)
FROM candidatos c
-- ~62% dos dias: constância boa, mas com falhas visíveis.
WHERE c.sorte < 62
  AND NOT EXISTS (
      SELECT 1 FROM public.habit_logs l
      WHERE l.habit_id = c.habit_id
        AND l.logged_at::date = c.quando::date
  );

COMMIT;

-- ─── CONFERÊNCIA ──────────────────────────────────────────────
SELECT h.pillar,
       h.title,
       COUNT(l.id) AS registros_90d
FROM public.habits h
LEFT JOIN public.habit_logs l ON l.habit_id = h.id
WHERE h.user_id = (SELECT id FROM auth.users WHERE email = 'esteticabrasilia712@gmail.com')
  AND h.cue LIKE '[seed]%'
GROUP BY h.pillar, h.title
ORDER BY h.pillar;

-- =============================================================
-- PARA DESFAZER — apaga só o que este script criou:
--
--   DELETE FROM public.habit_logs
--   WHERE habit_id IN (
--       SELECT id FROM public.habits
--       WHERE cue LIKE '[seed]%'
--         AND user_id = (SELECT id FROM auth.users
--                        WHERE email = 'esteticabrasilia712@gmail.com')
--   );
--
--   DELETE FROM public.habits
--   WHERE cue LIKE '[seed]%'
--     AND user_id = (SELECT id FROM auth.users
--                    WHERE email = 'esteticabrasilia712@gmail.com');
--
-- (o XP eventualmente concedido pelos gatilhos NÃO volta sozinho)
-- =============================================================
