-- user_media: stores images/files forwarded via WhatsApp agent
CREATE TABLE IF NOT EXISTS public.user_media (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description text,
  tag         text DEFAULT 'other',
  url         text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_media ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_media'
    AND policyname = 'Users can manage their own media'
  ) THEN
    CREATE POLICY "Users can manage their own media"
      ON public.user_media
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
