-- =============================================================
-- ORVAX — Coluna active_mentor em profiles
-- Armazena qual mentor o usuário selecionou no MentorConfig.jsx.
-- Lida pelo agente n8n/montar-contexto-v2.js para injetar o
-- system prompt correto (Atlas ou Aurora) em cada conversa.
-- =============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_mentor TEXT DEFAULT 'atlas';
