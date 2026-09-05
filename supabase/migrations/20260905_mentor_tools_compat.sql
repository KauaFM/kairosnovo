-- =============================================================
-- ORVAX — Remendo temporário: destrava as 2 ferramentas quebradas
--          do mentor SEM depender do deploy da Edge Function
--
-- Diagnóstico (conferido contra o banco real, não suposição):
--
--   add_transaction  gravava em  transactions.name   → NÃO EXISTE
--                    a coluna certa é  transactions.description
--   add_note         gravava em  user_notes.title    → NÃO EXISTE
--
-- Efeito: registrar gasto ou nota pelo mentor SEMPRE falhou, desde
-- que as ferramentas foram escritas. E como o modelo chama award_xp
-- separadamente, a pessoa ganhava XP por um lançamento que nunca
-- entrou — foi assim que o bug apareceu.
--
-- ⚠️ ISTO É TEMPORÁRIO. O certo é a Edge Function mandar o nome de
-- coluna correto — já corrigido em supabase/functions/mentor-chat/
-- index.ts, mas o deploy está travado num 403 de privilégio da conta.
-- Enquanto isso não sai, este remendo faz o insert quebrado passar.
--
-- Quando a função for publicada, ela passa a mandar `description` e
-- este remendo fica INERTE por si só (o gatilho só age quando vem
-- `name`). Para remover de vez, ver o rodapé.
-- =============================================================

BEGIN;

-- ─── transactions: aceita `name` como APELIDO de entrada ──────
-- A coluna existe só para o insert não ser recusado. O gatilho move
-- o valor para `description` e zera `name`, então nada duplicado é
-- guardado e o resto do app (gráficos, inferência de categoria,
-- listagem) continua lendo `description` como sempre.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS name text;

CREATE OR REPLACE FUNCTION public.tx_compat_name()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
    IF NEW.name IS NOT NULL THEN
        IF NEW.description IS NULL OR NEW.description = '' THEN
            NEW.description := NEW.name;
        END IF;
        NEW.name := NULL; -- description é a coluna de verdade
    END IF;
    RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_tx_compat_name ON public.transactions;
CREATE TRIGGER trg_tx_compat_name
    BEFORE INSERT OR UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.tx_compat_name();

-- ─── user_notes: passa a ter título ───────────────────────────
-- Aqui não é remendo torto: nota COM título é legítimo, e a Edge
-- Function já manda um (os primeiros 80 caracteres do texto). A
-- coluna é opcional, então nada que já existe quebra.
ALTER TABLE public.user_notes ADD COLUMN IF NOT EXISTS title text;

COMMIT;

-- ─── Conferência ──────────────────────────────────────────────
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'transactions' AND column_name IN ('name', 'description'))
    OR (table_name = 'user_notes'   AND column_name IN ('title', 'content')))
ORDER BY table_name, column_name;

-- =============================================================
-- PARA REMOVER depois que a Edge Function corrigida for publicada:
--
--   DROP TRIGGER IF EXISTS trg_tx_compat_name ON public.transactions;
--   DROP FUNCTION IF EXISTS public.tx_compat_name();
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS name;
--
-- (a coluna user_notes.title pode ficar — é útil de verdade)
-- =============================================================
