-- ============================================================
-- ORVAX — Goals Table: garantir existência e todas as colunas
-- ============================================================

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS public.goals (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    progress    INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    deadline    DATE,
    status      TEXT DEFAULT 'ativo',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas faltantes se a tabela já existir
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS deadline     DATE;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.goals ALTER COLUMN status SET DEFAULT 'ativo';
ALTER TABLE public.goals ALTER COLUMN progress SET DEFAULT 0;

-- RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'goals_select' AND tablename = 'goals') THEN
    EXECUTE 'CREATE POLICY "goals_select" ON public.goals FOR SELECT USING (auth.uid() = user_id)';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'goals_insert' AND tablename = 'goals') THEN
    EXECUTE 'CREATE POLICY "goals_insert" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'goals_update' AND tablename = 'goals') THEN
    EXECUTE 'CREATE POLICY "goals_update" ON public.goals FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'goals_delete' AND tablename = 'goals') THEN
    EXECUTE 'CREATE POLICY "goals_delete" ON public.goals FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_goals_user_status ON public.goals (user_id, status);
