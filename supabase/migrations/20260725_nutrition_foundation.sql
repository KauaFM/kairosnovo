-- ============================================================
-- ORVAX FitCal — VITALIS · N1 (Fundação nutricional)
-- 2026-07-25
--
-- O motor de TDEE (tdeeCalc.js) existia mas nunca era usado:
-- nutrition_plans tinha 0 linhas e a meta de calorias era digitada
-- na mão. Aqui entra o que faltava para o plano ser REAL e para o
-- VITALIS (copiloto) ter contexto de quem é a pessoa.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nutrition_preferences (
    user_id        UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Padrão alimentar
    diet_type      TEXT NOT NULL DEFAULT 'onivoro',  -- onivoro|vegetariano|vegano|low_carb|mediterranea
    allergies      TEXT[] DEFAULT '{}',              -- alergias/intolerâncias (lactose, glúten, amendoim…)
    dislikes       TEXT[] DEFAULT '{}',              -- o que a pessoa NÃO come por gosto
    -- Rotina real (o que faz o plano sobreviver ao dia a dia)
    meals_per_day  SMALLINT DEFAULT 4,
    cooks_at_home  TEXT DEFAULT 'as_vezes',          -- sempre|as_vezes|raramente
    eats_out_freq  TEXT DEFAULT 'as_vezes',          -- diario|as_vezes|raramente
    budget_level   TEXT DEFAULT 'medio',             -- baixo|medio|alto
    wake_time      TIME,
    sleep_time     TIME,
    train_time     TIME,
    notes          TEXT,                             -- contexto livre pro VITALIS
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nutrition_preferences_own ON public.nutrition_preferences;
CREATE POLICY nutrition_preferences_own ON public.nutrition_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Rastreia como o plano foi gerado (auditoria + o VITALIS explicar a meta)
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS source        TEXT DEFAULT 'auto';
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS goal          TEXT;
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS activity_level TEXT;
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS safety_floor  BOOLEAN DEFAULT FALSE; -- meta foi elevada pelo piso de segurança?
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT now();

-- upsert do plano ativo depende deste índice
CREATE UNIQUE INDEX IF NOT EXISTS uniq_nutrition_plan_active
  ON public.nutrition_plans (user_id) WHERE is_active;
