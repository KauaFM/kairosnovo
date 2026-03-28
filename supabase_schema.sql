-- ==============================================================================
-- KAIROS / ORVAX - SUPABASE SCHEMA V1.0
-- Este script configura o banco de dados onde tudo é comandado pelo Agente n8n
-- ==============================================================================

-- 1. TABELA DE PERFIS (PROFILES)
-- Extensão da tabela de autenticação para guardar dados como WhatsApp
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  phone_number TEXT UNIQUE, -- CRUCIAL: Número do WhatsApp do n8n para pareamento
  full_name TEXT,
  is_first_login BOOLEAN DEFAULT TRUE, -- Controle do vídeo e onboarding
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security) para Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Usuários podem ler apenas o próprio perfil
CREATE POLICY "Usuários podem ver o próprio perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
-- Usuários podem atualizar o próprio perfil (ex: mudar is_first_login para FALSE após ver o vídeo)
CREATE POLICY "Usuários podem atualizar o próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- 2. TABELA DE CONFIGURAÇÃO DO APP (APP_SETTINGS)
-- O Agente n8n altera essa tabela via API para mudar a cara do app do usuário ao vivo
CREATE TABLE public.app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Controle de Interface imposto pelo Agente
  active_tabs JSONB DEFAULT '["nexus", "vault", "telemetry"]'::jsonb, -- Abas liberadas no momento
  daily_mission TEXT DEFAULT 'Nenhuma diretriz atribuída pelo Mentor.',
  theme_color TEXT DEFAULT '#22c55e', -- Cor principal (Orvax Green)
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- Usuário SÓ PODE LER. Quem atualiza é o n8n usando a Service Role Key do Supabase (ignora RLS)
CREATE POLICY "Usuário pode apenas ler sua configuração" ON public.app_settings FOR SELECT USING (auth.uid() = user_id);


-- 3. TABELA DE TAREFAS/AGENDA (TASKS)
-- As tarefas que aparecem no calendário. O Agente n8n cria e deleta elas usando a API.
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  category TEXT,
  time_start TEXT NOT NULL, -- Ex: "08:30"
  duration TEXT, -- Ex: "1h 30m"
  state TEXT DEFAULT 'pending', -- 'pending', 'active', 'done', 'failed'
  scheduled_date DATE DEFAULT CURRENT_DATE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
-- Usuários podem ver as tarefas enviadas pelo n8n
CREATE POLICY "Usuários podem ver suas tarefas" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
-- Usuários podem apenas MUDAR O ESTADO (ex: marcar como 'done' e avisar o n8n)
CREATE POLICY "Usuários podem alterar estado da tarefa" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);


-- 4. TABELA DE ANOTAÇÕES/RESPOSTAS DO USUÁRIO (NOTES)
-- Onde o usuário deposita informações no App. O n8n puxará daqui para analisar e agir no WhatsApp.
CREATE TABLE public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,          -- O que o usuário escreveu
  context_tag TEXT DEFAULT 'general', -- De qual parte do app a nota veio (ex: 'vault_reflection')
  is_read_by_agent BOOLEAN DEFAULT FALSE, -- O n8n usa isso pra saber se já processou
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
-- O usuário GERA (Insere) anotações e pode lê-las
CREATE POLICY "Usuário pode criar anotações" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário pode ver suas anotações" ON public.notes FOR SELECT USING (auth.uid() = user_id);


-- ==============================================================================
-- GATILHO (TRIGGER): Quando um novo usuário registrar na Auth, criar tabela no Profiles
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone_number, full_name)
  VALUES (new.id, new.phone, new.raw_user_meta_data->>'full_name');
  
  -- Cria uma configuração padrão para ele que o n8n vai sobreescrevendo depois
  INSERT INTO public.app_settings (user_id) VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
