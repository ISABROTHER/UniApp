/*
  # Create Retention Feature Tables

  1. New Tables
    - `user_activity_logs` - Activity/event logs per user
      - `id` (uuid, PK), `user_id`, `action_type`, `reference_id`, `reference_type`
      - `title`, `subtitle`, `icon_name`
    - `user_stats` - Aggregated user statistics
      - `id` (uuid, PK), `user_id` (unique)
      - `hostels_viewed`, `searches_performed`, `bookings_made`
      - `services_used`, `favourites_saved`, `logins_count`, `last_active_at`
    - `loyalty_points` - Loyalty point transactions
      - `id` (uuid, PK), `user_id`
      - `transaction_type`, `points`, `reason`, `reference_id`
    - `loyalty_balances` - Current loyalty balance/tier per user
      - `id` (uuid, PK), `user_id` (unique)
      - `total_points`, `lifetime_earned`, `tier`
    - `onboarding_steps` - Onboarding progress per user
      - `id` (uuid, PK), `user_id` (unique)
      - `profile_complete`, `first_search`, `first_favourite`, `first_booking`, `first_service_use`
      - `completed_at`

  2. Security
    - RLS enabled on all tables
    - Users can only access their own data
*/

-- User activity logs
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  action_type text NOT NULL DEFAULT '',
  reference_id text,
  reference_type text,
  title text NOT NULL DEFAULT '',
  subtitle text,
  icon_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON user_activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity"
  ON user_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User stats
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  hostels_viewed integer NOT NULL DEFAULT 0,
  searches_performed integer NOT NULL DEFAULT 0,
  bookings_made integer NOT NULL DEFAULT 0,
  services_used integer NOT NULL DEFAULT 0,
  favourites_saved integer NOT NULL DEFAULT 0,
  logins_count integer NOT NULL DEFAULT 0,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Loyalty points
CREATE TABLE IF NOT EXISTS loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  transaction_type text NOT NULL DEFAULT 'earn' CHECK (transaction_type IN ('earn', 'redeem', 'bonus', 'expire')),
  points integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty points"
  ON loyalty_points FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own loyalty points"
  ON loyalty_points FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Loyalty balances
CREATE TABLE IF NOT EXISTS loyalty_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  total_points integer NOT NULL DEFAULT 0,
  lifetime_earned integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE loyalty_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty balance"
  ON loyalty_balances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own loyalty balance"
  ON loyalty_balances FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own loyalty balance"
  ON loyalty_balances FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Onboarding steps
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  profile_complete boolean NOT NULL DEFAULT false,
  first_search boolean NOT NULL DEFAULT false,
  first_favourite boolean NOT NULL DEFAULT false,
  first_booking boolean NOT NULL DEFAULT false,
  first_service_use boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding"
  ON onboarding_steps FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding"
  ON onboarding_steps FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding"
  ON onboarding_steps FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON loyalty_points(user_id);
