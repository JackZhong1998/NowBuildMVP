CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage stripe events" ON public.stripe_events;
CREATE POLICY "Service role can manage stripe events" ON public.stripe_events FOR ALL
  USING (auth.role() = 'service_role');
