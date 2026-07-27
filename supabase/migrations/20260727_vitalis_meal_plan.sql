-- VITALIS v3 — o plano alimentar que o AGENTE monta e mantém.
-- Antes o VITALIS só sugeria; agora ele tem onde escrever o plano do dia.
CREATE TABLE IF NOT EXISTS public.meal_plan_items (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day        DATE NOT NULL,
    slot       TEXT NOT NULL,          -- breakfast | lunch | snack | dinner
    position   SMALLINT NOT NULL DEFAULT 0,
    name       TEXT NOT NULL,
    portion    TEXT,                   -- medida caseira ("1 prato", "2 fatias")
    kcal       INTEGER NOT NULL DEFAULT 0,
    protein_g  INTEGER NOT NULL DEFAULT 0,
    carbs_g    INTEGER NOT NULL DEFAULT 0,
    fat_g      INTEGER NOT NULL DEFAULT 0,
    why        TEXT,
    status     TEXT NOT NULL DEFAULT 'planned',   -- planned | eaten | skipped
    eaten_at   TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meal_plan_user_day ON public.meal_plan_items (user_id, day, slot, position);

ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meal_plan_items_own ON public.meal_plan_items;
CREATE POLICY meal_plan_items_own ON public.meal_plan_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Log do que o agente EXECUTOU (transparência: a pessoa vê o que ele fez).
-- Só a Edge Function escreve aqui (service role) — o cliente apenas lê.
CREATE TABLE IF NOT EXISTS public.nutri_actions (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tool       TEXT NOT NULL,
    summary    TEXT NOT NULL,
    payload    JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nutri_actions_user ON public.nutri_actions (user_id, created_at DESC);

ALTER TABLE public.nutri_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nutri_actions_select_own ON public.nutri_actions;
CREATE POLICY nutri_actions_select_own ON public.nutri_actions
  FOR SELECT USING (auth.uid() = user_id);
