/*
  # Create Owner Verification and Market Listings

  1. New Tables
    - `owner_verifications` - Ghana Card verification workflow for hostel owners
      - `id` (uuid, PK)
      - `owner_id` (uuid, references members)
      - `ghana_card_number`, `front_image_url`, `back_image_url`
      - `status` (pending, approved, rejected, requires_resubmission)
      - `reviewer_notes`, `submitted_at`, `reviewed_at`, `reviewed_by`
    - `market_listings` - Campus marketplace listings
      - `id` (uuid, PK)
      - `seller_id` (uuid, references members)
      - `title`, `description`, `price`, `category`, `condition`
      - `images`, `location`, `is_sold`, `is_active`
    - `print_jobs` - Print service orders
      - `id` (uuid, PK)
      - `user_id` (uuid, references members)
      - `file_name`, `file_url`, `copies`, `color_mode`, `paper_size`
      - `double_sided`, `total_price`, `status`, `pickup_location`
      - `vendor_id`, `vendor_name`

  2. Security
    - RLS enabled on all tables
    - Owners can manage their own verifications
    - Users can manage their own listings and print jobs
    - Active listings visible to all authenticated users
*/

-- Owner verifications
CREATE TABLE IF NOT EXISTS owner_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  ghana_card_number text,
  front_image_url text,
  back_image_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'requires_resubmission')),
  reviewer_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE owner_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own verifications"
  ON owner_verifications FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can create verifications"
  ON owner_verifications FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own verifications"
  ON owner_verifications FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Market listings
CREATE TABLE IF NOT EXISTS market_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT '',
  condition text NOT NULL DEFAULT 'used' CHECK (condition IN ('new', 'like_new', 'used', 'fair')),
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  location text,
  is_sold boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE market_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active listings"
  ON market_listings FOR SELECT
  TO authenticated
  USING (is_active = true OR seller_id = auth.uid());

CREATE POLICY "Users can create own listings"
  ON market_listings FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Users can update own listings"
  ON market_listings FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Users can delete own listings"
  ON market_listings FOR DELETE
  TO authenticated
  USING (seller_id = auth.uid());

-- Print jobs
CREATE TABLE IF NOT EXISTS print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  file_name text NOT NULL DEFAULT '',
  file_url text,
  copies integer NOT NULL DEFAULT 1,
  color_mode text NOT NULL DEFAULT 'bw' CHECK (color_mode IN ('bw', 'color')),
  paper_size text NOT NULL DEFAULT 'a4' CHECK (paper_size IN ('a4', 'a3', 'letter')),
  double_sided boolean NOT NULL DEFAULT false,
  total_price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'collected', 'cancelled')),
  pickup_location text,
  vendor_id uuid,
  vendor_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own print jobs"
  ON print_jobs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create print jobs"
  ON print_jobs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own print jobs"
  ON print_jobs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_owner_verifications_owner ON owner_verifications(owner_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_seller ON market_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_category ON market_listings(category);
CREATE INDEX IF NOT EXISTS idx_print_jobs_user ON print_jobs(user_id);
