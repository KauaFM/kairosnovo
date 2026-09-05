-- =============================================================
-- ORVAX — Storage: conserta o RLS que impedia subir a foto
--
-- Sintoma: ao trocar a foto no Dossiê, o upload volta
--   "new row violates row-level security policy"
--
-- Isso é o RLS de storage.objects recusando o INSERT: o bucket
-- existe (senão o erro seria "Bucket not found"), mas nenhuma
-- política de escrita bateu. Ou seja, a 20260422_avatars_bucket.sql
-- provavelmente nunca foi aplicada neste projeto.
--
-- Por que não basta re-rodar aquela migration: ela cria cada
-- política dentro de um bloco com
--     EXCEPTION WHEN duplicate_object THEN NULL
-- que engole o erro quando a política JÁ existe. Se a que está lá
-- estiver errada, ela continua errada e a migration "passa" sem
-- consertar nada. Aqui eu derrubo e recrio, então o resultado é o
-- mesmo rodando uma ou dez vezes, e uma política torta é corrigida.
--
-- Regra: leitura pública (os buckets são públicos mesmo), e escrita
-- só na pasta cujo nome é o UUID do próprio usuário — o app grava em
-- "<user_id>/avatar.jpg", então storage.foldername(name))[1] é o
-- dono. Ninguém escreve na pasta de ninguém.
-- =============================================================

BEGIN;

-- ─── Garante os buckets (idempotente) ─────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = 5242880,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('food-photos', 'food-photos', true, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
    SET public = true,
        file_size_limit = 10485760,
        allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('vault-media', 'vault-media', true, 20971520)
ON CONFLICT (id) DO UPDATE
    SET public = true, file_size_limit = 20971520;

-- ─── AVATARS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "avatars_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete"  ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- upsert: true no cliente vira UPDATE quando o arquivo já existe.
-- Precisa de USING (achar a linha) e WITH CHECK (validar a nova).
CREATE POLICY "avatars_owner_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "avatars_owner_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ─── FOOD-PHOTOS (scanner do FitCal) ──────────────────────────
DROP POLICY IF EXISTS "food_photos_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "food_photos_owner_insert"  ON storage.objects;
DROP POLICY IF EXISTS "food_photos_owner_update"  ON storage.objects;
DROP POLICY IF EXISTS "food_photos_owner_delete"  ON storage.objects;

CREATE POLICY "food_photos_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'food-photos');

CREATE POLICY "food_photos_owner_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'food-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "food_photos_owner_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'food-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'food-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "food_photos_owner_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'food-photos'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ─── VAULT-MEDIA (Cofre → Arquivo) ────────────────────────────
DROP POLICY IF EXISTS "vault_media_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "vault_media_owner_insert"  ON storage.objects;
DROP POLICY IF EXISTS "vault_media_owner_update"  ON storage.objects;
DROP POLICY IF EXISTS "vault_media_owner_delete"  ON storage.objects;

CREATE POLICY "vault_media_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'vault-media');

CREATE POLICY "vault_media_owner_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'vault-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "vault_media_owner_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'vault-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
        bucket_id = 'vault-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "vault_media_owner_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'vault-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

COMMIT;

-- ─── Conferência ──────────────────────────────────────────────
-- O resultado abaixo é o que aparece no SQL Editor. Esperado: 12
-- linhas (4 políticas para cada um dos 3 buckets).
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (policyname LIKE 'avatars%' OR policyname LIKE 'food_photos%' OR policyname LIKE 'vault_media%')
ORDER BY policyname;
