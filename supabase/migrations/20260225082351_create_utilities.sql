/*
  # Create Utilities Tables

  1. New Tables
    - `utility_meters` - User registered utility meters (ECG/GWCL)
      - `id` (uuid, PK)
      - `user_id` (uuid, references members)
      - `meter_type` (ecg or gwcl), `meter_number`, `nickname`, `is_default`
    - `utility_topups` - Utility top-up records
      - `id` (uuid, PK)
      - `user_id` (uuid, references members)
      - `meter_id` (uuid, references utility_meters)
      - `meter_type`, `amount`, `vend_token`, `status`, `payment_reference`

  2. Security
    - RLS enabled on all tables
    - Users can only manage their own meters and topups
*/

-- Utility meters
CREATE TABLE IF NOT EXISTS utility_meters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  meter_type text NOT NULL CHECK (meter_type IN ('ecg', 'gwcl')),
  meter_number text NOT NULL DEFAULT '',
  nickname text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE utility_meters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meters"
  ON utility_meters FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own meters"
  ON utility_meters FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own meters"
  ON utility_meters FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own meters"
  ON utility_meters FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Utility topups
CREATE TABLE IF NOT EXISTS utility_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  meter_id uuid NOT NULL REFERENCES utility_meters(id) ON DELETE CASCADE,
  meter_type text NOT NULL CHECK (meter_type IN ('ecg', 'gwcl')),
  amount numeric NOT NULL DEFAULT 0,
  vend_token text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE utility_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topups"
  ON utility_topups FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own topups"
  ON utility_topups FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own topups"
  ON utility_topups FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_utility_meters_user ON utility_meters(user_id);
CREATE INDEX IF NOT EXISTS idx_utility_topups_user ON utility_topups(user_id);
CREATE INDEX IF NOT EXISTS idx_utility_topups_meter ON utility_topups(meter_id);
