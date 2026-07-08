-- =============================================================
-- ORVAX — Garante integridade profiles ↔ auth.users
-- =============================================================
-- Cobre três cenários:
--   1. Novos cadastros: trigger dispara ao INSERT em auth.users
--   2. Usuários existentes sem profile: backfill abaixo
--   3. Falha silenciosa do trigger: EXCEPTION no corpo evita
--      que um erro aqui impeça o cadastro do usuário
-- =============================================================

-- 1. SAFETY: garante colunas que o trigger precisa escrever
-- (idempotente — ADD COLUMN IF NOT EXISTS não falha se já existir)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- =============================================================
-- 2. FUNÇÃO handle_new_user()
-- SECURITY DEFINER: roda com privilégios do owner (postgres),
-- permitindo escrita em profiles mesmo com RLS ativo.
-- search_path fixo evita hijacking via schema malicioso.
-- ON CONFLICT DO NOTHING: idempotente se chamado mais de uma vez.
-- EXCEPTION: captura qualquer erro e loga como WARNING, garantindo
-- que uma falha aqui nunca bloqueie o signup do usuário.
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_first_login)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user() falhou para user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- =============================================================
-- 3. TRIGGER em auth.users
-- DROP IF EXISTS + CREATE: padrão idempotente para re-execuções
-- AFTER INSERT: dispara após o registro de auth ser confirmado
-- =============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- 4. BACKFILL: cria profiles para usuários já existentes em
--    auth.users que não têm row em profiles.
--    ON CONFLICT DO NOTHING: totalmente seguro re-executar.
--    is_first_login = FALSE: não exibe welcome video retroativo.
-- =============================================================
INSERT INTO public.profiles (id, email, role, is_first_login)
SELECT
  au.id,
  au.email,
  'user',
  FALSE
FROM auth.users AS au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;
