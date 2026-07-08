-- ============================================================
-- ORVAX — Unificação da convenção de tipo de transação
-- 2026-07-08
--
-- Problema: dois módulos escreviam convenções diferentes na
-- mesma tabela `transactions`:
--   · Cofre (CapitalViewNew), agente WhatsApp e n8n → 'in' / 'out'
--   · Módulo Life OS (finance.ts, modal CRIAR → DINHEIRO) → 'income' / 'expense'
-- Resultado: cada tela só "enxergava" as transações da própria
-- convenção — saldos zerados com transações existentes.
--
-- Convenção CANÔNICA (a partir de agora): 'in' | 'out'.
-- O front já foi corrigido pra gravar 'in'/'out' e aceitar as
-- duas formas na leitura. Este script conserta os dados antigos.
-- ============================================================

-- 1) Converte linhas legadas pra convenção canônica
UPDATE public.transactions SET type = 'in'  WHERE type = 'income';
UPDATE public.transactions SET type = 'out' WHERE type = 'expense';

-- 2) Realtime: tabelas que faltavam na publication para o app
--    inteiro reagir a mudanças externas (agente n8n/WhatsApp,
--    outro dispositivo). transactions/financial_goals/habits já estão.
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.universal_events;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
