-- ============================================================
-- ORVAX — Goals: valores concretos em unidade real
-- 2026-04-22
--
-- Antes: meta tinha só "progress" (0-100%), o que não diz NADA
-- concreto ("10% de correr 10km" = ???)
--
-- Agora: adicionamos target_value (10), current_value (1), unit ("km")
-- e o progress vira uma coluna DERIVADA.
-- ============================================================

ALTER TABLE public.goals
    ADD COLUMN IF NOT EXISTS target_value NUMERIC,
    ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS frequency TEXT,
    ADD COLUMN IF NOT EXISTS intensity SMALLINT;

-- Backfill: se existe progress legado mas não target_value, assume alvo=100 e current=progress
UPDATE public.goals
   SET target_value = 100,
       current_value = COALESCE(progress, 0),
       unit = '%'
 WHERE target_value IS NULL;

-- Trigger para re-calcular progress sempre que current_value ou target_value mudar
CREATE OR REPLACE FUNCTION public.recalc_goal_progress()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.target_value IS NOT NULL AND NEW.target_value > 0 THEN
        NEW.progress := LEAST(100, GREATEST(0, ROUND((COALESCE(NEW.current_value, 0) / NEW.target_value) * 100)::INT));
    END IF;
    -- Auto-conclusão
    IF NEW.progress >= 100 AND (OLD IS NULL OR OLD.status <> 'completado') THEN
        NEW.status := 'completado';
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_goals_recalc_progress ON public.goals;
CREATE TRIGGER trg_goals_recalc_progress
    BEFORE INSERT OR UPDATE OF current_value, target_value ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.recalc_goal_progress();
