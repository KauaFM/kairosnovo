-- =============================================================
-- ORVAX — Blog dinâmico + coluna role em profiles
-- =============================================================

-- 1. ROLE NO PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- =============================================================
-- 2. TABELA blog_posts
-- =============================================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  content          TEXT,
  summary          TEXT,
  category         TEXT,
  image_url        TEXT,
  author_name      TEXT DEFAULT 'ORVAX',
  author_avatar    TEXT,
  read_time_min    INTEGER DEFAULT 5,
  date_day         TEXT,                      -- ex: '24'
  date_month       TEXT,                      -- ex: 'MAR'
  is_highlight     BOOLEAN DEFAULT FALSE,
  highlight_order  INTEGER DEFAULT 0,
  published        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_feed
  ON public.blog_posts(published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_highlights
  ON public.blog_posts(published, is_highlight, highlight_order)
  WHERE is_highlight = TRUE;

-- =============================================================
-- 3. RLS
-- =============================================================
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa autenticada lê posts publicados
CREATE POLICY "blog_public_read" ON public.blog_posts
  FOR SELECT
  USING (published = TRUE);

-- Admin tem acesso total (leitura de rascunhos + escrita)
CREATE POLICY "blog_admin_all" ON public.blog_posts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
