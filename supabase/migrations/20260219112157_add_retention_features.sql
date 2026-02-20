/*
  # Retention Features Migration

  ## Summary
  Adds database tables to power user retention features:
  
  1. **user_activity_log** - Tracks user actions (hostel views, bookings, searches, service uses)
     - Used for the activity feed / recent history feature
     - Records action type, reference ID, metadata, and timestamp
  
  2. **user_stats** - Aggregated statistics per user (updated via triggers)
     - hostels_viewed, searches_performed, bookings_made, services_used, logins_count
     - Used for the personalized dashboard stats strip
  
  3. **loyalty_points** - Tracks earned and redeemed loyalty points
     - Each row = one transaction (earn or redeem)
     - Enables the reward/loyalty system
  
  4. **loyalty_balances** - Current point balance per user (denormalized for fast reads)
  
  5. **onboarding_steps** - Per-user onboarding completion tracker
     - profile_complete, first_search, first_favourite, first_booking, first_service_use
     - Used for the profile completion progress bar

  ## Security
  - RLS enabled on all tables
  - Users can only read/write their own records
*/

-- Activity Log
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  reference_id text NULL,
  reference_type text NULL,
  title text NOT NULL,
  subtitle text NULL,
  icon_name text NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON user_activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON user_activity_log(user_id, created_at DESC);

-- User Stats
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hostels_viewed integer DEFAULT 0,
  searches_performed integer DEFAULT 0,
  bookings_made integer DEFAULT 0,
  services_used integer DEFAULT 0,
  favourites_saved integer DEFAULT 0,
  logins_count integer DEFAULT 0,
  last_active_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Loyalty Points Transactions
CREATE TABLE IF NOT EXISTS loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'bonus', 'expire')),
  points integer NOT NULL,
  reason text NOT NULL,
  reference_id text NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty points"
  ON loyalty_points FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loyalty points"
  ON loyalty_points FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON loyalty_points(user_id, created_at DESC);

-- Loyalty Balances (denormalized)
CREATE TABLE IF NOT EXISTS loyalty_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points integer DEFAULT 0,
  lifetime_earned integer DEFAULT 0,
  tier text DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE loyalty_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loyalty balance"
  ON loyalty_balances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loyalty balance"
  ON loyalty_balances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loyalty balance"
  ON loyalty_balances FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Onboarding Steps
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_complete boolean DEFAULT false,
  first_search boolean DEFAULT false,
  first_favourite boolean DEFAULT false,
  first_booking boolean DEFAULT false,
  first_service_use boolean DEFAULT false,
  completed_at timestamptz NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding steps"
  ON onboarding_steps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding steps"
  ON onboarding_steps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding steps"
  ON onboarding_steps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
