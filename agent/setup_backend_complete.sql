-- ============================================================
-- ORVAX - BACKEND COMPLETO - MIGRAÇÃO FINAL
-- Execute este SQL no Supabase SQL Editor
-- Inclui TUDO que faltava para o app ficar "redondo"
-- ============================================================

-- ============================================================
-- 1. BLOG / ARTIGOS
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    category TEXT DEFAULT 'geral',
    image_url TEXT,
    author_name TEXT DEFAULT 'ORVAX',
    author_avatar TEXT,
    read_time_min INTEGER DEFAULT 5,
    is_highlight BOOLEAN DEFAULT false,
    highlight_order INTEGER,
    published BOOLEAN DEFAULT true,
    tags TEXT[] DEFAULT '{}',
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_highlight ON blog_posts(is_highlight, highlight_order);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published posts" ON blog_posts
    FOR SELECT USING (published = true);
CREATE POLICY "Service role full access blog" ON blog_posts
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 2. CONQUISTAS / ACHIEVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,  -- ex: 'first_task', 'streak_7', 'xp_1000'
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '🏆',
    category TEXT DEFAULT 'geral',  -- geral, streak, xp, social, financial, focus
    xp_reward INTEGER DEFAULT 0,
    unlock_condition JSONB NOT NULL DEFAULT '{}',
    -- unlock_condition examples:
    -- {"type": "xp_total", "value": 1000}
    -- {"type": "streak_days", "value": 7}
    -- {"type": "tasks_completed", "value": 50}
    -- {"type": "focus_hours", "value": 10}
    -- {"type": "transactions_count", "value": 20}
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT REFERENCES achievements(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Service role full access achievements" ON achievements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own achievements" ON user_achievements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role full access user_achievements" ON user_achievements FOR ALL USING (true) WITH CHECK (true);

-- Seed de conquistas iniciais
INSERT INTO achievements (id, title, description, icon, category, xp_reward, unlock_condition, sort_order) VALUES
    ('first_login', 'Primeiro Acesso', 'Entrou no sistema pela primeira vez', '🚀', 'geral', 10, '{"type": "manual"}', 1),
    ('first_task', 'Primeira Missão', 'Completou sua primeira tarefa', '✅', 'geral', 20, '{"type": "tasks_completed", "value": 1}', 2),
    ('task_10', 'Operador Ativo', 'Completou 10 tarefas', '⚡', 'geral', 50, '{"type": "tasks_completed", "value": 10}', 3),
    ('task_50', 'Máquina de Execução', 'Completou 50 tarefas', '🔥', 'geral', 150, '{"type": "tasks_completed", "value": 50}', 4),
    ('task_100', 'Centurião', 'Completou 100 tarefas', '💎', 'geral', 300, '{"type": "tasks_completed", "value": 100}', 5),
    ('streak_3', 'Consistência Alpha', '3 dias seguidos de atividade', '🔗', 'streak', 30, '{"type": "streak_days", "value": 3}', 10),
    ('streak_7', 'Semana Perfeita', '7 dias seguidos de atividade', '🗓️', 'streak', 75, '{"type": "streak_days", "value": 7}', 11),
    ('streak_30', 'Disciplina Neural', '30 dias seguidos de atividade', '🧠', 'streak', 300, '{"type": "streak_days", "value": 30}', 12),
    ('streak_100', 'Inquebrantável', '100 dias seguidos', '👑', 'streak', 1000, '{"type": "streak_days", "value": 100}', 13),
    ('xp_100', 'Iniciado', 'Alcançou 100 XP', '⭐', 'xp', 0, '{"type": "xp_total", "value": 100}', 20),
    ('xp_500', 'Analista Alpha', 'Alcançou 500 XP', '🌟', 'xp', 0, '{"type": "xp_total", "value": 500}', 21),
    ('xp_1000', 'Operador Senior', 'Alcançou 1000 XP', '💫', 'xp', 0, '{"type": "xp_total", "value": 1000}', 22),
    ('xp_5000', 'Mestre de Sistemas', 'Alcançou 5000 XP', '🏅', 'xp', 0, '{"type": "xp_total", "value": 5000}', 23),
    ('xp_10000', 'Singularidade', 'Alcançou 10000 XP', '🔮', 'xp', 0, '{"type": "xp_total", "value": 10000}', 24),
    ('focus_1h', 'Foco Inicial', '1 hora de foco acumulado', '🎯', 'focus', 20, '{"type": "focus_hours", "value": 1}', 30),
    ('focus_10h', 'Deep Worker', '10 horas de foco acumulado', '🧘', 'focus', 100, '{"type": "focus_hours", "value": 10}', 31),
    ('focus_50h', 'Hiperfoco', '50 horas de foco acumulado', '⚙️', 'focus', 250, '{"type": "focus_hours", "value": 50}', 32),
    ('first_transaction', 'Primeiro Registro', 'Registrou primeira transação financeira', '💰', 'financial', 15, '{"type": "transactions_count", "value": 1}', 40),
    ('saver_10', 'Guardião', '10 transações de economia registradas', '🏦', 'financial', 75, '{"type": "savings_count", "value": 10}', 41),
    ('mentor_switch', 'Mente Aberta', 'Trocou de mentor pela primeira vez', '🔄', 'geral', 10, '{"type": "mentor_switches", "value": 1}', 50),
    ('first_audio', 'Voz Ativa', 'Enviou primeiro áudio para o agente', '🎤', 'geral', 15, '{"type": "audio_messages", "value": 1}', 51),
    ('agent_100', 'Parceiro de IA', '100 mensagens com o agente', '🤖', 'geral', 100, '{"type": "agent_messages", "value": 100}', 52),
    ('rank_c', 'Rank C Alcançado', 'Chegou ao rank C - Analista Alpha', '🏷️', 'xp', 0, '{"type": "rank", "value": "C"}', 60),
    ('rank_b', 'Rank B Alcançado', 'Chegou ao rank B - Operador Senior', '🏷️', 'xp', 0, '{"type": "rank", "value": "B"}', 61),
    ('rank_a', 'Rank A Alcançado', 'Chegou ao rank A - Arquiteto de Dados', '🏷️', 'xp', 0, '{"type": "rank", "value": "A"}', 62)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. SESSÕES DE FOCO (POMODORO/TIMER)
-- ============================================================
CREATE TABLE IF NOT EXISTS focus_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL,  -- duração configurada
    actual_minutes INTEGER,             -- duração real (pode ser menor se parou antes)
    completed BOOLEAN DEFAULT false,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- vinculado a uma tarefa (opcional)
    notes TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id, started_at DESC);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own focus sessions" ON focus_sessions
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role full access focus" ON focus_sessions
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 4. ATIVIDADE DIÁRIA (PARA WEEK STATUS E STREAK)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    tasks_completed INTEGER DEFAULT 0,
    tasks_total INTEGER DEFAULT 0,
    focus_minutes INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    transactions_logged INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,  -- mensagens ao agente
    active BOOLEAN DEFAULT true,       -- se o dia conta como "ativo" pro streak
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, activity_date DESC);

ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own activity" ON daily_activity
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role full access activity" ON daily_activity
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 5. METAS / GOALS (PARA TELEMETRIA)
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'geral',   -- biofisico, cognitivo, financeiro, social, etc.
    target_value NUMERIC,
    current_value NUMERIC DEFAULT 0,
    unit TEXT DEFAULT '%',           -- %, R$, horas, etc.
    progress INTEGER DEFAULT 0,      -- 0-100
    deadline DATE,
    status TEXT DEFAULT 'ativo',     -- ativo, completado, em_risco, pausado
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id, status);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON goals
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role full access goals" ON goals
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 6. HISTÓRICO DE MÉTRICAS TELEMETRIA (PARA RADAR CHART SEMANAL)
-- ============================================================
CREATE TABLE IF NOT EXISTS telemetry_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_key TEXT NOT NULL,        -- BioFisico, Cognitivo, Social, Espiritual, Digital
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, metric_key, recorded_date)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_history_user ON telemetry_history(user_id, recorded_date DESC);

ALTER TABLE telemetry_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own telemetry history" ON telemetry_history
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role full access telemetry_history" ON telemetry_history
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 7. NOTAS DO USUÁRIO (VAULT - ARCHIVE/NOTES)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'geral',
    pinned BOOLEAN DEFAULT false,
    color TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notes_user ON user_notes(user_id, pinned DESC, updated_at DESC);

ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notes" ON user_notes
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role full access notes" ON user_notes
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 8. ADICIONAR CAMPOS FALTANTES NO PROFILES
-- ============================================================
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS total_focus_minutes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tasks_completed INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_transactions INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_agent_messages INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_audio_messages INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mentor_switches INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- ============================================================
-- 9. FUNÇÕES HELPER
-- ============================================================

-- 9a. Registrar/Atualizar atividade diária
CREATE OR REPLACE FUNCTION update_daily_activity(
    p_user_id UUID,
    p_field TEXT,       -- 'tasks_completed', 'focus_minutes', 'xp_earned', etc.
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO daily_activity (user_id, activity_date)
    VALUES (p_user_id, CURRENT_DATE)
    ON CONFLICT (user_id, activity_date) DO NOTHING;

    EXECUTE format(
        'UPDATE daily_activity SET %I = %I + $1, updated_at = NOW() WHERE user_id = $2 AND activity_date = CURRENT_DATE',
        p_field, p_field
    ) USING p_increment, p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9b. Calcular streak real
CREATE OR REPLACE FUNCTION calculate_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_streak INTEGER := 0;
    v_check_date DATE := CURRENT_DATE;
    v_found BOOLEAN;
BEGIN
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM daily_activity
            WHERE user_id = p_user_id
            AND activity_date = v_check_date
            AND active = true
        ) INTO v_found;

        IF v_found THEN
            v_streak := v_streak + 1;
            v_check_date := v_check_date - 1;
        ELSE
            -- Se é hoje e não tem atividade ainda, pula pra ontem
            IF v_check_date = CURRENT_DATE AND v_streak = 0 THEN
                v_check_date := v_check_date - 1;
            ELSE
                EXIT;
            END IF;
        END IF;
    END LOOP;

    -- Atualizar o streak no profile
    UPDATE profiles SET streak_days = v_streak WHERE id = p_user_id;

    RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9c. Verificar e desbloquear conquistas
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_achievement RECORD;
    v_profile RECORD;
    v_count INTEGER;
    v_unlocked TEXT[] := '{}';
    v_condition JSONB;
    v_should_unlock BOOLEAN;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    IF NOT FOUND THEN RETURN '[]'::JSONB; END IF;

    FOR v_achievement IN
        SELECT a.* FROM achievements a
        WHERE NOT EXISTS (
            SELECT 1 FROM user_achievements ua
            WHERE ua.user_id = p_user_id AND ua.achievement_id = a.id
        )
    LOOP
        v_condition := v_achievement.unlock_condition;
        v_should_unlock := false;

        CASE v_condition->>'type'
            WHEN 'xp_total' THEN
                v_should_unlock := COALESCE(v_profile.xp, 0) >= (v_condition->>'value')::INTEGER;

            WHEN 'streak_days' THEN
                v_should_unlock := COALESCE(v_profile.streak_days, 0) >= (v_condition->>'value')::INTEGER;

            WHEN 'tasks_completed' THEN
                v_should_unlock := COALESCE(v_profile.total_tasks_completed, 0) >= (v_condition->>'value')::INTEGER;

            WHEN 'focus_hours' THEN
                v_should_unlock := COALESCE(v_profile.total_focus_minutes, 0) >= ((v_condition->>'value')::INTEGER * 60);

            WHEN 'transactions_count' THEN
                v_should_unlock := COALESCE(v_profile.total_transactions, 0) >= (v_condition->>'value')::INTEGER;

            WHEN 'agent_messages' THEN
                v_should_unlock := COALESCE(v_profile.total_agent_messages, 0) >= (v_condition->>'value')::INTEGER;

            WHEN 'audio_messages' THEN
                v_should_unlock := COALESCE(v_profile.total_audio_messages, 0) >= (v_condition->>'value')::INTEGER;

            WHEN 'mentor_switches' THEN
                v_should_unlock := COALESCE(v_profile.mentor_switches, 0) >= (v_condition->>'value')::INTEGER;

            WHEN 'rank' THEN
                -- Verificar se o rank atual >= rank alvo
                v_should_unlock := CASE
                    WHEN v_condition->>'value' = 'C' THEN COALESCE(v_profile.xp, 0) >= 500
                    WHEN v_condition->>'value' = 'B' THEN COALESCE(v_profile.xp, 0) >= 1000
                    WHEN v_condition->>'value' = 'A' THEN COALESCE(v_profile.xp, 0) >= 2000
                    ELSE false
                END;

            ELSE
                v_should_unlock := false;
        END CASE;

        IF v_should_unlock THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            VALUES (p_user_id, v_achievement.id)
            ON CONFLICT DO NOTHING;

            -- Dar XP da conquista
            IF v_achievement.xp_reward > 0 THEN
                UPDATE profiles SET xp = COALESCE(xp, 0) + v_achievement.xp_reward WHERE id = p_user_id;
            END IF;

            v_unlocked := array_append(v_unlocked, v_achievement.id);
        END IF;
    END LOOP;

    RETURN to_jsonb(v_unlocked);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9d. View: Resumo financeiro mensal (para charts no Capital)
CREATE OR REPLACE VIEW monthly_financial_summary AS
SELECT
    user_id,
    DATE_TRUNC('month', date::DATE) AS month,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
    SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS net,
    COUNT(*) AS transaction_count
FROM transactions
GROUP BY user_id, DATE_TRUNC('month', date::DATE)
ORDER BY month DESC;

-- ============================================================
-- 10. TRIGGERS AUTOMÁTICOS
-- ============================================================

-- Trigger: quando uma task é completada, atualizar contadores
CREATE OR REPLACE FUNCTION on_task_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.state = 'done' AND (OLD.state IS NULL OR OLD.state != 'done') THEN
        -- Atualizar atividade diária
        PERFORM update_daily_activity(NEW.user_id, 'tasks_completed', 1);

        -- Atualizar total no profile
        UPDATE profiles
        SET total_tasks_completed = COALESCE(total_tasks_completed, 0) + 1
        WHERE id = NEW.user_id;

        -- Verificar conquistas
        PERFORM check_achievements(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_task_completed ON tasks;
CREATE TRIGGER trigger_task_completed
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION on_task_completed();

-- Trigger: quando uma transação é criada, atualizar contadores
CREATE OR REPLACE FUNCTION on_transaction_created()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar atividade diária
    PERFORM update_daily_activity(NEW.user_id, 'transactions_logged', 1);

    -- Atualizar total no profile
    UPDATE profiles
    SET total_transactions = COALESCE(total_transactions, 0) + 1
    WHERE id = NEW.user_id;

    -- Verificar conquistas
    PERFORM check_achievements(NEW.user_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_transaction_created ON transactions;
CREATE TRIGGER trigger_transaction_created
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION on_transaction_created();

-- Trigger: quando uma sessão de foco é completada
CREATE OR REPLACE FUNCTION on_focus_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
        -- Atualizar atividade diária
        PERFORM update_daily_activity(NEW.user_id, 'focus_minutes', COALESCE(NEW.actual_minutes, NEW.duration_minutes));

        -- Atualizar total no profile
        UPDATE profiles
        SET total_focus_minutes = COALESCE(total_focus_minutes, 0) + COALESCE(NEW.actual_minutes, NEW.duration_minutes)
        WHERE id = NEW.user_id;

        -- Verificar conquistas
        PERFORM check_achievements(NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_focus_completed ON focus_sessions;
CREATE TRIGGER trigger_focus_completed
    AFTER UPDATE ON focus_sessions
    FOR EACH ROW
    EXECUTE FUNCTION on_focus_completed();

-- ============================================================
-- DONE! Backend completo e pronto para receber dados.
-- ============================================================
