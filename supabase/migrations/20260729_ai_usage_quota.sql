-- Cota diária de IA por usuário. Existe por dinheiro: o scanner de foto
-- custa ~4x um comando do VITALIS e não tinha limite nenhum.
-- Também serve de telemetria de custo (calls por função por dia).
CREATE TABLE IF NOT EXISTS public.ai_usage (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    fn      TEXT NOT NULL,          -- analyze-food | mentor-chat | nutri-coach
    day     DATE NOT NULL,
    calls   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, fn, day)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
-- Só leitura própria: quem escreve é a Edge Function (service_role, ignora RLS).
DROP POLICY IF EXISTS ai_usage_select_own ON public.ai_usage;
CREATE POLICY ai_usage_select_own ON public.ai_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Consome 1 unidade da cota de forma ATÔMICA. Se estourou, não incrementa.
-- Admin não tem cota (precisa testar o app sem esbarrar em limite).
CREATE OR REPLACE FUNCTION public.ai_quota_take(
    p_user  UUID,
    p_fn    TEXT,
    p_day   DATE,
    p_limit INTEGER
) RETURNS TABLE (allowed BOOLEAN, used INTEGER, quota INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_calls INTEGER;
    v_admin BOOLEAN;
BEGIN
    SELECT (role = 'admin') INTO v_admin FROM public.profiles WHERE id = p_user;
    IF COALESCE(v_admin, FALSE) THEN
        RETURN QUERY SELECT TRUE, 0, p_limit;
        RETURN;
    END IF;

    -- O WHERE no DO UPDATE é o que torna isso à prova de corrida: duas
    -- chamadas simultâneas não conseguem passar do teto.
    INSERT INTO public.ai_usage AS u (user_id, fn, day, calls)
    VALUES (p_user, p_fn, p_day, 1)
    ON CONFLICT (user_id, fn, day) DO UPDATE
        SET calls = u.calls + 1
        WHERE u.calls < p_limit
    RETURNING u.calls INTO v_calls;

    IF v_calls IS NULL THEN
        SELECT u2.calls INTO v_calls FROM public.ai_usage u2
        WHERE u2.user_id = p_user AND u2.fn = p_fn AND u2.day = p_day;
        RETURN QUERY SELECT FALSE, COALESCE(v_calls, 0), p_limit;
    ELSE
        RETURN QUERY SELECT TRUE, v_calls, p_limit;
    END IF;
END;
$$;

-- Ninguém além do servidor pode mexer na própria cota.
REVOKE ALL ON FUNCTION public.ai_quota_take(UUID, TEXT, DATE, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_quota_take(UUID, TEXT, DATE, INTEGER) TO service_role;
