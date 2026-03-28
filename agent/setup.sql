-- ============================================================
-- ORVAX AGENT - DATABASE SETUP
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- 1. ADICIONAR CAMPO DE MENTOR E TELEFONE NO PROFILES
-- ============================================================
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS selected_mentor TEXT DEFAULT 'atlas',
    ADD COLUMN IF NOT EXISTS phone_number TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_phone
    ON profiles(phone_number);

-- 2. HISTÓRICO DE CONVERSAS (MEMÓRIA DO AGENTE)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_phone TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',  -- text, audio, image
    media_url TEXT,                     -- URL da mídia original (se houver)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_history_phone
    ON conversation_history(user_phone, created_at DESC);

-- RLS: Edge Functions usam service_role key, então precisam de acesso total
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- Policy para o service_role (Edge Function) ter acesso completo
CREATE POLICY "Service role full access" ON conversation_history
    FOR ALL USING (true) WITH CHECK (true);

-- Policy para usuários lerem seu próprio histórico (caso queira mostrar no app)
CREATE POLICY "Users read own history" ON conversation_history
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- 3. TABELA DE AÇÕES DO AGENTE (LOG DE TUDO QUE O AGENTE FEZ)
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    user_phone TEXT NOT NULL,
    action_type TEXT NOT NULL,          -- create_task, add_xp, add_transaction, etc.
    action_data JSONB DEFAULT '{}',     -- payload da ação
    status TEXT DEFAULT 'completed',    -- completed, failed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access actions" ON agent_actions
    FOR ALL USING (true) WITH CHECK (true);

-- 4. FUNÇÃO HELPER: ADICIONAR XP E ATUALIZAR STREAK
-- ============================================================
CREATE OR REPLACE FUNCTION add_xp_and_update_streak(
    p_user_id UUID,
    p_xp_amount INTEGER,
    p_reason TEXT DEFAULT 'Ação completada'
)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_new_xp INTEGER;
    v_new_streak INTEGER;
    v_rank TEXT;
    v_rank_title TEXT;
BEGIN
    -- Buscar perfil atual
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Perfil não encontrado');
    END IF;

    -- Calcular novo XP
    v_new_xp := COALESCE(v_profile.xp, 0) + p_xp_amount;

    -- Calcular streak (se última atividade foi ontem, incrementa; se foi hoje, mantém; senão, reseta)
    v_new_streak := COALESCE(v_profile.streak_days, 0);

    -- Determinar rank baseado no XP
    IF v_new_xp >= 10000 THEN v_rank := 'S'; v_rank_title := 'SINGULARIDADE OMEGA';
    ELSIF v_new_xp >= 5000 THEN v_rank := 'A+'; v_rank_title := 'MESTRE DE SISTEMAS';
    ELSIF v_new_xp >= 2000 THEN v_rank := 'A'; v_rank_title := 'ARQUITETO DE DADOS';
    ELSIF v_new_xp >= 1000 THEN v_rank := 'B'; v_rank_title := 'OPERADOR SENIOR';
    ELSIF v_new_xp >= 500 THEN v_rank := 'C'; v_rank_title := 'ANALISTA ALPHA';
    ELSE v_rank := 'Ø'; v_rank_title := 'RECRUTA KRS';
    END IF;

    -- Atualizar perfil
    UPDATE profiles SET
        xp = v_new_xp,
        streak_days = v_new_streak,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'new_xp', v_new_xp,
        'xp_added', p_xp_amount,
        'streak', v_new_streak,
        'rank', v_rank,
        'rank_title', v_rank_title,
        'reason', p_reason
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
