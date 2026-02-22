/*
  # Add Owner Verification Workflow

  ## Summary
  Creates the owner_verifications table for Ghana Card identity verification,
  and adds id verification fields to the members table.

  ## New Tables
  - `owner_verifications`: Stores Ghana Card verification submissions from hostel owners
    - `owner_id`: Reference to auth.users
    - `ghana_card_number`: The Ghana Card ID number
    - `front_image_url`: URL to front of Ghana Card (stored in Supabase Storage)
    - `back_image_url`: URL to back of Ghana Card
    - `status`: pending | approved | rejected | requires_resubmission
    - `reviewer_notes`: Admin notes on review
    - `submitted_at`, `reviewed_at`, `reviewed_by`: Audit trail

  ## Changes to members table
  - `ghana_card_number` (text): Quick reference for Ghana Card number
  - `id_verified` (boolean): Whether identity has been verified by admin
  - `id_verified_at` (timestamptz): When verification was approved

  ## Security
  - RLS enabled on owner_verifications
  - Owners can only view/insert their own verification records
  - All authenticated users can read (for admin checks)
*/

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS ghana_card_number text,
  ADD COLUMN IF NOT EXISTS id_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS id_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS owner_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ghana_card_number text,
  front_image_url text,
  back_image_url text,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'requires_resubmission')),
  reviewer_notes text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE owner_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own verification"
  ON owner_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can submit verification"
  ON owner_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own pending verification"
  ON owner_verifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id AND status IN ('pending', 'requires_resubmission'))
  WITH CHECK (auth.uid() = owner_id);
