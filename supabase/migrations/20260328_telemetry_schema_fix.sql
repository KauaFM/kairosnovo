-- =============================================================
-- ORVAX — Fix schema mismatch: telemetry_metrics
-- O SQL original definiu (name, score, category), mas o frontend
-- acessa (title, value, unit, trend, status, type, metadata).
-- Esta migration adiciona as colunas que faltam.
-- =============================================================

ALTER TABLE public.telemetry_metrics
  ADD COLUMN IF NOT EXISTS title     TEXT,
  ADD COLUMN IF NOT EXISTS value     NUMERIC,
  ADD COLUMN IF NOT EXISTS unit      TEXT,
  ADD COLUMN IF NOT EXISTS trend     TEXT,
  ADD COLUMN IF NOT EXISTS status    TEXT,
  ADD COLUMN IF NOT EXISTS type      TEXT DEFAULT 'CORE_NODE',
  ADD COLUMN IF NOT EXISTS metadata  JSONB;
