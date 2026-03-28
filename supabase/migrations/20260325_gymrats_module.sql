-- =============================================
-- GymRats Module - Complete Database Schema
-- =============================================

-- 1. CHALLENGES TABLE
CREATE TABLE IF NOT EXISTS public.challenges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT,
  code             TEXT UNIQUE NOT NULL,
  owner_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  scoring_type     TEXT DEFAULT 'workouts',
  scoring_config   JSONB DEFAULT '{}',
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT TRUE,
  max_participants INTEGER,
  allow_teams      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenges_code ON public.challenges(code);
CREATE INDEX IF NOT EXISTS idx_challenges_owner ON public.challenges(owner_id);

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  color        TEXT DEFAULT '#E94560',
  created_by   UUID REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CHALLENGE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.challenge_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id      UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  role         TEXT DEFAULT 'member',
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_members_challenge ON public.challenge_members(challenge_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON public.challenge_members(user_id);

-- 4. WORKOUTS (CHECK-INS) TABLE
CREATE TABLE IF NOT EXISTS public.workouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  photo_url       TEXT,
  video_url       TEXT,
  duration_min    INTEGER,
  calories        INTEGER,
  steps           INTEGER,
  distance_km     NUMERIC(6,2),
  activity_type   TEXT DEFAULT 'gym',
  points          NUMERIC(8,2) DEFAULT 0,
  source          TEXT DEFAULT 'manual',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_challenge ON public.workouts(challenge_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_created ON public.workouts(created_at DESC);

-- 5. WORKOUT REACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.workout_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id  UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji       TEXT DEFAULT '👍',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workout_id, user_id)
);

-- 6. WORKOUT COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.workout_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id  UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MESSAGES (CHAT) TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_challenge ON public.messages(challenge_id, created_at DESC);

-- 8. PUSH TOKENS TABLE
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.challenges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_reactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens        ENABLE ROW LEVEL SECURITY;

-- CHALLENGES POLICIES
CREATE POLICY "challenges_select" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "challenges_insert" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "challenges_update" ON public.challenges FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "challenges_delete" ON public.challenges FOR DELETE USING (auth.uid() = owner_id);

-- CHALLENGE MEMBERS POLICIES
CREATE POLICY "challenge_members_select" ON public.challenge_members FOR SELECT USING (true);
CREATE POLICY "challenge_members_insert" ON public.challenge_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "challenge_members_delete" ON public.challenge_members FOR DELETE USING (auth.uid() = user_id);

-- TEAMS POLICIES
CREATE POLICY "teams_select" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams_insert" ON public.teams FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.challenge_members
    WHERE challenge_id = teams.challenge_id AND user_id = auth.uid()
  )
);

-- WORKOUTS POLICIES
CREATE POLICY "workouts_select" ON public.workouts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.challenge_members
    WHERE challenge_id = workouts.challenge_id AND user_id = auth.uid()
  ));
CREATE POLICY "workouts_insert" ON public.workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.challenge_members
    WHERE challenge_id = workouts.challenge_id AND user_id = auth.uid()
  ));
CREATE POLICY "workouts_update" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "workouts_delete" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- WORKOUT REACTIONS POLICIES
CREATE POLICY "workout_reactions_select" ON public.workout_reactions FOR SELECT USING (true);
CREATE POLICY "workout_reactions_insert" ON public.workout_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workout_reactions_delete" ON public.workout_reactions FOR DELETE USING (auth.uid() = user_id);

-- WORKOUT COMMENTS POLICIES
CREATE POLICY "workout_comments_select" ON public.workout_comments FOR SELECT USING (true);
CREATE POLICY "workout_comments_insert" ON public.workout_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- MESSAGES POLICIES
CREATE POLICY "messages_select" ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.challenge_members
    WHERE challenge_id = messages.challenge_id AND user_id = auth.uid()
  ));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- PUSH TOKENS POLICIES
CREATE POLICY "push_tokens_select" ON public.push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_tokens_insert" ON public.push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_tokens_delete" ON public.push_tokens FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- PERSONAL BESTS RPC FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION get_personal_bests(p_user_id UUID)
RETURNS JSONB AS $$
SELECT jsonb_build_object(
  'most_workouts_month', (
    SELECT COUNT(*) FROM public.workouts
    WHERE user_id = p_user_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
  ),
  'longest_workout', (
    SELECT MAX(duration_min) FROM public.workouts WHERE user_id = p_user_id
  ),
  'total_workouts', (
    SELECT COUNT(*) FROM public.workouts WHERE user_id = p_user_id
  ),
  'total_points', (
    SELECT COALESCE(SUM(points), 0) FROM public.workouts WHERE user_id = p_user_id
  )
)
$$ LANGUAGE sql STABLE;

-- =============================================
-- REALTIME - Enable for relevant tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
