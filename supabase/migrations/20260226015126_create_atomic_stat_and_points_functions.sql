/*
  # Create atomic database functions for stats and loyalty points

  1. New Functions
    - `increment_user_stat(p_user_id uuid, p_field text)` - Atomically increments a user stat field by 1
    - `award_loyalty_points(p_user_id uuid, p_points int, p_reason text, p_reference_id uuid)` - Atomically awards points and updates balance/tier

  2. Purpose
    - Eliminates race conditions caused by read-then-write patterns in application code
    - Ensures stat increments and point awards are atomic operations

  3. Security
    - Functions execute with invoker's permissions (SECURITY INVOKER)
    - Relies on existing RLS policies on underlying tables
*/

CREATE OR REPLACE FUNCTION increment_user_stat(p_user_id uuid, p_field text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  INSERT INTO user_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  EXECUTE format(
    'UPDATE user_stats SET %I = %I + 1, last_active_at = now(), updated_at = now() WHERE user_id = $1',
    p_field, p_field
  ) USING p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION award_loyalty_points(
  p_user_id uuid,
  p_points int,
  p_reason text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_new_total int;
  v_new_lifetime int;
  v_tier text;
BEGIN
  INSERT INTO loyalty_balances (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO loyalty_points (user_id, transaction_type, points, reason, reference_id)
  VALUES (p_user_id, 'earn', p_points, p_reason, p_reference_id);

  UPDATE loyalty_balances
  SET
    total_points = total_points + p_points,
    lifetime_earned = lifetime_earned + p_points,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING total_points, lifetime_earned INTO v_new_total, v_new_lifetime;

  v_tier := CASE
    WHEN v_new_lifetime >= 5000 THEN 'platinum'
    WHEN v_new_lifetime >= 2000 THEN 'gold'
    WHEN v_new_lifetime >= 500 THEN 'silver'
    ELSE 'bronze'
  END;

  UPDATE loyalty_balances
  SET tier = v_tier
  WHERE user_id = p_user_id;
END;
$$;