-- =============================================
-- FitCal Module - Complete Database Schema
-- =============================================

-- Adicionar colunas de nutrição ao profiles (se não existirem)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goal TEXT DEFAULT 'maintain';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderate';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_log_date DATE;

-- 1. NUTRITION PLANS TABLE
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_calories  INTEGER NOT NULL,
  protein_g       NUMERIC(6,1),
  carbs_g         NUMERIC(6,1),
  fat_g           NUMERIC(6,1),
  water_ml        INTEGER DEFAULT 2000,
  weight_kg       NUMERIC(5,1),
  bmr             INTEGER,
  tdee            INTEGER,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_user ON public.nutrition_plans(user_id, is_active);

-- 2. FOODS TABLE (banco de alimentos)
CREATE TABLE IF NOT EXISTS public.foods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  brand           TEXT,
  barcode         TEXT UNIQUE,
  serving_size_g  NUMERIC(7,2) DEFAULT 100,
  serving_unit    TEXT DEFAULT 'g',
  calories        NUMERIC(7,2) NOT NULL,
  protein_g       NUMERIC(6,2) DEFAULT 0,
  carbs_g         NUMERIC(6,2) DEFAULT 0,
  fat_g           NUMERIC(6,2) DEFAULT 0,
  fiber_g         NUMERIC(6,2) DEFAULT 0,
  sugar_g         NUMERIC(6,2) DEFAULT 0,
  sodium_mg       NUMERIC(7,2) DEFAULT 0,
  calcium_mg      NUMERIC(7,2),
  iron_mg         NUMERIC(6,2),
  vitamin_c_mg    NUMERIC(6,2),
  is_verified     BOOLEAN DEFAULT FALSE,
  created_by      UUID REFERENCES public.profiles(id),
  source          TEXT DEFAULT 'user',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_foods_barcode ON public.foods(barcode);
CREATE INDEX IF NOT EXISTS idx_foods_name ON public.foods USING gin(to_tsvector('portuguese', name));

-- 3. MEAL ENTRIES TABLE (diário alimentar)
CREATE TABLE IF NOT EXISTS public.meal_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  food_id         UUID REFERENCES public.foods(id),
  meal_type       TEXT NOT NULL,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity_g      NUMERIC(7,2) NOT NULL DEFAULT 100,
  calories        NUMERIC(7,2),
  protein_g       NUMERIC(6,2),
  carbs_g         NUMERIC(6,2),
  fat_g           NUMERIC(6,2),
  photo_url       TEXT,
  ai_confidence   NUMERIC(4,2),
  source          TEXT DEFAULT 'manual',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entries_user_date ON public.meal_entries(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_entries_meal_type ON public.meal_entries(user_id, log_date, meal_type);

-- 4. CUSTOM MEALS TABLE (refeições salvas)
CREATE TABLE IF NOT EXISTS public.custom_meals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  photo_url       TEXT,
  is_public       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.custom_meal_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id         UUID REFERENCES public.custom_meals(id) ON DELETE CASCADE,
  food_id         UUID REFERENCES public.foods(id),
  quantity_g      NUMERIC(7,2) NOT NULL
);

-- 5. WEIGHT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight_kg   NUMERIC(5,1) NOT NULL,
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- 6. WATER LOGS TABLE
CREATE TABLE IF NOT EXISTS public.water_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_ml   INTEGER NOT NULL DEFAULT 250,
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_water_user_date ON public.water_logs(user_id, log_date DESC);

-- 7. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_name   TEXT NOT NULL,
  duration_min    INTEGER,
  calories_burned INTEGER,
  steps           INTEGER,
  source          TEXT DEFAULT 'manual',
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 8. RECIPES TABLE
CREATE TABLE IF NOT EXISTS public.recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  photo_url       TEXT,
  prep_time_min   INTEGER,
  servings        INTEGER DEFAULT 1,
  total_calories  NUMERIC(7,2),
  total_protein   NUMERIC(6,2),
  total_carbs     NUMERIC(6,2),
  total_fat       NUMERIC(6,2),
  ingredients     JSONB,
  steps           TEXT[],
  tags            TEXT[],
  created_by      UUID REFERENCES public.profiles(id),
  is_community    BOOLEAN DEFAULT FALSE,
  likes_count     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 9. COMMUNITY GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.community_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  owner_id    UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  group_id    UUID REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.nutrition_plans  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_meals     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members    ENABLE ROW LEVEL SECURITY;

-- NUTRITION PLANS: somente o dono
CREATE POLICY "plan_select" ON public.nutrition_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plan_insert" ON public.nutrition_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plan_update" ON public.nutrition_plans FOR UPDATE USING (auth.uid() = user_id);

-- FOODS: leitura pública, inserção autenticada
CREATE POLICY "foods_select" ON public.foods FOR SELECT USING (true);
CREATE POLICY "foods_insert" ON public.foods FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- MEAL ENTRIES: somente o dono
CREATE POLICY "entries_select" ON public.meal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "entries_insert" ON public.meal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "entries_delete" ON public.meal_entries FOR DELETE USING (auth.uid() = user_id);

-- CUSTOM MEALS: somente o dono (ou públicas para leitura)
CREATE POLICY "custom_meals_select" ON public.custom_meals FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "custom_meals_insert" ON public.custom_meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "custom_meals_delete" ON public.custom_meals FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "custom_meal_items_select" ON public.custom_meal_items FOR SELECT USING (true);
CREATE POLICY "custom_meal_items_insert" ON public.custom_meal_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- WEIGHT LOGS: somente o dono
CREATE POLICY "weight_select" ON public.weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weight_insert" ON public.weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_update" ON public.weight_logs FOR UPDATE USING (auth.uid() = user_id);

-- WATER LOGS: somente o dono
CREATE POLICY "water_select" ON public.water_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "water_insert" ON public.water_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ACTIVITY LOGS: somente o dono
CREATE POLICY "activity_select" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activity_insert" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RECIPES: públicas visíveis para todos, privadas só do dono
CREATE POLICY "recipes_select" ON public.recipes FOR SELECT
  USING (is_community = true OR created_by = auth.uid());
CREATE POLICY "recipes_insert" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "recipes_update" ON public.recipes FOR UPDATE USING (auth.uid() = created_by);

-- COMMUNITY GROUPS: leitura pública
CREATE POLICY "groups_select" ON public.community_groups FOR SELECT USING (true);
CREATE POLICY "groups_insert" ON public.community_groups FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "group_members_select" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- RPC FUNCTIONS
-- =============================================

-- Resumo de calorias por intervalo de datas
CREATE OR REPLACE FUNCTION get_calorie_range(p_user UUID, p_start DATE, p_end DATE)
RETURNS TABLE(log_date DATE, total_cal NUMERIC) AS $$
  SELECT log_date, SUM(calories)
  FROM public.meal_entries
  WHERE user_id = p_user
    AND log_date BETWEEN p_start AND p_end
  GROUP BY log_date ORDER BY log_date;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Resumo diário completo
CREATE OR REPLACE FUNCTION get_daily_summary(p_user UUID, p_date DATE)
RETURNS JSONB AS $$
SELECT jsonb_build_object(
  'total_calories', COALESCE(SUM(calories), 0),
  'total_protein', COALESCE(SUM(protein_g), 0),
  'total_carbs', COALESCE(SUM(carbs_g), 0),
  'total_fat', COALESCE(SUM(fat_g), 0),
  'meal_count', COUNT(*)
)
FROM public.meal_entries
WHERE user_id = p_user AND log_date = p_date;
$$ LANGUAGE sql STABLE;

-- =============================================
-- STORAGE: criar bucket 'food-photos' manualmente no Supabase
-- =============================================
