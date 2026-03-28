-- ============================================================
-- ORVAX — TABELAS FALTANDO + CORREÇÕES DE SCHEMA
-- Execute NO SUPABASE SQL EDITOR após os outros SQLs
-- ============================================================

-- ============================================================
-- 1. TRANSACTIONS (módulo financeiro — estava faltando!)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    category TEXT DEFAULT 'outros',
    date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transactions" ON public.transactions
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role full access transactions" ON public.transactions
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 2. FINANCIAL GOALS (metas financeiras — estava faltando!)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL,
    current_amount NUMERIC(12, 2) DEFAULT 0,
    deadline DATE,
    status TEXT DEFAULT 'ativa',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON public.financial_goals(user_id, status);
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own financial goals" ON public.financial_goals
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role full access financial_goals" ON public.financial_goals
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 3. ORVAX HÁBITOS (registrar_habito — estava faltando!)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orvax_habitos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    habit_name TEXT NOT NULL,
    completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, habit_name, completed_date)
);
CREATE INDEX IF NOT EXISTS idx_habitos_user_date ON public.orvax_habitos(user_id, completed_date DESC);
ALTER TABLE public.orvax_habitos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own habitos" ON public.orvax_habitos
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role full access orvax_habitos" ON public.orvax_habitos
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 4. TELEMETRY METRICS (scores atuais por pilar — estava faltando!)
-- Diferente de telemetry_history: esta guarda o estado ATUAL de cada pilar
-- ============================================================
CREATE TABLE IF NOT EXISTS public.telemetry_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    category TEXT DEFAULT 'principal',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_telemetry_metrics_user ON public.telemetry_metrics(user_id);
ALTER TABLE public.telemetry_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own telemetry metrics" ON public.telemetry_metrics
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role full access telemetry_metrics" ON public.telemetry_metrics
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. ORVAX WORKOUTS (separado da tabela workouts do GymRats!)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orvax_workouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    duration_min INTEGER,
    activity_type TEXT DEFAULT 'gym',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orvax_workouts_user ON public.orvax_workouts(user_id, created_at DESC);
ALTER TABLE public.orvax_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own orvax_workouts" ON public.orvax_workouts
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role full access orvax_workouts" ON public.orvax_workouts
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 6. MEDIA VAULT (cofre de mídias do usuário)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.media_vault (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type TEXT DEFAULT 'image',
    title TEXT,
    thumbnail TEXT,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_media_vault_user ON public.media_vault(user_id, created_at DESC);
ALTER TABLE public.media_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own media" ON public.media_vault
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role full access media_vault" ON public.media_vault
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 7. RANKING GROUPS (grupos de ranking social)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ranking_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.ranking_group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.ranking_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.ranking_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.ranking_group_members(user_id);
ALTER TABLE public.ranking_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own groups" ON public.ranking_groups
    FOR SELECT USING (
        owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.ranking_group_members m WHERE m.group_id = ranking_groups.id AND m.user_id = auth.uid())
    );
CREATE POLICY "Users create groups" ON public.ranking_groups
    FOR INSERT WITH CHECK (owner_id = auth.uid());
ALTER TABLE public.ranking_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own memberships" ON public.ranking_group_members
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role full access groups" ON public.ranking_groups
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access group_members" ON public.ranking_group_members
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- CORREÇÕES DE SCHEMA NAS TABELAS EXISTENTES
-- ============================================================

-- 8. tasks: time_start era NOT NULL e quebrava o n8n
ALTER TABLE public.tasks ALTER COLUMN time_start DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN time_start SET DEFAULT '';

-- 9. focus_sessions: adicionar coluna activity (n8n registra qual atividade foi feita)
ALTER TABLE public.focus_sessions
    ADD COLUMN IF NOT EXISTS activity TEXT;

-- 10. meal_entries: adicionar food_name (n8n não usa FK, usa texto direto)
ALTER TABLE public.meal_entries
    ADD COLUMN IF NOT EXISTS food_name TEXT;

-- 11. profiles: adicionar colunas usadas pelo n8n/app
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS last_whatsapp_interaction TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================
-- DONE! Todas as tabelas criadas e schemas corrigidos.
-- Execute e o banco estará 100% compatível com o app e o n8n.
-- ============================================================
