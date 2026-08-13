-- Subscriptions table for Stripe integration
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid()::text = user_id);

-- Only service role can insert/update
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON public.subscriptions(stripe_subscription_id);

CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage stripe events" ON public.stripe_events FOR ALL
  USING (auth.role() = 'service_role');

-- NowBuild pay-as-you-go credit wallet. Billing records are durable even though
-- generated project files use ephemeral cache by default.
CREATE TABLE IF NOT EXISTS public.credit_wallets (
  user_id TEXT PRIMARY KEY,
  balance_credits BIGINT NOT NULL DEFAULT 100 CHECK (balance_credits >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.credit_wallets(user_id) ON DELETE CASCADE,
  project_id TEXT,
  run_id TEXT UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('purchase', 'usage', 'refund', 'grant')),
  amount_credits BIGINT NOT NULL,
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  usage JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_purchases (
  checkout_session_id TEXT PRIMARY KEY,
  payment_intent_id TEXT,
  user_id TEXT NOT NULL,
  pack TEXT NOT NULL,
  credits BIGINT NOT NULL CHECK (credits > 0),
  amount_total BIGINT NOT NULL CHECK (amount_total >= 0),
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES public.credit_wallets(user_id) ON DELETE CASCADE,
  project_id TEXT,
  capability TEXT NOT NULL CHECK (capability IN ('text', 'image', 'video', 'speech', 'transcription')),
  model TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity BIGINT NOT NULL CHECK (quantity >= 0),
  provider_cost_usd NUMERIC(14, 8) NOT NULL DEFAULT 0 CHECK (provider_cost_usd >= 0),
  credits_charged BIGINT NOT NULL CHECK (credits_charged >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages wallets" ON public.credit_wallets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages ledger" ON public.credit_ledger FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages purchases" ON public.credit_purchases FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role manages AI usage" ON public.ai_usage_events FOR ALL USING (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created ON public.credit_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON public.ai_usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_project_created ON public.ai_usage_events(project_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.charge_credits(
  p_user_id TEXT,
  p_project_id TEXT,
  p_run_id TEXT,
  p_credits BIGINT,
  p_usage JSONB
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE current_balance BIGINT;
BEGIN
  IF p_credits <= 0 THEN RAISE EXCEPTION 'credits must be positive'; END IF;
  INSERT INTO credit_wallets(user_id) VALUES (p_user_id) ON CONFLICT DO NOTHING;
  IF EXISTS (SELECT 1 FROM credit_ledger WHERE run_id = p_run_id) THEN
    SELECT balance_credits INTO current_balance FROM credit_wallets WHERE user_id = p_user_id;
    RETURN current_balance;
  END IF;
  SELECT balance_credits INTO current_balance FROM credit_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF current_balance < p_credits THEN RAISE EXCEPTION 'insufficient credits'; END IF;
  current_balance := current_balance - p_credits;
  UPDATE credit_wallets SET balance_credits = current_balance, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO credit_ledger(user_id, project_id, run_id, kind, amount_credits, balance_after, usage)
  VALUES (p_user_id, p_project_id, p_run_id, 'usage', -p_credits, current_balance, p_usage);
  IF p_usage ? 'capability' THEN
    INSERT INTO ai_usage_events(run_id, user_id, project_id, capability, model, unit, quantity, provider_cost_usd, credits_charged)
    VALUES (
      p_run_id, p_user_id, p_project_id, p_usage->>'capability', p_usage->>'model',
      p_usage->>'unit', COALESCE((p_usage->>'quantity')::BIGINT, 0),
      COALESCE((p_usage->>'costUsd')::NUMERIC, 0), p_credits
    ) ON CONFLICT (run_id) DO NOTHING;
  END IF;
  RETURN current_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_credits(
  p_user_id TEXT,
  p_checkout_session_id TEXT,
  p_payment_intent_id TEXT,
  p_pack TEXT,
  p_credits BIGINT,
  p_amount_total BIGINT,
  p_currency TEXT
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE current_balance BIGINT;
BEGIN
  INSERT INTO credit_wallets(user_id) VALUES (p_user_id) ON CONFLICT DO NOTHING;
  INSERT INTO credit_purchases(checkout_session_id, payment_intent_id, user_id, pack, credits, amount_total, currency)
  VALUES (p_checkout_session_id, p_payment_intent_id, p_user_id, p_pack, p_credits, p_amount_total, p_currency)
  ON CONFLICT (checkout_session_id) DO NOTHING;
  IF NOT FOUND THEN
    SELECT balance_credits INTO current_balance FROM credit_wallets WHERE user_id = p_user_id;
    RETURN current_balance;
  END IF;
  UPDATE credit_wallets SET balance_credits = balance_credits + p_credits, updated_at = now()
  WHERE user_id = p_user_id RETURNING balance_credits INTO current_balance;
  INSERT INTO credit_ledger(user_id, run_id, kind, amount_credits, balance_after, usage)
  VALUES (p_user_id, 'stripe:' || p_checkout_session_id, 'purchase', p_credits, current_balance,
    jsonb_build_object('pack', p_pack, 'amount_total', p_amount_total, 'currency', p_currency));
  RETURN current_balance;
END;
$$;
