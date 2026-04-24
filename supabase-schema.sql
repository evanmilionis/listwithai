-- ListAI Database Schema
-- Run this in the Supabase SQL editor

-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  stripe_session_id TEXT,
  property_address TEXT NOT NULL,
  property_city TEXT NOT NULL,
  property_state TEXT NOT NULL DEFAULT 'FL',
  property_zip TEXT NOT NULL,
  beds INT NOT NULL,
  baths DECIMAL NOT NULL,
  sqft INT NOT NULL,
  condition_score INT NOT NULL CHECK (condition_score BETWEEN 1 AND 10),
  asking_price INT NOT NULL,
  target_close_date TEXT NOT NULL,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('homeowner', 'agent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  rentcast_data JSONB,
  report_output JSONB,
  sold_status TEXT NOT NULL DEFAULT 'unknown' CHECK (sold_status IN ('unknown', 'active', 'sold', 'withdrawn')),
  sold_price INT,
  sold_date TEXT,
  followup_stage INT NOT NULL DEFAULT 0,
  report_url TEXT
);

-- Agent subscriptions table
CREATE TABLE agent_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  reports_run INT NOT NULL DEFAULT 0
);

-- Indexes
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_customer_email ON reports(customer_email);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_stripe_session ON reports(stripe_session_id);
CREATE INDEX idx_agent_subscriptions_user_id ON agent_subscriptions(user_id);
CREATE INDEX idx_agent_subscriptions_stripe_customer ON agent_subscriptions(stripe_customer_id);

-- Leads table (sales funnel / abandoned cart tracking)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  email TEXT,
  name TEXT,
  phone TEXT,
  property_address TEXT,
  property_city TEXT,
  property_zip TEXT,
  beds INT,
  baths DECIMAL,
  sqft INT,
  asking_price INT,
  form_step_reached INT DEFAULT 1,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  notes TEXT,
  followup_count INT DEFAULT 0,
  last_followup_at TIMESTAMPTZ
);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_converted ON leads(converted);

-- Buyer inquiries (public property page contact submissions)
CREATE TABLE buyer_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  pre_approved BOOLEAN,
  financing_type TEXT,
  message TEXT,
  contacted BOOLEAN DEFAULT false,
  contacted_at TIMESTAMPTZ
);

CREATE INDEX idx_buyer_inquiries_report_id ON buyer_inquiries(report_id);
CREATE INDEX idx_buyer_inquiries_created_at ON buyer_inquiries(created_at DESC);

-- RLS policies
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_subscriptions ENABLE ROW LEVEL SECURITY;

-- Reports: agents can see their own reports
CREATE POLICY "Agents can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = user_id);

-- Reports: agents can insert their own reports
CREATE POLICY "Agents can insert own reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Reports: service role can do everything (for webhooks/API)
-- This is handled by using the service role key server-side

-- Agent subscriptions: users can view their own subscription (by user_id or email)
CREATE POLICY "Users can view own subscription"
  ON agent_subscriptions FOR SELECT
  USING (
    auth.uid() = user_id
    OR (user_id IS NULL AND email = auth.jwt()->>'email')
  );

-- Agent subscriptions: users can link their auth account to an unlinked subscription
CREATE POLICY "Users can link own subscription"
  ON agent_subscriptions FOR UPDATE
  USING (
    user_id IS NULL AND email = auth.jwt()->>'email'
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- ============================================================
-- MIGRATION: If the database already exists, run this instead:
-- ============================================================
-- ALTER TABLE agent_subscriptions ALTER COLUMN user_id DROP NOT NULL;
--
-- DROP POLICY IF EXISTS "Users can view own subscription" ON agent_subscriptions;
-- CREATE POLICY "Users can view own subscription"
--   ON agent_subscriptions FOR SELECT
--   USING (
--     auth.uid() = user_id
--     OR (user_id IS NULL AND email = auth.jwt()->>'email')
--   );
--
-- CREATE POLICY "Users can link own subscription"
--   ON agent_subscriptions FOR UPDATE
--   USING (
--     user_id IS NULL AND email = auth.jwt()->>'email'
--   )
--   WITH CHECK (
--     user_id = auth.uid()
--   );

-- ============================================================
-- MIGRATION: Homeowner subscriptions + HOA field (April 2026)
-- ============================================================

-- Homeowner subscriptions table
CREATE TABLE IF NOT EXISTS homeowner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_homeowner_subs_user_id ON homeowner_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_homeowner_subs_email ON homeowner_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_homeowner_subs_stripe ON homeowner_subscriptions(stripe_subscription_id);

ALTER TABLE homeowner_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homeowners can view own subscription"
  ON homeowner_subscriptions FOR SELECT
  USING (
    auth.uid() = user_id
    OR (user_id IS NULL AND email = auth.jwt()->>'email')
  );

CREATE POLICY "Homeowners can link own subscription"
  ON homeowner_subscriptions FOR UPDATE
  USING (user_id IS NULL AND email = auth.jwt()->>'email')
  WITH CHECK (user_id = auth.uid());

-- Add HOA monthly amount to reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS hoa_monthly_amount DECIMAL;

-- Add processed_events table for webhook idempotency (if not exists)
CREATE TABLE IF NOT EXISTS processed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
