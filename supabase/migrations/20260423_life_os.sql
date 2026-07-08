-- =============================================================
-- ORVAX — LIFE OS (Unified Life Aspects Layer)
-- =============================================================
-- Camada universal que unifica TUDO (tarefas, hábitos, metas,
-- eventos, finanças, saúde, corpo, nutrição, estudos, etc.)
-- em aspectos da vida com dashboards Power-BI style.
--
-- Estratégia: NÃO duplicar dados. Sobrepor as tabelas existentes
-- com um catálogo de aspectos + tabela polimórfica de links +
-- views/RPCs agregadoras.
-- =============================================================

-- -------------------------------------------------------------
-- 1) CATÁLOGO DE ASPECTOS DA VIDA
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.life_aspects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key          TEXT NOT NULL,
  label        TEXT NOT NULL,
  icon         TEXT,
  color        TEXT,
  description  TEXT,
  is_system    BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 100,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_life_aspects_user_key
  ON public.life_aspects (coalesce(user_id::text,''), key);

ALTER TABLE public.life_aspects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS la_select ON public.life_aspects;
CREATE POLICY la_select ON public.life_aspects
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS la_write ON public.life_aspects;
CREATE POLICY la_write ON public.life_aspects
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Templates de sistema (user_id NULL = disponível a todo usuário)
INSERT INTO public.life_aspects (user_id, key, label, icon, color, description, is_system, sort_order)
SELECT * FROM (VALUES
  (NULL::UUID, 'finance',        'Financas',          'Wallet',       '#22c55e', 'Renda, gastos, investimentos e metas financeiras',          true, 10),
  (NULL::UUID, 'career',         'Profissao',         'Briefcase',    '#3b82f6', 'Carreira, trabalho, projetos e desenvolvimento',             true, 20),
  (NULL::UUID, 'health',         'Saude',             'HeartPulse',   '#ef4444', 'Exames, consultas, medicacoes, sinais vitais',               true, 30),
  (NULL::UUID, 'body',           'Corpo',             'Dumbbell',     '#f97316', 'Treino, forca, composicao corporal, performance',            true, 40),
  (NULL::UUID, 'nutrition',      'Nutricao',          'Apple',        '#84cc16', 'Alimentacao, macros, hidratacao, suplementacao',             true, 50),
  (NULL::UUID, 'relationships',  'Relacionamentos',   'Heart',        '#ec4899', 'Familia, parceiro(a), amigos proximos',                      true, 60),
  (NULL::UUID, 'studies',        'Estudos',           'GraduationCap','#8b5cf6', 'Aprendizado formal, cursos, leitura, pesquisa',              true, 70),
  (NULL::UUID, 'mental',         'Mental',            'Brain',        '#06b6d4', 'Saude mental, emocoes, terapia, meditacao',                  true, 80),
  (NULL::UUID, 'spiritual',      'Espiritualidade',   'Sparkles',     '#eab308', 'Proposito, fe, praticas espirituais, reflexao',              true, 90),
  (NULL::UUID, 'productivity',   'Produtividade',     'Zap',          '#f59e0b', 'Tempo, foco, execucao, habitos operacionais',                true,100),
  (NULL::UUID, 'hobbies',        'Hobbies',           'Palette',      '#d946ef', 'Lazer, criatividade, passatempos',                           true,110),
  (NULL::UUID, 'social',         'Social',            'Users',        '#14b8a6', 'Comunidade, networking, vida social',                        true,120),
  (NULL::UUID, 'home',           'Casa',              'Home',         '#64748b', 'Lar, organizacao, manutencao, convivencia',                  true,130),
  (NULL::UUID, 'sustainability', 'Sustentabilidade',  'Leaf',         '#10b981', 'Impacto ambiental, consumo consciente',                      true,140)
) AS v(user_id,key,label,icon,color,description,is_system,sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.life_aspects la
   WHERE la.user_id IS NULL AND la.key = v.key
);

-- -------------------------------------------------------------
-- 2) LINKS POLIMORFICOS (entidade qualquer <-> aspecto)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aspect_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aspect_key    TEXT NOT NULL,
  source_table  TEXT NOT NULL,
  source_id     UUID NOT NULL,
  weight        NUMERIC NOT NULL DEFAULT 1.0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, aspect_key, source_table, source_id)
);

CREATE INDEX IF NOT EXISTS idx_aspect_links_user_aspect
  ON public.aspect_links (user_id, aspect_key);
CREATE INDEX IF NOT EXISTS idx_aspect_links_source
  ON public.aspect_links (source_table, source_id);

ALTER TABLE public.aspect_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS al_rw ON public.aspect_links;
CREATE POLICY al_rw ON public.aspect_links
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -------------------------------------------------------------
-- 3) EVENTOS UNIVERSAIS (agenda, lembretes, reunioes)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.universal_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  aspect_key        TEXT,
  event_type        TEXT NOT NULL DEFAULT 'event',
  location          TEXT,
  starts_at         TIMESTAMPTZ NOT NULL,
  ends_at           TIMESTAMPTZ,
  all_day           BOOLEAN NOT NULL DEFAULT false,
  recurrence        TEXT,
  rrule_until       DATE,
  remind_before_min INT,
  status            TEXT NOT NULL DEFAULT 'scheduled',
  color             TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ue_user_start  ON public.universal_events (user_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_ue_user_aspect ON public.universal_events (user_id, aspect_key);

ALTER TABLE public.universal_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ue_rw ON public.universal_events;
CREATE POLICY ue_rw ON public.universal_events
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -------------------------------------------------------------
-- 4) BOOTSTRAP — garante aspectos de sistema pro usuario
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_user_life_aspects(p_user UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $FN$
BEGIN
  INSERT INTO public.life_aspects (user_id, key, label, icon, color, description, is_system, sort_order)
  SELECT p_user, s.key, s.label, s.icon, s.color, s.description, true, s.sort_order
    FROM public.life_aspects s
   WHERE s.user_id IS NULL AND s.is_system = true
     AND NOT EXISTS (
       SELECT 1 FROM public.life_aspects la
        WHERE la.user_id = p_user AND la.key = s.key
     );
END;
$FN$;

-- -------------------------------------------------------------
-- 5) MAPA pillar -> aspect (compat com sistema antigo)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pillar_to_aspect(p_pillar TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $FN$
  SELECT CASE lower(coalesce(p_pillar,''))
    WHEN 'disciplina'     THEN 'productivity'
    WHEN 'consistencia'   THEN 'productivity'
    WHEN 'foco'           THEN 'productivity'
    WHEN 'energia'        THEN 'body'
    WHEN 'evolucao'       THEN 'studies'
    WHEN 'financas'       THEN 'finance'
    WHEN 'saude'          THEN 'health'
    WHEN 'corpo'          THEN 'body'
    WHEN 'nutricao'       THEN 'nutrition'
    WHEN 'profissao'      THEN 'career'
    WHEN 'carreira'       THEN 'career'
    WHEN 'estudos'        THEN 'studies'
    WHEN 'mental'         THEN 'mental'
    WHEN 'espiritual'     THEN 'spiritual'
    WHEN 'relacionamento' THEN 'relationships'
    WHEN 'social'         THEN 'social'
    WHEN 'casa'           THEN 'home'
    WHEN 'hobby'          THEN 'hobbies'
    ELSE 'productivity'
  END
$FN$;

-- -------------------------------------------------------------
-- 6) Trigger genericos de auto-link
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_link_aspect()
RETURNS TRIGGER LANGUAGE plpgsql AS $FN$
DECLARE v_aspect TEXT;
BEGIN
  v_aspect := public.pillar_to_aspect(NEW.pillar);
  PERFORM public.ensure_user_life_aspects(NEW.user_id);
  INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
  VALUES (NEW.user_id, v_aspect, TG_TABLE_NAME, NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$FN$;

CREATE OR REPLACE FUNCTION public.auto_link_finance()
RETURNS TRIGGER LANGUAGE plpgsql AS $FN$
BEGIN
  PERFORM public.ensure_user_life_aspects(NEW.user_id);
  INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
  VALUES (NEW.user_id, 'finance', TG_TABLE_NAME, NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$FN$;

CREATE OR REPLACE FUNCTION public.auto_link_nutrition()
RETURNS TRIGGER LANGUAGE plpgsql AS $FN$
BEGIN
  PERFORM public.ensure_user_life_aspects(NEW.user_id);
  INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
  VALUES (NEW.user_id, 'nutrition', TG_TABLE_NAME, NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$FN$;

CREATE OR REPLACE FUNCTION public.auto_link_body()
RETURNS TRIGGER LANGUAGE plpgsql AS $FN$
BEGIN
  PERFORM public.ensure_user_life_aspects(NEW.user_id);
  INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
  VALUES (NEW.user_id, 'body', TG_TABLE_NAME, NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$FN$;

CREATE OR REPLACE FUNCTION public.auto_link_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $FN$
DECLARE v_key TEXT;
BEGIN
  v_key := coalesce(NEW.aspect_key, 'productivity');
  PERFORM public.ensure_user_life_aspects(NEW.user_id);
  INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
  VALUES (NEW.user_id, v_key, 'universal_events', NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$FN$;

DROP TRIGGER IF EXISTS trg_habits_aspect ON public.habits;
CREATE TRIGGER trg_habits_aspect
  AFTER INSERT ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_aspect();

DROP TRIGGER IF EXISTS trg_tasks_aspect ON public.tasks;
CREATE TRIGGER trg_tasks_aspect
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_aspect();

DROP TRIGGER IF EXISTS trg_tx_aspect ON public.transactions;
CREATE TRIGGER trg_tx_aspect
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_finance();

DROP TRIGGER IF EXISTS trg_food_logs_aspect ON public.food_logs;
CREATE TRIGGER trg_food_logs_aspect
  AFTER INSERT ON public.food_logs
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_nutrition();

DROP TRIGGER IF EXISTS trg_weight_logs_aspect ON public.weight_logs;
CREATE TRIGGER trg_weight_logs_aspect
  AFTER INSERT ON public.weight_logs
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_body();

DROP TRIGGER IF EXISTS trg_water_logs_aspect ON public.water_logs;
CREATE TRIGGER trg_water_logs_aspect
  AFTER INSERT ON public.water_logs
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_nutrition();

DROP TRIGGER IF EXISTS trg_ue_aspect ON public.universal_events;
CREATE TRIGGER trg_ue_aspect
  AFTER INSERT ON public.universal_events
  FOR EACH ROW EXECUTE FUNCTION public.auto_link_event();

-- -------------------------------------------------------------
-- 7) BACKFILL dos dados ja existentes
-- -------------------------------------------------------------
INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
SELECT t.user_id, public.pillar_to_aspect(t.pillar), 'tasks', t.id
  FROM public.tasks t WHERE t.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
SELECT h.user_id, public.pillar_to_aspect(h.pillar), 'habits', h.id
  FROM public.habits h WHERE h.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
SELECT tx.user_id, 'finance', 'transactions', tx.id
  FROM public.transactions tx WHERE tx.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
SELECT fl.user_id, 'nutrition', 'food_logs', fl.id
  FROM public.food_logs fl
 WHERE fl.user_id IS NOT NULL
   AND fl.log_date >= current_date - INTERVAL '90 days'
ON CONFLICT DO NOTHING;

INSERT INTO public.aspect_links (user_id, aspect_key, source_table, source_id)
SELECT wl.user_id, 'body', 'weight_logs', wl.id
  FROM public.weight_logs wl WHERE wl.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------
-- 8) RPC — TAREFAS PENDENTES DO DIA (unificado)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_today_pending(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  kind         TEXT,
  source_id    UUID,
  title        TEXT,
  subtitle     TEXT,
  aspect_key   TEXT,
  starts_at    TIMESTAMPTZ,
  all_day      BOOLEAN,
  done         BOOLEAN,
  extra        JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $FN$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT 'task'::TEXT,
         t.id,
         t.title::TEXT,
         coalesce(t.category, t.pillar)::TEXT,
         public.pillar_to_aspect(t.pillar),
         NULL::TIMESTAMPTZ,
         true,
         (t.state = 'done'),
         jsonb_build_object(
           'pillar', t.pillar, 'state', t.state, 'category', t.category,
           'time_start', t.time_start, 'duration', t.duration
         )
    FROM public.tasks t
   WHERE t.user_id = v_uid
     AND t.scheduled_date = p_date;

  RETURN QUERY
  SELECT 'habit'::TEXT,
         h.id,
         h.title::TEXT,
         h.pillar::TEXT,
         public.pillar_to_aspect(h.pillar),
         NULL::TIMESTAMPTZ,
         true,
         EXISTS (SELECT 1 FROM public.habit_logs hl
                  WHERE hl.habit_id = h.id AND hl.user_id = v_uid
                    AND hl.logged_at::DATE = p_date),
         jsonb_build_object('pillar', h.pillar, 'xp_reward', h.xp_reward)
    FROM public.habits h
   WHERE h.user_id = v_uid AND h.active = true;

  RETURN QUERY
  SELECT CASE e.event_type
           WHEN 'meeting'     THEN 'meeting'
           WHEN 'appointment' THEN 'meeting'
           WHEN 'reminder'    THEN 'reminder'
           WHEN 'payment'     THEN 'payment'
           ELSE 'event' END::TEXT,
         e.id,
         e.title::TEXT,
         e.description::TEXT,
         coalesce(e.aspect_key, 'productivity'),
         e.starts_at,
         e.all_day,
         (e.status = 'done'),
         jsonb_build_object('location', e.location, 'ends_at', e.ends_at, 'type', e.event_type)
    FROM public.universal_events e
   WHERE e.user_id = v_uid
     AND e.starts_at::DATE = p_date
     AND e.status <> 'canceled';
END;
$FN$;

GRANT EXECUTE ON FUNCTION public.get_today_pending(DATE) TO authenticated;

-- -------------------------------------------------------------
-- 9) RPC — DASHBOARD POR ASPECTO
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_aspect_dashboard(
  p_aspect TEXT,
  p_days   INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $FN$
DECLARE
  v_uid          UUID := auth.uid();
  v_since        DATE := CURRENT_DATE - p_days;
  v_result       JSONB;
  v_counts       JSONB;
  v_series       JSONB;
  v_related      JSONB;
  v_aspect_info  JSONB;
  v_finance      JSONB;
  v_nutrition    JSONB;
  v_body         JSONB;
  v_tasks        JSONB;
  v_habits       JSONB;
BEGIN
  IF v_uid IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT jsonb_build_object(
    'key', key, 'label', label, 'icon', icon, 'color', color, 'description', description
  ) INTO v_aspect_info
    FROM public.life_aspects
   WHERE key = p_aspect AND (user_id = v_uid OR user_id IS NULL)
   ORDER BY user_id NULLS LAST
   LIMIT 1;

  SELECT jsonb_object_agg(source_table, cnt) INTO v_counts FROM (
    SELECT source_table, count(*) AS cnt
      FROM public.aspect_links
     WHERE user_id = v_uid AND aspect_key = p_aspect
       AND created_at::DATE >= v_since
     GROUP BY source_table
  ) q;

  SELECT jsonb_agg(jsonb_build_object('d', d, 'c', c) ORDER BY d) INTO v_series FROM (
    SELECT created_at::DATE AS d, count(*) AS c
      FROM public.aspect_links
     WHERE user_id = v_uid AND aspect_key = p_aspect
       AND created_at::DATE >= v_since
     GROUP BY created_at::DATE
  ) s;

  SELECT jsonb_agg(jsonb_build_object(
    'source_table', source_table,
    'source_id',    source_id,
    'created_at',   created_at
  ) ORDER BY created_at DESC) INTO v_related FROM (
    SELECT source_table, source_id, created_at
      FROM public.aspect_links
     WHERE user_id = v_uid AND aspect_key = p_aspect
     ORDER BY created_at DESC LIMIT 20
  ) r;

  v_result := jsonb_build_object(
    'aspect',  v_aspect_info,
    'range',   jsonb_build_object('since', v_since, 'until', CURRENT_DATE, 'days', p_days),
    'counts',  coalesce(v_counts, '{}'::jsonb),
    'series',  coalesce(v_series, '[]'::jsonb),
    'related', coalesce(v_related, '[]'::jsonb)
  );

  IF p_aspect = 'finance' THEN
    SELECT jsonb_build_object(
      'income',  coalesce(sum(CASE WHEN type='in'  THEN amount END),0),
      'expense', coalesce(sum(CASE WHEN type='out' THEN amount END),0),
      'balance', coalesce(sum(CASE WHEN type='in'  THEN amount ELSE -amount END),0),
      'n_tx',    count(*)
    ) INTO v_finance
      FROM public.transactions
     WHERE user_id = v_uid AND date >= v_since;
    v_result := v_result || jsonb_build_object('finance', v_finance);
  END IF;

  IF p_aspect = 'nutrition' THEN
    SELECT jsonb_build_object(
      'avg_calories', coalesce(avg(daily),0),
      'total_logs',   count(*)
    ) INTO v_nutrition FROM (
      SELECT log_date, sum(calories) AS daily
        FROM public.food_logs
       WHERE user_id = v_uid AND log_date >= v_since
       GROUP BY log_date
    ) q;
    v_result := v_result || jsonb_build_object('nutrition', v_nutrition);
  END IF;

  IF p_aspect = 'body' THEN
    SELECT jsonb_build_object(
      'latest_weight', (SELECT weight_kg FROM public.weight_logs
                          WHERE user_id = v_uid ORDER BY log_date DESC LIMIT 1),
      'delta_period',  (SELECT (max(weight_kg) - min(weight_kg)) FROM public.weight_logs
                          WHERE user_id = v_uid AND log_date >= v_since),
      'n_logs',        (SELECT count(*) FROM public.weight_logs
                          WHERE user_id = v_uid AND log_date >= v_since)
    ) INTO v_body;
    v_result := v_result || jsonb_build_object('body', v_body);
  END IF;

  IF p_aspect IN ('productivity','studies','career') THEN
    SELECT jsonb_build_object(
      'tasks_done',  count(*) FILTER (WHERE t.state='done'),
      'tasks_total', count(*)
    ) INTO v_tasks
    FROM public.tasks t
    JOIN public.aspect_links al ON al.source_table='tasks' AND al.source_id=t.id
    WHERE t.user_id = v_uid AND al.aspect_key = p_aspect
      AND t.scheduled_date >= v_since;
    v_result := v_result || jsonb_build_object('tasks', v_tasks);

    SELECT jsonb_build_object(
      'habits_count', count(DISTINCT h.id),
      'logs_period',  count(hl.id)
    ) INTO v_habits
    FROM public.habits h
    JOIN public.aspect_links al ON al.source_table='habits' AND al.source_id=h.id
    LEFT JOIN public.habit_logs hl ON hl.habit_id = h.id AND hl.logged_at::DATE >= v_since
    WHERE h.user_id = v_uid AND al.aspect_key = p_aspect;
    v_result := v_result || jsonb_build_object('habits', v_habits);
  END IF;

  RETURN v_result;
END;
$FN$;

GRANT EXECUTE ON FUNCTION public.get_aspect_dashboard(TEXT, INT) TO authenticated;

-- -------------------------------------------------------------
-- 10) RPC — LISTA DE ASPECTOS DO USUARIO (com contagens)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_life_aspects()
RETURNS TABLE (
  key          TEXT,
  label        TEXT,
  icon         TEXT,
  color        TEXT,
  description  TEXT,
  is_system    BOOLEAN,
  is_active    BOOLEAN,
  sort_order   INT,
  total_links  INT,
  recent_links INT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $FN$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  PERFORM public.ensure_user_life_aspects(v_uid);

  RETURN QUERY
  SELECT la.key, la.label, la.icon, la.color, la.description,
         la.is_system, la.is_active, la.sort_order,
         coalesce(tot.c, 0)::INT,
         coalesce(rec.c, 0)::INT
    FROM public.life_aspects la
    LEFT JOIN (
      SELECT aspect_key, count(*) AS c FROM public.aspect_links
       WHERE user_id = v_uid GROUP BY aspect_key
    ) tot ON tot.aspect_key = la.key
    LEFT JOIN (
      SELECT aspect_key, count(*) AS c FROM public.aspect_links
       WHERE user_id = v_uid AND created_at >= now() - INTERVAL '7 days'
       GROUP BY aspect_key
    ) rec ON rec.aspect_key = la.key
   WHERE la.user_id = v_uid OR la.user_id IS NULL
   ORDER BY la.sort_order, la.label;
END;
$FN$;

GRANT EXECUTE ON FUNCTION public.get_user_life_aspects() TO authenticated;

-- =============================================================
-- FIM — Life OS v1
-- =============================================================
