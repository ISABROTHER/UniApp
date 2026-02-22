/*
  # Add Booking Payment Fields

  ## Summary
  Adds payment tracking fields to the bookings table and creates the owner_verifications
  table for Ghana Card identity verification workflow.

  ## Changes to bookings table
  - `payment_reference` (text): Paystack payment reference
  - `payment_status` (text): unpaid | paid | refunded | held
  - `paid_at` (timestamptz): When payment was confirmed
  - `payout_released_at` (timestamptz): When owner payout was released (delayed payout model)
  - `platform_fee` (numeric): StudentNest 2% platform fee amount
  - `processing_fee` (numeric): Paystack/MoMo processing fee amount

  ## Security
  - Existing RLS policies on bookings remain unchanged
*/

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'held')),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS platform_fee numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_fee numeric(10,2) DEFAULT 0;
