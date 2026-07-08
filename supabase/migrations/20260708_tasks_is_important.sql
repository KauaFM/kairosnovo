-- ============================================================
-- ORVAX — Coluna is_important em tasks
-- 2026-07-08
--
-- O form "Registro Operacional" (Cofre → ExecutionBoard) sempre
-- enviou is_important no INSERT, mas a coluna nunca existiu no
-- banco → TODA criação por esse form falhava silenciosamente.
-- O front já foi corrigido (fallback sem a flag + erro visível);
-- esta migration cria a coluna pra flag de prioridade funcionar.
-- ============================================================

ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT false;
