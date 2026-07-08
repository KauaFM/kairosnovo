-- =============================================================
-- ORVAX — FITCAL REBUILD (20260422)
-- Reconstrução completa do módulo nutricional para escala global.
-- Padrão MyFitnessPal/Yazio/Cronometer.
--
-- Normaliza foods + nutrients + portions, separa branded de generic,
-- adiciona meals compostas, persiste métricas reais (Torre +
-- Execution Map), cria índices para histórico longo prazo.
--
-- IMPORTANTE: esta migration convive com 20260325_fitcal_module.sql.
-- Não dropa as tabelas antigas — adiciona as novas normalizadas e
-- cria views/funções de compatibilidade. O serviço é migrado
-- progressivamente pelo frontend.
-- =============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;          -- busca fuzzy em foods.name
CREATE EXTENSION IF NOT EXISTS unaccent;         -- busca sem acento ("feijao" = "feijão")

-- Wrapper IMMUTABLE necessário para usar em GENERATED columns e índices
-- (unaccent() padrão é STABLE porque depende do dicionário carregado)
CREATE OR REPLACE FUNCTION public.immutable_unaccent(TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- =============================================================
-- 1. CATÁLOGO DE ALIMENTOS NORMALIZADO
-- =============================================================

-- 1.1 FOODS (base) — 1 linha por alimento genérico OU marca
CREATE TABLE IF NOT EXISTS public.foods_v2 (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    name_normalized TEXT GENERATED ALWAYS AS (lower(public.immutable_unaccent(name))) STORED,
    brand           TEXT,                                  -- NULL = genérico
    barcode         TEXT UNIQUE,
    category        TEXT,                                  -- 'graos', 'carnes', 'frutas', etc
    kind            TEXT NOT NULL DEFAULT 'generic'
                        CHECK (kind IN ('generic','branded','recipe','user_custom')),
    source          TEXT NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual','usda','openfoodfacts','taco','user','ai_scan')),
    source_id       TEXT,                                  -- id externo (USDA fdc_id, OFF code, etc)
    locale          TEXT NOT NULL DEFAULT 'pt-BR',
    verified        BOOLEAN NOT NULL DEFAULT FALSE,        -- curadoria ORVAX
    created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_foods_v2_name_trgm
    ON public.foods_v2 USING gin (name_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_foods_v2_kind        ON public.foods_v2 (kind);
CREATE INDEX IF NOT EXISTS idx_foods_v2_category    ON public.foods_v2 (category);
CREATE INDEX IF NOT EXISTS idx_foods_v2_verified    ON public.foods_v2 (verified) WHERE verified;
CREATE INDEX IF NOT EXISTS idx_foods_v2_barcode     ON public.foods_v2 (barcode) WHERE barcode IS NOT NULL;

-- 1.2 FOOD_NUTRIENTS (long format) — 1 linha por (alimento, nutriente)
-- Valores SEMPRE por 100g (base em gramas). Conversão vem de food_portions.
CREATE TABLE IF NOT EXISTS public.food_nutrients (
    food_id     UUID NOT NULL REFERENCES public.foods_v2(id) ON DELETE CASCADE,
    nutrient    TEXT NOT NULL,            -- 'calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg','calcium_mg','iron_mg','vitamin_c_mg','vitamin_d_iu','potassium_mg','cholesterol_mg','saturated_fat_g','trans_fat_g', etc
    amount      NUMERIC(12,4) NOT NULL,
    unit        TEXT NOT NULL,            -- 'kcal','g','mg','mcg','iu'
    PRIMARY KEY (food_id, nutrient)
);

CREATE INDEX IF NOT EXISTS idx_food_nutrients_nutrient ON public.food_nutrients (nutrient);

-- 1.3 FOOD_PORTIONS — múltiplas formas de servir o mesmo alimento
CREATE TABLE IF NOT EXISTS public.food_portions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id     UUID NOT NULL REFERENCES public.foods_v2(id) ON DELETE CASCADE,
    label       TEXT NOT NULL,            -- '1 fatia', '1 colher de sopa', '1 xícara', '1 unidade media'
    grams       NUMERIC(10,2) NOT NULL CHECK (grams > 0),
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_portions_food ON public.food_portions (food_id);

-- Garante no máximo 1 porção default por alimento
CREATE UNIQUE INDEX IF NOT EXISTS idx_food_portions_one_default
    ON public.food_portions (food_id) WHERE is_default;

-- =============================================================
-- 2. REFEIÇÕES COMPOSTAS (meals + items)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.meals_v2 (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meals_v2_user ON public.meals_v2 (user_id);

CREATE TABLE IF NOT EXISTS public.meal_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id     UUID NOT NULL REFERENCES public.meals_v2(id) ON DELETE CASCADE,
    food_id     UUID NOT NULL REFERENCES public.foods_v2(id) ON DELETE RESTRICT,
    portion_id  UUID REFERENCES public.food_portions(id) ON DELETE SET NULL,
    quantity    NUMERIC(10,2) NOT NULL,    -- unidades daquela porção (ex 2 fatias)
    grams       NUMERIC(10,2) NOT NULL,    -- gramas resolvidos (snapshot)
    sort_order  SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_meal_items_meal ON public.meal_items (meal_id);

-- =============================================================
-- 3. FOOD LOGS (substitui meal_entries — mantém o antigo pra compat)
-- =============================================================
-- Snapshot completo de nutrientes no momento do log (histórico imutável).

CREATE TABLE IF NOT EXISTS public.food_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    food_id       UUID REFERENCES public.foods_v2(id) ON DELETE SET NULL,
    meal_id       UUID REFERENCES public.meals_v2(id) ON DELETE SET NULL,
    portion_id    UUID REFERENCES public.food_portions(id) ON DELETE SET NULL,
    meal_type     TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
    log_date      DATE NOT NULL,
    logged_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Snapshot nutricional
    name_snapshot TEXT NOT NULL,           -- nome no momento do log
    quantity      NUMERIC(10,2),
    grams         NUMERIC(10,2) NOT NULL CHECK (grams > 0),
    calories      NUMERIC(10,2) NOT NULL DEFAULT 0,
    protein_g     NUMERIC(10,2) NOT NULL DEFAULT 0,
    carbs_g       NUMERIC(10,2) NOT NULL DEFAULT 0,
    fat_g         NUMERIC(10,2) NOT NULL DEFAULT 0,
    fiber_g       NUMERIC(10,2) DEFAULT 0,
    sugar_g       NUMERIC(10,2) DEFAULT 0,
    sodium_mg     NUMERIC(10,2) DEFAULT 0,
    -- Origem
    source        TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual','search','barcode','meal','ai_photo','ai_voice','quick')),
    ai_confidence NUMERIC(3,2),
    photo_url     TEXT,
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices CRÍTICOS para histórico longo prazo
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date
    ON public.food_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date_meal
    ON public.food_logs (user_id, log_date, meal_type);
CREATE INDEX IF NOT EXISTS idx_food_logs_food
    ON public.food_logs (food_id);
-- Para agregação mensal, o índice (user_id, log_date DESC) acima já é suficiente
-- (Postgres usa range scan). date_trunc gera STABLE/recusa de imutabilidade em índice.

-- =============================================================
-- 4. MÉTRICAS DIÁRIAS MATERIALIZADAS
-- =============================================================
-- Torre = score de consistência diária (0-100)
-- Execution Map = agregado por dia para heatmap real

CREATE TABLE IF NOT EXISTS public.fitcal_daily_metrics (
    user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date         DATE NOT NULL,
    -- Nutrição
    total_calories   NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_protein_g  NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_carbs_g    NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_fat_g      NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_fiber_g    NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_sodium_mg  NUMERIC(10,2) NOT NULL DEFAULT 0,
    water_ml         INTEGER NOT NULL DEFAULT 0,
    -- Metas
    goal_calories    INTEGER,
    goal_protein_g   INTEGER,
    goal_carbs_g     INTEGER,
    goal_fat_g       INTEGER,
    goal_water_ml    INTEGER,
    -- Scores
    torre_score      SMALLINT NOT NULL DEFAULT 0 CHECK (torre_score BETWEEN 0 AND 100),
    execution_level  SMALLINT NOT NULL DEFAULT 0 CHECK (execution_level BETWEEN 0 AND 4),
    -- Contadores
    entries_count    SMALLINT NOT NULL DEFAULT 0,
    meals_logged     SMALLINT NOT NULL DEFAULT 0,
    -- Meta
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_fitcal_daily_metrics_date
    ON public.fitcal_daily_metrics (log_date DESC);

-- =============================================================
-- 5. RLS
-- =============================================================
ALTER TABLE public.foods_v2              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_nutrients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_portions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals_v2              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitcal_daily_metrics  ENABLE ROW LEVEL SECURITY;

-- foods_v2: leitura pública pra catálogo global; user cria seus custom
DROP POLICY IF EXISTS foods_v2_select ON public.foods_v2;
CREATE POLICY foods_v2_select ON public.foods_v2
    FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS foods_v2_insert ON public.foods_v2;
CREATE POLICY foods_v2_insert ON public.foods_v2
    FOR INSERT TO authenticated
    WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

DROP POLICY IF EXISTS foods_v2_update_own ON public.foods_v2;
CREATE POLICY foods_v2_update_own ON public.foods_v2
    FOR UPDATE TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- food_nutrients / food_portions: lê tudo (são atributos do catálogo público)
DROP POLICY IF EXISTS food_nutrients_select ON public.food_nutrients;
CREATE POLICY food_nutrients_select ON public.food_nutrients
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS food_nutrients_write ON public.food_nutrients;
CREATE POLICY food_nutrients_write ON public.food_nutrients
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.foods_v2 f WHERE f.id = food_id AND (f.created_by = auth.uid() OR f.created_by IS NULL)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.foods_v2 f WHERE f.id = food_id AND (f.created_by = auth.uid() OR f.created_by IS NULL)));

DROP POLICY IF EXISTS food_portions_select ON public.food_portions;
CREATE POLICY food_portions_select ON public.food_portions
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS food_portions_write ON public.food_portions;
CREATE POLICY food_portions_write ON public.food_portions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.foods_v2 f WHERE f.id = food_id AND (f.created_by = auth.uid() OR f.created_by IS NULL)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.foods_v2 f WHERE f.id = food_id AND (f.created_by = auth.uid() OR f.created_by IS NULL)));

-- meals_v2, meal_items, food_logs, fitcal_daily_metrics: user-owned
DROP POLICY IF EXISTS meals_v2_owner ON public.meals_v2;
CREATE POLICY meals_v2_owner ON public.meals_v2
    FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS meal_items_owner ON public.meal_items;
CREATE POLICY meal_items_owner ON public.meal_items
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.meals_v2 m WHERE m.id = meal_id AND m.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.meals_v2 m WHERE m.id = meal_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS food_logs_owner ON public.food_logs;
CREATE POLICY food_logs_owner ON public.food_logs
    FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS fitcal_daily_metrics_owner ON public.fitcal_daily_metrics;
CREATE POLICY fitcal_daily_metrics_owner ON public.fitcal_daily_metrics
    FOR ALL TO authenticated
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =============================================================
-- 6. RPCs — CATÁLOGO
-- =============================================================

-- 6.1 Busca fuzzy com ranking (prioriza verified > generic > branded)
CREATE OR REPLACE FUNCTION public.search_foods_v2(
    q TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id           UUID,
    name         TEXT,
    brand        TEXT,
    kind         TEXT,
    verified     BOOLEAN,
    category     TEXT,
    calories_100g NUMERIC,
    protein_100g  NUMERIC,
    carbs_100g    NUMERIC,
    fat_100g      NUMERIC,
    default_portion_label TEXT,
    default_portion_grams NUMERIC,
    rank         REAL
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    WITH q_norm AS (SELECT lower(public.immutable_unaccent(q)) AS v),
    matched AS (
        SELECT
            f.id, f.name, f.brand, f.kind, f.verified, f.category,
            similarity(f.name_normalized, (SELECT v FROM q_norm)) AS sim
        FROM public.foods_v2 f
        WHERE f.name_normalized % (SELECT v FROM q_norm)
           OR f.name_normalized ILIKE '%' || (SELECT v FROM q_norm) || '%'
        ORDER BY
            f.verified DESC,
            CASE f.kind WHEN 'generic' THEN 0 WHEN 'branded' THEN 1 ELSE 2 END,
            similarity(f.name_normalized, (SELECT v FROM q_norm)) DESC
        LIMIT p_limit
    )
    SELECT
        m.id, m.name, m.brand, m.kind, m.verified, m.category,
        COALESCE((SELECT amount FROM food_nutrients WHERE food_id = m.id AND nutrient='calories'), 0),
        COALESCE((SELECT amount FROM food_nutrients WHERE food_id = m.id AND nutrient='protein_g'), 0),
        COALESCE((SELECT amount FROM food_nutrients WHERE food_id = m.id AND nutrient='carbs_g'), 0),
        COALESCE((SELECT amount FROM food_nutrients WHERE food_id = m.id AND nutrient='fat_g'), 0),
        (SELECT label FROM food_portions WHERE food_id = m.id AND is_default LIMIT 1),
        (SELECT grams FROM food_portions WHERE food_id = m.id AND is_default LIMIT 1),
        m.sim
    FROM matched m;
$$;

GRANT EXECUTE ON FUNCTION public.search_foods_v2(TEXT, INTEGER) TO authenticated;

-- 6.2 Retorna nutrientes completos e porções de um alimento
CREATE OR REPLACE FUNCTION public.get_food_detail(p_food_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'food', to_jsonb(f),
        'nutrients', COALESCE((SELECT jsonb_object_agg(n.nutrient, jsonb_build_object('amount', n.amount, 'unit', n.unit))
                               FROM food_nutrients n WHERE n.food_id = f.id), '{}'::jsonb),
        'portions', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.is_default DESC, p.sort_order)
                              FROM food_portions p WHERE p.food_id = f.id), '[]'::jsonb)
    )
    FROM foods_v2 f WHERE f.id = p_food_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_food_detail(UUID) TO authenticated;

-- =============================================================
-- 7. RPCs — LOG + MÉTRICAS
-- =============================================================

-- 7.1 Loga alimento já resolvendo nutrientes por 100g * gramas
CREATE OR REPLACE FUNCTION public.log_food(
    p_food_id   UUID,
    p_meal_type TEXT,
    p_grams     NUMERIC,
    p_log_date  DATE DEFAULT NULL,
    p_portion_id UUID DEFAULT NULL,
    p_quantity  NUMERIC DEFAULT NULL,
    p_source    TEXT DEFAULT 'search',
    p_notes     TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_food foods_v2%ROWTYPE;
    v_ratio NUMERIC;
    v_id UUID;
    v_date DATE := COALESCE(p_log_date, (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE);
    v_nut JSONB;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
    IF p_grams IS NULL OR p_grams <= 0 THEN RAISE EXCEPTION 'grams must be > 0'; END IF;

    SELECT * INTO v_food FROM foods_v2 WHERE id = p_food_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'food not found'; END IF;

    v_ratio := p_grams / 100.0;

    -- pega nutrientes em um objeto chave→valor
    SELECT jsonb_object_agg(nutrient, amount) INTO v_nut
    FROM food_nutrients WHERE food_id = p_food_id;
    v_nut := COALESCE(v_nut, '{}'::jsonb);

    INSERT INTO food_logs (
        user_id, food_id, portion_id, meal_type, log_date,
        name_snapshot, quantity, grams,
        calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg,
        source, notes
    ) VALUES (
        v_uid, p_food_id, p_portion_id, p_meal_type, v_date,
        v_food.name, p_quantity, p_grams,
        COALESCE((v_nut->>'calories')::NUMERIC, 0) * v_ratio,
        COALESCE((v_nut->>'protein_g')::NUMERIC, 0) * v_ratio,
        COALESCE((v_nut->>'carbs_g')::NUMERIC, 0) * v_ratio,
        COALESCE((v_nut->>'fat_g')::NUMERIC, 0) * v_ratio,
        COALESCE((v_nut->>'fiber_g')::NUMERIC, 0) * v_ratio,
        COALESCE((v_nut->>'sugar_g')::NUMERIC, 0) * v_ratio,
        COALESCE((v_nut->>'sodium_mg')::NUMERIC, 0) * v_ratio,
        p_source, p_notes
    ) RETURNING id INTO v_id;

    PERFORM public.recompute_fitcal_daily(v_uid, v_date);
    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_food(UUID, TEXT, NUMERIC, DATE, UUID, NUMERIC, TEXT, TEXT) TO authenticated;

-- 7.2 Loga alimento detectado pela IA — cria entry no catálogo se não existe
CREATE OR REPLACE FUNCTION public.log_food_from_ai(
    p_name      TEXT,
    p_meal_type TEXT,
    p_grams     NUMERIC,
    p_calories  NUMERIC,
    p_protein   NUMERIC,
    p_carbs     NUMERIC,
    p_fat       NUMERIC,
    p_confidence NUMERIC DEFAULT NULL,
    p_photo_url TEXT DEFAULT NULL,
    p_log_date  DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_food_id UUID;
    v_id UUID;
    v_date DATE := COALESCE(p_log_date, (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE);
    v_ratio NUMERIC := CASE WHEN p_grams > 0 THEN 100.0 / p_grams ELSE 1 END;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
    IF p_grams IS NULL OR p_grams <= 0 THEN RAISE EXCEPTION 'grams must be > 0'; END IF;

    -- Validação sanity (IA pode alucinar)
    IF p_calories < 0 OR p_calories > 900 * (p_grams/100) THEN
        RAISE EXCEPTION 'calories out of sane range for %g (% kcal)', p_grams, p_calories;
    END IF;

    -- Acha ou cria alimento no catálogo com source=ai_scan
    SELECT id INTO v_food_id FROM foods_v2
     WHERE source = 'ai_scan'
       AND created_by = v_uid
       AND lower(public.immutable_unaccent(name)) = lower(public.immutable_unaccent(p_name))
     LIMIT 1;

    IF v_food_id IS NULL THEN
        INSERT INTO foods_v2 (name, kind, source, locale, created_by)
        VALUES (p_name, 'user_custom', 'ai_scan', 'pt-BR', v_uid)
        RETURNING id INTO v_food_id;

        -- nutrientes por 100g
        INSERT INTO food_nutrients (food_id, nutrient, amount, unit) VALUES
            (v_food_id, 'calories',  p_calories * v_ratio, 'kcal'),
            (v_food_id, 'protein_g', p_protein  * v_ratio, 'g'),
            (v_food_id, 'carbs_g',   p_carbs    * v_ratio, 'g'),
            (v_food_id, 'fat_g',     p_fat      * v_ratio, 'g')
        ON CONFLICT (food_id, nutrient) DO NOTHING;

        INSERT INTO food_portions (food_id, label, grams, is_default)
        VALUES (v_food_id, 'porção IA', p_grams, TRUE)
        ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO food_logs (
        user_id, food_id, meal_type, log_date,
        name_snapshot, grams, calories, protein_g, carbs_g, fat_g,
        source, ai_confidence, photo_url
    ) VALUES (
        v_uid, v_food_id, p_meal_type, v_date,
        p_name, p_grams, p_calories, p_protein, p_carbs, p_fat,
        'ai_photo', p_confidence, p_photo_url
    ) RETURNING id INTO v_id;

    PERFORM public.recompute_fitcal_daily(v_uid, v_date);
    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_food_from_ai(TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, DATE) TO authenticated;

-- 7.3 Recalcula métricas diárias (torre + execution map)
CREATE OR REPLACE FUNCTION public.recompute_fitcal_daily(
    p_user_id UUID,
    p_date    DATE
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan RECORD;
    v_agg RECORD;
    v_water INTEGER;
    v_torre INTEGER := 0;
    v_exec INTEGER := 0;
    v_cal_pct NUMERIC;
    v_prot_pct NUMERIC;
BEGIN
    -- Plano ativo (tabela antiga, ainda é source of truth)
    SELECT daily_calories, protein_g, carbs_g, fat_g, water_ml
      INTO v_plan
      FROM nutrition_plans
     WHERE user_id = p_user_id AND is_active
     ORDER BY created_at DESC LIMIT 1;

    -- Agrega food_logs do dia
    SELECT
        COALESCE(SUM(calories),0) AS cals,
        COALESCE(SUM(protein_g),0) AS prot,
        COALESCE(SUM(carbs_g),0) AS carbs,
        COALESCE(SUM(fat_g),0) AS fat,
        COALESCE(SUM(fiber_g),0) AS fiber,
        COALESCE(SUM(sodium_mg),0) AS sodium,
        COUNT(*) AS cnt,
        COUNT(DISTINCT meal_type) AS meal_cnt
      INTO v_agg
      FROM food_logs
     WHERE user_id = p_user_id AND log_date = p_date;

    -- Água (tabela antiga)
    SELECT COALESCE(SUM(amount_ml),0) INTO v_water
      FROM water_logs
     WHERE user_id = p_user_id AND log_date = p_date;

    -- Torre Score (0-100)
    -- 40%: calorias dentro de ±15% da meta
    -- 20%: proteína ≥ 80% da meta
    -- 15%: ≥ 3 refeições logadas
    -- 15%: água ≥ 80% da meta
    -- 10%: fibra ≥ 20g
    IF v_plan.daily_calories IS NOT NULL AND v_plan.daily_calories > 0 THEN
        v_cal_pct := v_agg.cals / v_plan.daily_calories;
        IF v_cal_pct BETWEEN 0.85 AND 1.15 THEN v_torre := v_torre + 40;
        ELSIF v_cal_pct BETWEEN 0.70 AND 1.30 THEN v_torre := v_torre + 20;
        END IF;
    END IF;

    IF v_plan.protein_g IS NOT NULL AND v_plan.protein_g > 0 THEN
        v_prot_pct := v_agg.prot / v_plan.protein_g;
        IF v_prot_pct >= 0.8 THEN v_torre := v_torre + 20;
        ELSIF v_prot_pct >= 0.5 THEN v_torre := v_torre + 10;
        END IF;
    END IF;

    IF v_agg.meal_cnt >= 3 THEN v_torre := v_torre + 15;
    ELSIF v_agg.meal_cnt >= 2 THEN v_torre := v_torre + 8;
    END IF;

    IF v_plan.water_ml IS NOT NULL AND v_plan.water_ml > 0 THEN
        IF v_water >= v_plan.water_ml * 0.8 THEN v_torre := v_torre + 15;
        ELSIF v_water >= v_plan.water_ml * 0.5 THEN v_torre := v_torre + 7;
        END IF;
    END IF;

    IF v_agg.fiber >= 20 THEN v_torre := v_torre + 10;
    ELSIF v_agg.fiber >= 10 THEN v_torre := v_torre + 5;
    END IF;

    v_torre := LEAST(100, GREATEST(0, v_torre));

    -- Execution Level 0-4 para heatmap
    v_exec := CASE
        WHEN v_torre >= 85 THEN 4
        WHEN v_torre >= 65 THEN 3
        WHEN v_torre >= 40 THEN 2
        WHEN v_torre >= 15 THEN 1
        ELSE 0
    END;

    INSERT INTO fitcal_daily_metrics (
        user_id, log_date,
        total_calories, total_protein_g, total_carbs_g, total_fat_g,
        total_fiber_g, total_sodium_mg, water_ml,
        goal_calories, goal_protein_g, goal_carbs_g, goal_fat_g, goal_water_ml,
        torre_score, execution_level,
        entries_count, meals_logged, updated_at
    ) VALUES (
        p_user_id, p_date,
        v_agg.cals, v_agg.prot, v_agg.carbs, v_agg.fat,
        v_agg.fiber, v_agg.sodium, v_water,
        v_plan.daily_calories, v_plan.protein_g, v_plan.carbs_g, v_plan.fat_g, v_plan.water_ml,
        v_torre, v_exec,
        v_agg.cnt, v_agg.meal_cnt, NOW()
    )
    ON CONFLICT (user_id, log_date) DO UPDATE SET
        total_calories = EXCLUDED.total_calories,
        total_protein_g = EXCLUDED.total_protein_g,
        total_carbs_g = EXCLUDED.total_carbs_g,
        total_fat_g = EXCLUDED.total_fat_g,
        total_fiber_g = EXCLUDED.total_fiber_g,
        total_sodium_mg = EXCLUDED.total_sodium_mg,
        water_ml = EXCLUDED.water_ml,
        goal_calories = EXCLUDED.goal_calories,
        goal_protein_g = EXCLUDED.goal_protein_g,
        goal_carbs_g = EXCLUDED.goal_carbs_g,
        goal_fat_g = EXCLUDED.goal_fat_g,
        goal_water_ml = EXCLUDED.goal_water_ml,
        torre_score = EXCLUDED.torre_score,
        execution_level = EXCLUDED.execution_level,
        entries_count = EXCLUDED.entries_count,
        meals_logged = EXCLUDED.meals_logged,
        updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_fitcal_daily(UUID, DATE) TO authenticated;

-- Trigger: qualquer mudança em food_logs e water_logs recomputa o dia
CREATE OR REPLACE FUNCTION public.trg_fitcal_recompute()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_date DATE;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_uid := OLD.user_id; v_date := OLD.log_date;
    ELSE
        v_uid := NEW.user_id; v_date := NEW.log_date;
    END IF;
    PERFORM public.recompute_fitcal_daily(v_uid, v_date);
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_food_logs_recompute ON public.food_logs;
CREATE TRIGGER trg_food_logs_recompute
    AFTER INSERT OR UPDATE OR DELETE ON public.food_logs
    FOR EACH ROW EXECUTE FUNCTION public.trg_fitcal_recompute();

DROP TRIGGER IF EXISTS trg_water_logs_recompute ON public.water_logs;
CREATE TRIGGER trg_water_logs_recompute
    AFTER INSERT OR UPDATE OR DELETE ON public.water_logs
    FOR EACH ROW EXECUTE FUNCTION public.trg_fitcal_recompute();

-- =============================================================
-- 8. RPCs — HISTÓRICO LONGO PRAZO
-- =============================================================

-- 8.1 Execution Map: últimas N semanas para heatmap
CREATE OR REPLACE FUNCTION public.get_execution_map(p_weeks INTEGER DEFAULT 12)
RETURNS TABLE (log_date DATE, execution_level SMALLINT, torre_score SMALLINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT log_date, execution_level, torre_score
      FROM fitcal_daily_metrics
     WHERE user_id = auth.uid()
       AND log_date >= CURRENT_DATE - (p_weeks * 7)
     ORDER BY log_date ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_execution_map(INTEGER) TO authenticated;

-- 8.2 Intake vs Output chart (placeholder até ter activity real)
CREATE OR REPLACE FUNCTION public.get_intake_output(p_period TEXT DEFAULT 'week')
RETURNS TABLE (bucket DATE, intake NUMERIC, output NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        m.log_date AS bucket,
        m.total_calories AS intake,
        COALESCE((SELECT SUM(calories_burned) FROM activity_logs a WHERE a.user_id = m.user_id AND a.log_date = m.log_date), 0) AS output
      FROM fitcal_daily_metrics m
     WHERE m.user_id = auth.uid()
       AND m.log_date >= CURRENT_DATE - CASE p_period
            WHEN 'week' THEN 7
            WHEN 'month' THEN 30
            WHEN '3months' THEN 90
            WHEN 'year' THEN 365
            ELSE 7 END
     ORDER BY m.log_date ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_intake_output(TEXT) TO authenticated;

-- 8.3 Resumo do dia (substitui get_daily_summary)
CREATE OR REPLACE FUNCTION public.get_fitcal_daily(p_date DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    WITH d AS (SELECT COALESCE(p_date, (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE) AS dt),
    m AS (SELECT * FROM fitcal_daily_metrics WHERE user_id = auth.uid() AND log_date = (SELECT dt FROM d)),
    entries AS (
        SELECT meal_type, jsonb_agg(jsonb_build_object(
            'id', id, 'food_id', food_id, 'name', name_snapshot,
            'grams', grams, 'calories', calories,
            'protein_g', protein_g, 'carbs_g', carbs_g, 'fat_g', fat_g,
            'source', source, 'photo_url', photo_url, 'logged_at', logged_at
        ) ORDER BY logged_at) AS items
        FROM food_logs
        WHERE user_id = auth.uid() AND log_date = (SELECT dt FROM d)
        GROUP BY meal_type
    )
    SELECT jsonb_build_object(
        'date', (SELECT dt FROM d),
        'metrics', COALESCE((SELECT to_jsonb(m) FROM m), '{}'::jsonb),
        'entries', COALESCE((SELECT jsonb_object_agg(meal_type, items) FROM entries), '{}'::jsonb)
    );
$$;
GRANT EXECUTE ON FUNCTION public.get_fitcal_daily(DATE) TO authenticated;
