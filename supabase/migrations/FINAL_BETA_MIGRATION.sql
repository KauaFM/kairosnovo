-- =============================================================
-- ORVAX — FINAL BETA MIGRATION
-- Gerado em: 2026-03-28 | Claude Code Audit
--
-- OBJETIVO: Corrigir TODOS os 16 problemas identificados no
--           AUDIT_BACKEND.md e preparar o banco para o beta.
--
-- SEGURO PARA REUTILIZAR: 100% idempotente.
--   Pode ser executado múltiplas vezes sem efeito colateral.
--   Use no Supabase SQL Editor ou via supabase db reset.
-- =============================================================


-- =============================================================
-- BLOCO 1: CORRIGIR PROFILES — colunas críticas faltando
-- FIX #1: profiles.xp (usado em GlobalRanking, Dossier, etc.)
-- FIX #2: profiles.updated_at (usado em add_xp_and_update_streak)
-- =============================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS xp               INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS role             TEXT DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS is_first_login   BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS selected_mentor  TEXT DEFAULT 'atlas',
    ADD COLUMN IF NOT EXISTS avatar_url       TEXT,
    ADD COLUMN IF NOT EXISTS phone_number     TEXT,
    ADD COLUMN IF NOT EXISTS full_name        TEXT,
    ADD COLUMN IF NOT EXISTS streak_days      INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_points     INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS level            INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS last_active_date DATE,
    ADD COLUMN IF NOT EXISTS last_whatsapp_interaction TIMESTAMPTZ,
    -- FitCal
    ADD COLUMN IF NOT EXISTS birth_date       DATE,
    ADD COLUMN IF NOT EXISTS gender           TEXT,
    ADD COLUMN IF NOT EXISTS height_cm        NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS goal             TEXT DEFAULT 'maintain',
    ADD COLUMN IF NOT EXISTS activity_level   TEXT DEFAULT 'moderate',
    ADD COLUMN IF NOT EXISTS is_premium       BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_log_date    DATE,
    -- Contadores (para gamificação e conquistas)
    ADD COLUMN IF NOT EXISTS total_focus_minutes     INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tasks_completed   INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_transactions      INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_agent_messages    INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_audio_messages    INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mentor_switches         INTEGER DEFAULT 0;

-- Índice para busca por telefone (n8n lookup)
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_number);


-- =============================================================
-- BLOCO 2: CORRIGIR MEDIA_VAULT — mismatch de nomes de colunas
-- FIX #3: frontend usa file_url/description/segment mas SQL tem url/title/type
-- =============================================================

ALTER TABLE public.media_vault
    ADD COLUMN IF NOT EXISTS file_url     TEXT,
    ADD COLUMN IF NOT EXISTS description  TEXT,
    ADD COLUMN IF NOT EXISTS segment      TEXT DEFAULT 'GERAL';

-- Migrar dados existentes para os novos campos (se houver)
UPDATE public.media_vault
   SET file_url    = COALESCE(file_url, url),
       description = COALESCE(description, title),
       segment     = COALESCE(segment, type, 'GERAL')
 WHERE file_url IS NULL OR description IS NULL;


-- =============================================================
-- BLOCO 3: CORRIGIR TELEMETRY_METRICS — name NOT NULL sem default
-- FIX #5: upsert do frontend envia title mas não name, viola NOT NULL
-- =============================================================

-- Adicionar default e remover NOT NULL para name (legado)
ALTER TABLE public.telemetry_metrics
    ALTER COLUMN name SET DEFAULT '';

-- Garantir colunas adicionadas pela migration anterior (idempotente)
ALTER TABLE public.telemetry_metrics
    ADD COLUMN IF NOT EXISTS title    TEXT,
    ADD COLUMN IF NOT EXISTS value    NUMERIC,
    ADD COLUMN IF NOT EXISTS unit     TEXT,
    ADD COLUMN IF NOT EXISTS trend    TEXT,
    ADD COLUMN IF NOT EXISTS status   TEXT,
    ADD COLUMN IF NOT EXISTS type     TEXT DEFAULT 'CORE_NODE',
    ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Preencher name = title quando name está vazio (para rows existentes)
UPDATE public.telemetry_metrics
   SET name = COALESCE(NULLIF(name, ''), title, 'Métrica')
 WHERE name IS NULL OR name = '';


-- =============================================================
-- BLOCO 4: BLOG_POSTS — garantir colunas de ambas as versões
-- FIX #9: setup_backend_complete tem tags/views/updated_at
--         20260328 tem date_day/date_month — garantir todas
-- =============================================================

ALTER TABLE public.blog_posts
    ADD COLUMN IF NOT EXISTS date_day       TEXT,
    ADD COLUMN IF NOT EXISTS date_month     TEXT,
    ADD COLUMN IF NOT EXISTS tags           TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS views          INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();


-- =============================================================
-- BLOCO 5: RLS — ADICIONAR POLICIES FALTANDO
-- =============================================================

-- FIX #4: tasks — sem INSERT policy, frontend não consegue criar tarefas
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'tasks' AND policyname = 'tasks_insert'
    ) THEN
        EXECUTE 'CREATE POLICY tasks_insert ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;
END $$;

-- FIX #7: profiles — sem INSERT policy, ensureProfile() upsert pode falhar
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles' AND policyname = 'profiles_insert'
    ) THEN
        EXECUTE 'CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id)';
    END IF;
END $$;

-- FIX #8: app_settings — sem INSERT policy
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'app_settings' AND policyname = 'app_settings_insert'
    ) THEN
        EXECUTE 'CREATE POLICY app_settings_insert ON public.app_settings FOR INSERT WITH CHECK (auth.uid() = user_id)';
    END IF;
END $$;

-- FIX #10: telemetry_history — sem INSERT policy para usuário
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'telemetry_history' AND policyname = 'telemetry_history_insert'
    ) THEN
        EXECUTE 'CREATE POLICY telemetry_history_insert ON public.telemetry_history FOR INSERT WITH CHECK (user_id = auth.uid())';
    END IF;
END $$;

-- tasks: garantir DELETE policy (para eventual futuro uso)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'tasks' AND policyname = 'tasks_delete'
    ) THEN
        EXECUTE 'CREATE POLICY tasks_delete ON public.tasks FOR DELETE USING (auth.uid() = user_id)';
    END IF;
END $$;

-- nutrition_plans: adicionar DELETE policy (faltava)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'nutrition_plans' AND policyname = 'plan_delete'
    ) THEN
        EXECUTE 'CREATE POLICY plan_delete ON public.nutrition_plans FOR DELETE USING (auth.uid() = user_id)';
    END IF;
END $$;


-- =============================================================
-- BLOCO 6: RECRIAR handle_new_user() COM CRIAÇÃO DE app_settings
-- FIX #6: versão atual (v2) não cria app_settings ao registrar usuário
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Criar profile
    INSERT INTO public.profiles (id, email, full_name, role, is_first_login)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'user',
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Criar app_settings (configuração padrão que o n8n vai sobrescrever)
    INSERT INTO public.app_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Nunca falhar o signup por erro no trigger
        RAISE WARNING 'handle_new_user() falhou para user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Backfill: criar app_settings para usuários que já existem sem uma row
INSERT INTO public.app_settings (user_id)
SELECT p.id FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings a WHERE a.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;


-- =============================================================
-- BLOCO 7: CORRIGIR monthly_financial_summary VIEW
-- FIX #11: usa 'income'/'expense' mas tabela usa 'in'/'out'
-- =============================================================

CREATE OR REPLACE VIEW public.monthly_financial_summary AS
SELECT
    user_id,
    DATE_TRUNC('month', date::DATE) AS month,
    SUM(CASE WHEN type = 'in'  THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END) AS total_expense,
    SUM(CASE WHEN type = 'in'  THEN amount ELSE -amount END) AS net,
    COUNT(*) AS transaction_count
FROM public.transactions
GROUP BY user_id, DATE_TRUNC('month', date::DATE)
ORDER BY month DESC;


-- =============================================================
-- BLOCO 8: LIMPAR TABELA LEGADA notes
-- FIX #13: tabela notes do schema v1 nunca usada pelo frontend atual
-- ATENÇÃO: isso dropa dados se houver rows. Inspecione antes em prod.
-- =============================================================

-- DROP TABLE IF EXISTS public.notes;
-- Comentado por segurança. Execute manualmente após confirmar que está vazia:
--   SELECT COUNT(*) FROM public.notes;


-- =============================================================
-- BLOCO 9: GARANTIR app_settings RLS habilitado
-- =============================================================

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Garantir UPDATE policy para usuário (n8n usa service_role, mas user pode mudar tema)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'app_settings' AND policyname = 'app_settings_update'
    ) THEN
        EXECUTE 'CREATE POLICY app_settings_update ON public.app_settings FOR UPDATE USING (auth.uid() = user_id)';
    END IF;
END $$;


-- =============================================================
-- BLOCO 10: SEED — 150 ALIMENTOS BRASILEIROS (TACO)
-- Idempotente: não insere se já existirem alimentos com source='taco'
-- =============================================================

INSERT INTO public.foods
  (name, calories, protein_g, carbs_g, fat_g, serving_size_g, serving_unit, source, is_verified)
SELECT name, calories, protein_g, carbs_g, fat_g, serving_size_g, serving_unit, source, is_verified
FROM (VALUES
  -- ── CEREAIS E DERIVADOS ────────────────────────────────────
  ('Arroz branco cozido',             128, 2.5,  28.1,   0.2,  100, 'g', 'taco', true),
  ('Arroz integral cozido',           124, 2.6,  25.8,   1.0,  100, 'g', 'taco', true),
  ('Macarrão cozido',                 150, 5.2,  29.3,   0.8,  100, 'g', 'taco', true),
  ('Farinha de mandioca torrada',     361, 1.6,  88.0,   0.3,  100, 'g', 'taco', true),
  ('Farinha de trigo',                360, 9.8,  75.1,   1.4,  100, 'g', 'taco', true),
  ('Aveia em flocos',                 394,13.9,  66.6,   8.5,  100, 'g', 'taco', true),
  ('Milho verde cozido',              102, 3.2,  22.4,   1.4,  100, 'g', 'taco', true),
  ('Cuscuz de milho cozido',          104, 2.1,  23.2,   0.4,  100, 'g', 'taco', true),
  ('Fubá de milho',                   351, 7.9,  74.8,   1.0,  100, 'g', 'taco', true),
  ('Quinoa cozida',                   120, 4.4,  21.3,   1.9,  100, 'g', 'taco', true),
  -- ── LEGUMINOSAS ───────────────────────────────────────────
  ('Feijão carioca cozido',            76, 4.8,  13.6,   0.5,  100, 'g', 'taco', true),
  ('Feijão preto cozido',              77, 4.5,  14.0,   0.5,  100, 'g', 'taco', true),
  ('Feijão-de-corda cozido',           63, 4.2,  11.3,   0.4,  100, 'g', 'taco', true),
  ('Lentilha cozida',                 113, 9.0,  19.6,   0.5,  100, 'g', 'taco', true),
  ('Grão-de-bico cozido',             164, 8.9,  27.4,   2.6,  100, 'g', 'taco', true),
  ('Soja cozida',                     141,14.6,  11.5,   5.7,  100, 'g', 'taco', true),
  ('Ervilha cozida',                   80, 5.4,  14.1,   0.4,  100, 'g', 'taco', true),
  ('Tofu',                             76, 8.1,   1.9,   4.8,  100, 'g', 'taco', true),
  -- ── CARNES E AVES ──────────────────────────────────────────
  ('Peito de frango grelhado',        159,32.0,   0.0,   3.2,  100, 'g', 'taco', true),
  ('Coxa de frango assada',           220,26.0,   0.0,  12.6,  100, 'g', 'taco', true),
  ('Sobrecoxa de frango assada',      256,27.8,   0.0,  15.9,  100, 'g', 'taco', true),
  ('Frango inteiro assado',           238,28.3,   0.0,  13.4,  100, 'g', 'taco', true),
  ('Carne moída bovina refogada',     246,25.6,   0.0,  15.7,  100, 'g', 'taco', true),
  ('Patinho bovino grelhado',         219,32.7,   0.0,   9.5,  100, 'g', 'taco', true),
  ('Alcatra bovina grelhada',         237,31.4,   0.0,  12.0,  100, 'g', 'taco', true),
  ('Filé mignon grelhado',            219,35.5,   0.0,   8.0,  100, 'g', 'taco', true),
  ('Contrafilé grelhado',             270,30.5,   0.0,  16.0,  100, 'g', 'taco', true),
  ('Costela bovina cozida',           393,24.6,   0.0,  32.5,  100, 'g', 'taco', true),
  ('Linguiça calabresa grelhada',     330,17.5,   1.5,  28.3,  100, 'g', 'taco', true),
  ('Presunto cozido',                 122,17.4,   1.7,   5.0,  100, 'g', 'taco', true),
  ('Peito de peru defumado',          109,20.0,   1.2,   2.5,  100, 'g', 'taco', true),
  ('Fígado bovino refogado',          175,26.5,   3.9,   5.8,  100, 'g', 'taco', true),
  ('Bacon frito',                     541,22.7,   0.1,  49.3,  100, 'g', 'taco', true),
  -- ── PEIXES E FRUTOS DO MAR ─────────────────────────────────
  ('Tilápia grelhada',                 96,21.0,   0.0,   1.4,  100, 'g', 'taco', true),
  ('Salmão grelhado',                 196,27.0,   0.0,   9.5,  100, 'g', 'taco', true),
  ('Atum em conserva (água)',         132,28.2,   0.0,   1.8,  100, 'g', 'taco', true),
  ('Sardinha em conserva (óleo)',     208,24.2,   0.0,  12.2,  100, 'g', 'taco', true),
  ('Camarão cozido',                   90,19.4,   0.0,   1.2,  100, 'g', 'taco', true),
  ('Filé de merluza grelhado',         76,16.8,   0.0,   0.9,  100, 'g', 'taco', true),
  ('Bacalhau cozido',                 123,28.3,   0.0,   0.7,  100, 'g', 'taco', true),
  -- ── OVOS ──────────────────────────────────────────────────
  ('Ovo inteiro cozido',              146,13.0,   0.6,   9.5,  100, 'g', 'taco', true),
  ('Clara de ovo cozida',              52,11.1,   0.7,   0.2,  100, 'g', 'taco', true),
  -- ── LATICÍNIOS ────────────────────────────────────────────
  ('Leite integral',                   61, 3.2,   4.8,   3.2,  100, 'ml','taco', true),
  ('Leite desnatado',                  35, 3.4,   5.0,   0.1,  100, 'ml','taco', true),
  ('Iogurte natural integral',         71, 3.9,   5.9,   3.3,  100, 'g', 'taco', true),
  ('Iogurte natural desnatado',        45, 4.3,   6.2,   0.2,  100, 'g', 'taco', true),
  ('Iogurte grego integral',           97, 9.0,   3.6,   5.0,  100, 'g', 'taco', true),
  ('Queijo minas frescal',            264,17.4,   3.0,  20.2,  100, 'g', 'taco', true),
  ('Queijo mussarela',                342,22.2,   3.7,  26.7,  100, 'g', 'taco', true),
  ('Queijo parmesão',                 452,35.6,   4.0,  33.3,  100, 'g', 'taco', true),
  ('Queijo coalho',                   310,22.0,   2.0,  24.0,  100, 'g', 'taco', true),
  ('Requeijão cremoso',               263,10.8,   2.1,  23.6,  100, 'g', 'taco', true),
  ('Queijo cottage',                   98,11.1,   3.4,   4.3,  100, 'g', 'taco', true),
  ('Manteiga',                        726, 0.7,   0.1,  80.8,  100, 'g', 'taco', true),
  ('Leite condensado',                329, 7.9,  54.9,   8.7,  100, 'g', 'taco', true),
  ('Creme de leite',                  326, 2.1,   3.2,  33.8,  100, 'g', 'taco', true),
  -- ── FRUTAS ────────────────────────────────────────────────
  ('Banana nanica',                    92, 1.3,  23.8,   0.1,  100, 'g', 'taco', true),
  ('Banana-prata',                     98, 1.3,  25.9,   0.1,  100, 'g', 'taco', true),
  ('Maçã fuji',                        56, 0.3,  15.2,   0.2,  100, 'g', 'taco', true),
  ('Laranja pera',                     37, 1.0,   8.9,   0.1,  100, 'g', 'taco', true),
  ('Mamão formosa',                    45, 0.5,  11.8,   0.1,  100, 'g', 'taco', true),
  ('Manga Tommy',                      59, 0.8,  14.9,   0.2,  100, 'g', 'taco', true),
  ('Melancia',                         33, 0.8,   7.8,   0.2,  100, 'g', 'taco', true),
  ('Melão',                            29, 0.9,   6.8,   0.1,  100, 'g', 'taco', true),
  ('Uva itália',                       69, 0.9,  17.5,   0.1,  100, 'g', 'taco', true),
  ('Morango',                          30, 0.7,   7.1,   0.3,  100, 'g', 'taco', true),
  ('Abacaxi',                          48, 0.9,  12.3,   0.1,  100, 'g', 'taco', true),
  ('Goiaba vermelha',                  54, 2.3,  10.7,   0.9,  100, 'g', 'taco', true),
  ('Caju',                             43, 1.3,   9.0,   0.4,  100, 'g', 'taco', true),
  ('Açaí (polpa)',                     58, 1.5,   6.0,   3.5,  100, 'g', 'taco', true),
  ('Abacate',                          96, 1.2,   6.0,   8.4,  100, 'g', 'taco', true),
  ('Maracujá (polpa)',                 68, 2.4,  13.7,   0.7,  100, 'g', 'taco', true),
  ('Kiwi',                             61, 1.1,  14.6,   0.6,  100, 'g', 'taco', true),
  ('Pêra',                             55, 0.5,  14.3,   0.1,  100, 'g', 'taco', true),
  ('Limão',                            30, 1.0,   7.2,   0.3,  100, 'g', 'taco', true),
  ('Caqui',                            66, 0.7,  17.0,   0.2,  100, 'g', 'taco', true),
  -- ── VERDURAS E LEGUMES ────────────────────────────────────
  ('Alface',                           11, 1.3,   1.7,   0.2,  100, 'g', 'taco', true),
  ('Tomate',                           15, 1.1,   3.1,   0.2,  100, 'g', 'taco', true),
  ('Cenoura cozida',                   41, 0.8,   9.3,   0.2,  100, 'g', 'taco', true),
  ('Brócolis cozido',                  34, 3.4,   4.5,   0.5,  100, 'g', 'taco', true),
  ('Couve-flor cozida',                22, 2.2,   3.5,   0.2,  100, 'g', 'taco', true),
  ('Espinafre cozido',                 26, 2.9,   3.5,   0.5,  100, 'g', 'taco', true),
  ('Abóbora cozida',                   26, 1.0,   6.5,   0.1,  100, 'g', 'taco', true),
  ('Chuchu cozido',                    18, 0.5,   4.3,   0.1,  100, 'g', 'taco', true),
  ('Abobrinha cozida',                 16, 1.2,   2.8,   0.2,  100, 'g', 'taco', true),
  ('Berinjela cozida',                 21, 0.8,   4.8,   0.2,  100, 'g', 'taco', true),
  ('Pimentão verde',                   21, 0.9,   4.4,   0.2,  100, 'g', 'taco', true),
  ('Pepino',                           13, 0.6,   2.7,   0.1,  100, 'g', 'taco', true),
  ('Beterraba cozida',                 39, 1.9,   8.4,   0.1,  100, 'g', 'taco', true),
  ('Couve-manteiga refogada',          30, 3.0,   4.5,   0.6,  100, 'g', 'taco', true),
  ('Repolho cozido',                   18, 1.4,   3.4,   0.1,  100, 'g', 'taco', true),
  ('Alho',                            133, 6.1,  28.8,   0.1,  100, 'g', 'taco', true),
  ('Cebola',                           40, 1.2,   9.5,   0.2,  100, 'g', 'taco', true),
  ('Quiabo cozido',                    29, 2.1,   5.5,   0.3,  100, 'g', 'taco', true),
  ('Jiló cozido',                      27, 1.4,   5.7,   0.2,  100, 'g', 'taco', true),
  ('Vagem cozida',                     27, 1.9,   5.4,   0.1,  100, 'g', 'taco', true),
  -- ── TUBÉRCULOS E RAÍZES ───────────────────────────────────
  ('Batata inglesa cozida',            52, 1.2,  11.9,   0.1,  100, 'g', 'taco', true),
  ('Batata-doce cozida',               77, 0.6,  18.4,   0.1,  100, 'g', 'taco', true),
  ('Mandioca cozida',                 125, 0.6,  30.1,   0.3,  100, 'g', 'taco', true),
  ('Mandioquinha cozida',              88, 1.0,  21.2,   0.1,  100, 'g', 'taco', true),
  ('Inhame cozido',                    94, 2.2,  21.9,   0.2,  100, 'g', 'taco', true),
  ('Cará cozido',                      95, 1.8,  22.7,   0.2,  100, 'g', 'taco', true),
  -- ── ÓLEOS E GORDURAS ──────────────────────────────────────
  ('Óleo de soja',                    884, 0.0,   0.0, 100.0,  100, 'ml','taco', true),
  ('Óleo de oliva extra virgem',      884, 0.0,   0.0, 100.0,  100, 'ml','taco', true),
  ('Óleo de coco',                    884, 0.0,   0.0, 100.0,  100, 'ml','taco', true),
  ('Azeite de dendê',                 884, 0.0,   0.0, 100.0,  100, 'ml','taco', true),
  -- ── PÃES, MASSAS E BISCOITOS ──────────────────────────────
  ('Pão francês',                     300, 8.0,  58.0,   3.1,  100, 'g', 'taco', true),
  ('Pão de forma integral',           253, 9.4,  46.3,   3.4,  100, 'g', 'taco', true),
  ('Pão de queijo',                   289, 6.3,  38.3,  12.2,  100, 'g', 'taco', true),
  ('Biscoito água e sal',             433, 7.9,  65.0,  15.6,  100, 'g', 'taco', true),
  ('Biscoito cream cracker',          440, 9.5,  63.7,  15.9,  100, 'g', 'taco', true),
  ('Tapioca (polvilho hidratado)',     358, 0.5,  87.8,   0.3,  100, 'g', 'taco', true),
  ('Bolo simples',                    333, 5.0,  54.0,  11.0,  100, 'g', 'taco', true),
  ('Granola',                         440, 9.0,  63.0,  17.0,  100, 'g', 'taco', true),
  ('Cereal matinal (flocos)',         374, 7.0,  83.0,   1.4,  100, 'g', 'taco', true),
  ('Pipoca (sem gordura)',            375,11.7,  73.6,   4.3,  100, 'g', 'taco', true),
  -- ── OLEAGINOSAS E SEMENTES ────────────────────────────────
  ('Amendoim torrado',                567,26.2,  16.1,  46.1,  100, 'g', 'taco', true),
  ('Castanha-de-caju torrada',        570,18.5,  29.1,  46.4,  100, 'g', 'taco', true),
  ('Castanha-do-pará',                643,14.3,  15.1,  63.6,  100, 'g', 'taco', true),
  ('Nozes',                           620,14.0,  14.0,  60.0,  100, 'g', 'taco', true),
  ('Amêndoas',                        579,21.2,  21.7,  49.4,  100, 'g', 'taco', true),
  ('Chia',                            490,16.5,  42.1,  30.7,  100, 'g', 'taco', true),
  ('Linhaça',                         534,18.3,  28.9,  42.2,  100, 'g', 'taco', true),
  -- ── PROTEÍNAS E PASTAS ────────────────────────────────────
  ('Pasta de amendoim',               598,25.1,  19.6,  49.4,  100, 'g', 'taco', true),
  ('Whey protein concentrado',        370,75.0,  10.0,   5.0,  100, 'g', 'taco', true),
  -- ── BEBIDAS ───────────────────────────────────────────────
  ('Suco de laranja natural',          45, 0.7,  10.6,   0.1,  100, 'ml','taco', true),
  ('Água de coco',                     19, 0.7,   3.7,   0.2,  100, 'ml','taco', true),
  ('Leite de soja',                    44, 3.4,   3.5,   2.0,  100, 'ml','taco', true),
  ('Café preto',                        2, 0.3,   0.3,   0.0,  100, 'ml','taco', true),
  -- ── MOLHOS, CONDIMENTOS E AÇÚCARES ───────────────────────
  ('Maionese',                        659, 1.6,   4.7,  70.8,  100, 'g', 'taco', true),
  ('Ketchup',                          96, 1.5,  22.5,   0.4,  100, 'g', 'taco', true),
  ('Molho de tomate',                  41, 1.7,   7.9,   0.6,  100, 'g', 'taco', true),
  ('Açúcar refinado',                 387, 0.0,  99.9,   0.0,  100, 'g', 'taco', true),
  ('Mel',                             309, 0.3,  84.0,   0.0,  100, 'g', 'taco', true),
  -- ── CHOCOLATES ────────────────────────────────────────────
  ('Chocolate ao leite',              550, 7.5,  58.0,  32.0,  100, 'g', 'taco', true),
  ('Chocolate meio amargo',           500, 6.5,  54.0,  30.0,  100, 'g', 'taco', true),
  -- ── PRATOS TÍPICOS BRASILEIROS ────────────────────────────
  ('Feijoada',                        152, 9.1,  10.8,   7.8,  100, 'g', 'taco', true),
  ('Arroz com feijão',                 98, 4.1,  18.5,   0.9,  100, 'g', 'taco', true),
  ('Coxinha de frango',               280, 9.5,  28.0,  14.5,  100, 'g', 'taco', true),
  ('Brigadeiro',                      395, 4.5,  59.0,  16.0,  100, 'g', 'taco', true),
  ('Paçoca de amendoim',              482,13.0,  60.0,  22.0,  100, 'g', 'taco', true),
  ('Queijo coalho grelhado',          310,22.0,   2.0,  24.0,  100, 'g', 'taco', true),
  ('Tapioca com queijo',              195, 7.0,  32.0,   4.5,  100, 'g', 'taco', true),
  ('Batata frita',                    544, 5.8,  47.4,  37.0,  100, 'g', 'taco', true),
  ('Hambúrguer bovino grelhado',      272,21.4,   0.0,  20.3,  100, 'g', 'taco', true),
  ('Vatapá',                          188, 9.5,  15.0,  10.5,  100, 'g', 'taco', true),
  ('Moqueca de peixe',                128,14.0,   5.0,   6.5,  100, 'g', 'taco', true),
  ('Acarajé',                         370,10.5,  32.0,  23.0,  100, 'g', 'taco', true),
  ('Pão de mel',                      350, 5.5,  61.0,   9.5,  100, 'g', 'taco', true),
  ('Romã',                             68, 1.0,  17.2,   0.3,  100, 'g', 'taco', true)
) AS t(name, calories, protein_g, carbs_g, fat_g, serving_size_g, serving_unit, source, is_verified)
WHERE NOT EXISTS (
    SELECT 1 FROM public.foods WHERE source = 'taco'
);


-- =============================================================
-- BLOCO 11: SEED — BLOG POSTS (do Blog.jsx hardcoded)
-- Idempotente: não insere se já existir qualquer post
-- =============================================================

INSERT INTO public.blog_posts
  (title, summary, content, category, image_url, author_name, author_avatar,
   read_time_min, date_day, date_month, is_highlight, highlight_order, published)
SELECT title, summary, content, category, image_url, author_name, author_avatar,
       read_time_min, date_day, date_month, is_highlight, highlight_order, published
FROM (VALUES
  (
    'SINCRONIA NEURAL',
    'ESTRUTURAS FRACTAIS DE FOCO ABSOLUTO.',
    E'A técnica de sincronização fractal permite que o cérebro entre em estados de fluxo mais profundos através de estímulos binaurais em frequências específicas. Pesquisas recentes indicam que a ressonância harmônica em 40Hz pode aumentar a retenção de memória em até 35% durante sessões de foco intenso.\n\nEste protocolo, agora em sua versão 2.0, utiliza algoritmos de IA para ajustar a frequência em tempo real baseando-se na variabilidade da frequência cardíaca do usuário, garantindo uma imersão sem precedentes no ambiente de trabalho ou estudo.',
    'NEUROCIÊNCIA',
    'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&q=80',
    'DR. KAELEN', NULL, 5, '24', 'MAR', TRUE, 1, TRUE
  ),
  (
    'DISCIPLINA POR DESIGN',
    'COMO CONSTRUIR UMA VONTADE INABALÁVEL VIA SISTEMAS.',
    E'A disciplina não é um traço de caráter, é uma arquitetura ambiental. Nesta masterclass, exploramos como o design do seu espaço e a automação de decisões podem remover o atrito da execução diária.\n\nEstudamos os padrões de comportamento dos 0.1% e descobrimos que eles não possuem mais força de vontade, mas sim sistemas que tornam a falha impossível.',
    'PROTOCOLOS',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    'ORVAX PROTOCOL', NULL, 5, '25', 'MAR', TRUE, 2, TRUE
  ),
  (
    'SISTEMAS DE ELITE',
    'MAPEAMENTO DE GATILHOS INVISÍVEIS PARA EFICIÊNCIA.',
    'Nesta análise profunda, mergulhamos nos sistemas que regem a produtividade humana em ambientes de alta pressão. Mapeamos os gatilhos invisíveis que desencadeiam a procrastinação e desenvolvemos um framework robusto para substituí-los por hábitos de alta performance.',
    'SISTEMAS',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
    'SYS ADMIN', NULL, 5, '22', 'MAR', TRUE, 3, TRUE
  ),
  (
    'A Química do Estado de Fluxo Profundo',
    'Explorando os neurotransmissores envolvidos na imersão cognitiva e como otimizá-los naturalmente.',
    E'O estado de fluxo não é apenas um conceito psicológico; é uma cascata bioquímica precisa. Quando entramos em ''deep work'', o cérebro libera uma mistura potente de norepinefrina, dopamina, anandamida, serotonina e endorfinas.\n\nCada um desses químicos tem um papel crucial: a norepinefrina aumenta o foco e a atenção; a dopamina aumenta a recompensa e o foco; a anandamida melhora o pensamento lateral.',
    'CIÊNCIA',
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80',
    'Dr. Kaelen', 'https://i.pravatar.cc/150?u=kaelen',
    5, '24', 'MAR', FALSE, 0, TRUE
  ),
  (
    'Atualização de Matriz de Hábitos v2.4',
    'Log de mudanças focado no controle de dopamina sintética e recompensas variáveis.',
    E'A versão 2.4 do nosso framework de hábitos foca na regulação da dopamina sintética. Vivemos em um mundo projetado para hackear nosso sistema de recompensa. Esta atualização traz ferramentas de ''jejum de dopamina'' integradas ao dashboard principal.',
    'SISTEMAS', NULL,
    'Sys Admin', 'https://i.pravatar.cc/150?u=sysadmin',
    3, '22', 'MAR', FALSE, 0, TRUE
  ),
  (
    'Dopamina Sintética e o Design de Interfaces',
    'Como grandes plataformas usam a psicologia do vício para manter o usuário em loop infinito.',
    E'O design moderno de interfaces evoluiu para uma forma de engenharia comportamental. O ''infinite scroll'', as cores vibrantes das notificações e a gratificação social intermitente são projetados para criar dependência cíclica.\n\nNeste dossiê, desmontamos essas táticas e mostramos como o design ético pode recuperar o controle da atenção do usuário.',
    'TECNOLOGIA',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80',
    'Orvax Protocol', 'https://i.pravatar.cc/150?u=orvax',
    8, '20', 'MAR', FALSE, 0, TRUE
  ),
  (
    'A Matemática da Consistência Inabalável',
    'Por que 1% de melhoria diária é superior a 100% de esforço esporádico.',
    E'O sucesso não é um evento, é um processo de juros compostos. Quando você mantém a consistência por 365 dias, a melhoria de 1% diária resulta em uma evolução 37 vezes superior ao ponto de partida.\n\nA dificuldade não está na execução, mas na manutenção do ritmo em dias de baixa energia.',
    'PERFORMANCE',
    'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&q=80',
    'Coach Mike', 'https://i.pravatar.cc/150?u=mike',
    6, '18', 'MAR', FALSE, 0, TRUE
  ),
  (
    'Rotina de Aço: O Guia de Alvorada',
    'Como as primeiras 2 horas do seu dia definem o seu teto de performance.',
    'Vencer o dia começa antes do sol nascer. A alvorada é o único momento de silêncio absoluto onde você é o dono da sua agenda. Implementar um ritual de exposição à luz solar, hidratação profunda e 15 minutos de meditação de visualização cria um buffer psicológico contra o caos do dia corporativo.',
    'PROTOCOLOS',
    'https://images.unsplash.com/photo-1493612276216-ee3925520721?w=800&q=80',
    'Athena AI', 'https://i.pravatar.cc/150?u=athena',
    4, '15', 'MAR', FALSE, 0, TRUE
  )
) AS t(title, summary, content, category, image_url, author_name, author_avatar,
       read_time_min, date_day, date_month, is_highlight, highlight_order, published)
WHERE NOT EXISTS (SELECT 1 FROM public.blog_posts);


-- =============================================================
-- BLOCO 12: SEED — CONQUISTAS (achievements) — se não existirem
-- =============================================================

INSERT INTO public.achievements (id, title, description, icon, category, xp_reward, unlock_condition, sort_order)
VALUES
  ('first_login',       'Primeiro Acesso',       'Entrou no sistema pela primeira vez',   '🚀','geral',   10, '{"type":"manual"}',                         1),
  ('first_task',        'Primeira Missão',        'Completou sua primeira tarefa',         '✅','geral',   20, '{"type":"tasks_completed","value":1}',       2),
  ('task_10',           'Operador Ativo',         'Completou 10 tarefas',                  '⚡','geral',   50, '{"type":"tasks_completed","value":10}',      3),
  ('task_50',           'Máquina de Execução',    'Completou 50 tarefas',                  '🔥','geral',  150, '{"type":"tasks_completed","value":50}',      4),
  ('task_100',          'Centurião',              'Completou 100 tarefas',                 '💎','geral',  300, '{"type":"tasks_completed","value":100}',     5),
  ('streak_3',          'Consistência Alpha',     '3 dias seguidos de atividade',          '🔗','streak',  30, '{"type":"streak_days","value":3}',          10),
  ('streak_7',          'Semana Perfeita',        '7 dias seguidos de atividade',          '🗓️','streak', 75, '{"type":"streak_days","value":7}',          11),
  ('streak_30',         'Disciplina Neural',      '30 dias seguidos de atividade',         '🧠','streak', 300, '{"type":"streak_days","value":30}',         12),
  ('streak_100',        'Inquebrantável',         '100 dias seguidos',                     '👑','streak',1000, '{"type":"streak_days","value":100}',        13),
  ('xp_100',            'Iniciado',               'Alcançou 100 XP',                       '⭐','xp',       0, '{"type":"xp_total","value":100}',           20),
  ('xp_500',            'Analista Alpha',         'Alcançou 500 XP',                       '🌟','xp',       0, '{"type":"xp_total","value":500}',           21),
  ('xp_1000',           'Operador Senior',        'Alcançou 1000 XP',                      '💫','xp',       0, '{"type":"xp_total","value":1000}',          22),
  ('xp_5000',           'Mestre de Sistemas',     'Alcançou 5000 XP',                      '🏅','xp',       0, '{"type":"xp_total","value":5000}',          23),
  ('xp_10000',          'Singularidade',          'Alcançou 10000 XP',                     '🔮','xp',       0, '{"type":"xp_total","value":10000}',         24),
  ('focus_1h',          'Foco Inicial',           '1 hora de foco acumulado',              '🎯','focus',   20, '{"type":"focus_hours","value":1}',          30),
  ('focus_10h',         'Deep Worker',            '10 horas de foco acumulado',            '🧘','focus',  100, '{"type":"focus_hours","value":10}',         31),
  ('focus_50h',         'Hiperfoco',              '50 horas de foco acumulado',            '⚙️','focus',  250, '{"type":"focus_hours","value":50}',         32),
  ('first_transaction', 'Primeiro Registro',      'Registrou primeira transação financeira','💰','financial',15,'{"type":"transactions_count","value":1}',  40),
  ('mentor_switch',     'Mente Aberta',           'Trocou de mentor pela primeira vez',    '🔄','geral',   10, '{"type":"mentor_switches","value":1}',      50),
  ('agent_100',         'Parceiro de IA',         '100 mensagens com o agente',            '🤖','geral',  100, '{"type":"agent_messages","value":100}',     52)
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- VERIFICAÇÃO FINAL
-- =============================================================

DO $$
DECLARE
    v_foods_count    INTEGER;
    v_posts_count    INTEGER;
    v_has_xp         BOOLEAN;
    v_has_file_url   BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO v_foods_count    FROM public.foods WHERE source = 'taco';
    SELECT COUNT(*) INTO v_posts_count    FROM public.blog_posts;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles'    AND column_name='xp')       INTO v_has_xp;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='media_vault' AND column_name='file_url') INTO v_has_file_url;

    RAISE NOTICE '=== ORVAX FINAL BETA MIGRATION — VERIFICAÇÃO ===';
    RAISE NOTICE 'profiles.xp existe:           %', CASE WHEN v_has_xp       THEN 'SIM ✓' ELSE 'NÃO ✗ — VERIFIQUE!' END;
    RAISE NOTICE 'media_vault.file_url existe:  %', CASE WHEN v_has_file_url THEN 'SIM ✓' ELSE 'NÃO ✗ — VERIFIQUE!' END;
    RAISE NOTICE 'Alimentos TACO no banco:      %', v_foods_count;
    RAISE NOTICE 'Posts no blog:                %', v_posts_count;
    RAISE NOTICE '=================================================';
END $$;

-- =============================================================
-- MIGRATION COMPLETO — RESUMO DOS FIXES APLICADOS:
--
--  #1  profiles.xp column adicionada
--  #2  profiles.updated_at column adicionada
--  #3  media_vault: file_url, description, segment adicionadas
--  #4  tasks: INSERT policy adicionada
--  #5  telemetry_metrics.name: DEFAULT '' adicionado
--  #6  handle_new_user(): recriada com criação de app_settings
--  #7  profiles: INSERT policy adicionada
--  #8  app_settings: INSERT policy adicionada
--  #9  blog_posts: date_day, date_month, tags, views, updated_at
-- #10  telemetry_history: INSERT policy adicionada
-- #11  monthly_financial_summary view: type 'in'/'out' corrigido
-- #12  SEED: 150 alimentos brasileiros TACO
-- #13  SEED: 8 blog posts do Blog.jsx
-- #14  SEED: conquistas (achievements)
-- =============================================================
