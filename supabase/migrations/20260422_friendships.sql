-- =============================================================
-- ORVAX — Friendships (rede social do ranking)
-- Estrutura: 1 linha por pedido, status pending|accepted|blocked
-- Idempotente.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.friendships (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status    ON public.friendships(status);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.trg_friendships_touch() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS t_friendships_touch ON public.friendships;
CREATE TRIGGER t_friendships_touch
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.trg_friendships_touch();

-- ========== RLS ==========
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS friendships_select  ON public.friendships;
DROP POLICY IF EXISTS friendships_insert  ON public.friendships;
DROP POLICY IF EXISTS friendships_update  ON public.friendships;
DROP POLICY IF EXISTS friendships_delete  ON public.friendships;

CREATE POLICY friendships_select ON public.friendships
    FOR SELECT TO authenticated
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Só pode criar pedido em nome próprio
CREATE POLICY friendships_insert ON public.friendships
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = requester_id);

-- Só o destinatário pode aceitar/bloquear (mudar status)
CREATE POLICY friendships_update ON public.friendships
    FOR UPDATE TO authenticated
    USING (auth.uid() = addressee_id)
    WITH CHECK (auth.uid() = addressee_id);

-- Qualquer lado pode remover
CREATE POLICY friendships_delete ON public.friendships
    FOR DELETE TO authenticated
    USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- =============================================================
-- RPC: list_friends() → lista de perfis amigos aceitos
-- =============================================================
CREATE OR REPLACE FUNCTION public.list_friends()
RETURNS TABLE (
    friendship_id UUID,
    friend_id     UUID,
    full_name     TEXT,
    avatar_url    TEXT,
    xp            INT,
    streak_days   INT,
    since         TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not-authenticated'; END IF;
    RETURN QUERY
    SELECT
        f.id,
        CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END,
        p.full_name,
        p.avatar_url,
        COALESCE(p.xp, 0),
        COALESCE(p.streak_days, 0),
        f.updated_at
    FROM public.friendships f
    JOIN public.profiles p
      ON p.id = (CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END)
    WHERE f.status = 'accepted'
      AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
    ORDER BY COALESCE(p.xp, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_friends() TO authenticated;

-- =============================================================
-- RPC: list_friend_requests() → pedidos recebidos pendentes
-- =============================================================
CREATE OR REPLACE FUNCTION public.list_friend_requests()
RETURNS TABLE (
    friendship_id UUID,
    requester_id  UUID,
    full_name     TEXT,
    avatar_url    TEXT,
    xp            INT,
    created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not-authenticated'; END IF;
    RETURN QUERY
    SELECT
        f.id,
        f.requester_id,
        p.full_name,
        p.avatar_url,
        COALESCE(p.xp, 0),
        f.created_at
    FROM public.friendships f
    JOIN public.profiles p ON p.id = f.requester_id
    WHERE f.addressee_id = auth.uid()
      AND f.status = 'pending'
    ORDER BY f.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_friend_requests() TO authenticated;

-- =============================================================
-- RPC: search_users(q) → busca por nome (mínimo 2 chars)
-- Retorna perfis com status da amizade com o usuário atual
-- =============================================================
CREATE OR REPLACE FUNCTION public.search_users(q TEXT)
RETURNS TABLE (
    id            UUID,
    full_name     TEXT,
    avatar_url    TEXT,
    xp            INT,
    friend_status TEXT   -- 'none' | 'pending_out' | 'pending_in' | 'accepted' | 'self'
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not-authenticated'; END IF;
    IF q IS NULL OR LENGTH(TRIM(q)) < 2 THEN RETURN; END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.full_name,
        p.avatar_url,
        COALESCE(p.xp, 0),
        CASE
            WHEN p.id = auth.uid() THEN 'self'
            WHEN EXISTS (
                SELECT 1 FROM public.friendships f
                WHERE f.status = 'accepted'
                  AND ((f.requester_id = auth.uid() AND f.addressee_id = p.id)
                    OR (f.addressee_id = auth.uid() AND f.requester_id = p.id))
            ) THEN 'accepted'
            WHEN EXISTS (
                SELECT 1 FROM public.friendships f
                WHERE f.status = 'pending'
                  AND f.requester_id = auth.uid() AND f.addressee_id = p.id
            ) THEN 'pending_out'
            WHEN EXISTS (
                SELECT 1 FROM public.friendships f
                WHERE f.status = 'pending'
                  AND f.addressee_id = auth.uid() AND f.requester_id = p.id
            ) THEN 'pending_in'
            ELSE 'none'
        END
    FROM public.profiles p
    WHERE p.full_name ILIKE '%' || TRIM(q) || '%'
    ORDER BY COALESCE(p.xp, 0) DESC
    LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_users(TEXT) TO authenticated;
