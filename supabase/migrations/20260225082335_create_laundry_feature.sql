/*
  # Create Laundry Feature Tables

  1. New Tables
    - `laundry_providers` - Laundry service providers
      - `id` (uuid, PK), `name`, `phone`, `areas_served`, `rating`, `review_count`
      - `price_per_kg`, `is_active`, `avatar_url`
    - `laundry_orders` - User laundry orders
      - `id` (uuid, PK), `user_id`, `provider_id`
      - `weight_kg`, `pickup_address`, `delivery_address`, `delivery_type`
      - `express`, `eco_wash`, `total_price`, `status`
      - `rider_name`, `rider_phone`, `rider_rating`
      - `special_instructions`, `escrow_held`, `escrow_released_at`, `delivered_at`
    - `laundry_wallets` - User laundry wallet balances
    - `laundry_transactions` - Wallet transaction history
    - `laundry_passes` - Prepaid laundry passes
    - `laundry_preferences` - User laundry preferences

  2. Security
    - RLS enabled on all tables
    - Users can only access their own orders, wallets, transactions, passes, preferences
    - All authenticated users can view active providers
*/

-- Laundry providers
CREATE TABLE IF NOT EXISTS laundry_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  phone text,
  areas_served text[] NOT NULL DEFAULT '{}',
  rating numeric NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  price_per_kg numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active providers"
  ON laundry_providers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Laundry orders
CREATE TABLE IF NOT EXISTS laundry_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES laundry_providers(id) ON DELETE CASCADE,
  weight_kg numeric NOT NULL DEFAULT 0,
  pickup_address text NOT NULL DEFAULT '',
  delivery_address text NOT NULL DEFAULT '',
  delivery_type text NOT NULL DEFAULT 'door' CHECK (delivery_type IN ('door', 'drop_point')),
  express boolean NOT NULL DEFAULT false,
  eco_wash boolean NOT NULL DEFAULT false,
  total_price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'picked_up', 'washing', 'out_for_delivery', 'delivered', 'completed')),
  rider_name text,
  rider_phone text,
  rider_rating numeric,
  special_instructions text,
  escrow_held boolean NOT NULL DEFAULT false,
  escrow_released_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own laundry orders"
  ON laundry_orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create laundry orders"
  ON laundry_orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own laundry orders"
  ON laundry_orders FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Laundry wallets
CREATE TABLE IF NOT EXISTS laundry_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON laundry_wallets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own wallet"
  ON laundry_wallets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own wallet"
  ON laundry_wallets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Laundry transactions
CREATE TABLE IF NOT EXISTS laundry_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'topup' CHECK (type IN ('topup', 'debit', 'refund')),
  amount numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  reference text,
  balance_after numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON laundry_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own transactions"
  ON laundry_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Laundry passes
CREATE TABLE IF NOT EXISTS laundry_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'basic' CHECK (plan_name IN ('basic', 'standard', 'semester')),
  washes_total integer NOT NULL DEFAULT 0,
  washes_used integer NOT NULL DEFAULT 0,
  price_paid numeric NOT NULL DEFAULT 0,
  valid_from date NOT NULL,
  valid_until date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own passes"
  ON laundry_passes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own passes"
  ON laundry_passes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own passes"
  ON laundry_passes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Laundry preferences
CREATE TABLE IF NOT EXISTS laundry_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  detergent_type text NOT NULL DEFAULT 'regular' CHECK (detergent_type IN ('regular', 'sensitive', 'eco')),
  wash_temperature text NOT NULL DEFAULT 'cold' CHECK (wash_temperature IN ('cold', 'warm', 'hot')),
  fold_style text NOT NULL DEFAULT 'standard' CHECK (fold_style IN ('standard', 'flat', 'rolled')),
  ironing_enabled boolean NOT NULL DEFAULT false,
  default_instructions text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE laundry_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON laundry_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own preferences"
  ON laundry_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON laundry_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_laundry_orders_user ON laundry_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_laundry_orders_provider ON laundry_orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_laundry_transactions_user ON laundry_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_laundry_passes_user ON laundry_passes(user_id);
