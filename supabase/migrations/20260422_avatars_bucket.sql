-- ============================================================
-- ORVAX — Avatars storage bucket + RLS
-- 2026-04-22
--
-- Garante que o bucket "avatars" existe (público) e que cada usuário
-- só pode sobrescrever a pasta com o próprio UUID como prefixo.
-- Idempotente — pode re-rodar sem quebrar.
-- ============================================================

-- 1. Cria o bucket (público para leitura)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Policies: leitura pública, escrita somente no próprio folder
DO $$ BEGIN
    CREATE POLICY "avatars_public_read" ON storage.objects
        FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "avatars_owner_insert" ON storage.objects
        FOR INSERT WITH CHECK (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "avatars_owner_update" ON storage.objects
        FOR UPDATE USING (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "avatars_owner_delete" ON storage.objects
        FOR DELETE USING (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Bucket food-photos (mesma lógica, para o FitCal)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'food-photos',
    'food-photos',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = 10485760,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DO $$ BEGIN
    CREATE POLICY "food_photos_public_read" ON storage.objects
        FOR SELECT USING (bucket_id = 'food-photos');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "food_photos_owner_insert" ON storage.objects
        FOR INSERT WITH CHECK (
            bucket_id = 'food-photos'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "food_photos_owner_delete" ON storage.objects
        FOR DELETE USING (
            bucket_id = 'food-photos'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Bucket vault-media (para o Cofre → Arquivo)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('vault-media', 'vault-media', true, 20971520) -- 20MB
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 20971520;

DO $$ BEGIN
    CREATE POLICY "vault_media_public_read" ON storage.objects
        FOR SELECT USING (bucket_id = 'vault-media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "vault_media_owner_insert" ON storage.objects
        FOR INSERT WITH CHECK (
            bucket_id = 'vault-media'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "vault_media_owner_delete" ON storage.objects
        FOR DELETE USING (
            bucket_id = 'vault-media'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
