-- Persist onboarding progress per authenticated user
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  user_id uuid PRIMARY KEY,
  step integer NOT NULL DEFAULT 1,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Recreate policies (Postgres doesn't support CREATE POLICY IF NOT EXISTS)
DROP POLICY IF EXISTS "Users can view their onboarding session" ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Users can create their onboarding session" ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Users can update their onboarding session" ON public.onboarding_sessions;
DROP POLICY IF EXISTS "Users can delete their onboarding session" ON public.onboarding_sessions;

CREATE POLICY "Users can view their onboarding session"
ON public.onboarding_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their onboarding session"
ON public.onboarding_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their onboarding session"
ON public.onboarding_sessions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their onboarding session"
ON public.onboarding_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS update_onboarding_sessions_updated_at ON public.onboarding_sessions;
CREATE TRIGGER update_onboarding_sessions_updated_at
BEFORE UPDATE ON public.onboarding_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_updated_at ON public.onboarding_sessions(updated_at DESC);