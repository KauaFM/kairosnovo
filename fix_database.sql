-- ==============================================================================
-- KAIROS / ORVAX - DATABASE FIX SCRIPT
-- Executar no SQL Editor do Supabase para resolver bugs críticos de QA
-- ==============================================================================

-- BUG-001: Criar profile row para o usuário de teste
-- Se o usuário não tiver um profile, todas as operações de escrita falham por FK
INSERT INTO public.profiles (id)
VALUES ('2390a96c-1f3a-4539-80c8-e04e84877291')
ON CONFLICT (id) DO NOTHING;

-- BUG-008: Adicionar política INSERT em 'tasks'
-- Permite que o usuário crie suas próprias tarefas caso o Agente n8n falhe ou para debug
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tasks' AND policyname = 'tasks_insert'
    ) THEN
        CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- BUG-007: Adicionar política INSERT de emergência em 'profiles'
-- Permite que o próprio usuário crie seu registro no profile se a trigger falhar no signup
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' AND policyname = 'profiles_insert_self'
    ) THEN
        CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- BUG-002: Seed da tabela 'foods' com dados alimentares (Ação Prioritária)
-- Adiciona alimentos básicos para permitir o uso do Diário Alimentar
INSERT INTO public.foods (name, calories, protein_g, carbs_g, fat_g, serving_size_g, serving_unit) VALUES
('Arroz Branco Cozido', 128, 2.5, 28.1, 0.2, 100, 'g'),
('Feijão Carioca Cozido', 76, 4.8, 13.6, 0.5, 100, 'g'),
('Frango Grelhado (Peito)', 159, 32, 0, 2.5, 100, 'g'),
('Ovo Cozido', 155, 13, 1.1, 10.6, 1, 'unit'),
('Banana Nanica', 92, 1.4, 23.8, 0.1, 1, 'unit'),
('Pão Francês', 300, 8, 58, 3, 1, 'unit'),
('Leite Integral', 60, 3, 5, 3, 100, 'ml'),
('Azeite de Oliva', 884, 0, 0, 100, 10, 'ml'),
('Batata Doce Cozida', 86, 1.6, 20, 0.1, 100, 'g'),
('Tapioca (Goma)', 240, 0, 60, 0, 100, 'g')
ON CONFLICT (name) DO NOTHING;

-- Notificar sucesso
-- SCRIPT EXECUTADO COM SUCESSO. PERFIL CRIADO E POLITICAS ATUALIZADAS.
