/*
  # StuMark Campus Market - market_listings table

  1. New Tables
    - `market_listings`
      - `id` (uuid, primary key)
      - `seller_id` (uuid, references auth.users)
      - `title` (text, required)
      - `description` (text)
      - `price` (numeric, required)
      - `category` (text)
      - `condition` (text)
      - `campus_location` (text)
      - `seller_phone` (text)
      - `is_available` (bool, default true)
      - `is_sold` (bool, default false)
      - `views` (int, default 0)
      - `saves` (int, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Authenticated users can read all available listings
    - Sellers can insert/update/delete their own listings

  3. Indexes
    - Index on seller_id for "my listings" queries
    - Index on category for filter queries
    - Index on is_sold, is_available for browse queries
*/

CREATE TABLE IF NOT EXISTS market_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  price numeric(10, 2) NOT NULL DEFAULT 0,
  category text DEFAULT 'other',
  condition text DEFAULT 'good',
  campus_location text DEFAULT '',
  seller_phone text DEFAULT '',
  is_available boolean DEFAULT true,
  is_sold boolean DEFAULT false,
  views integer DEFAULT 0,
  saves integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE market_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view available listings"
  ON market_listings FOR SELECT
  TO authenticated
  USING (is_available = true OR seller_id = auth.uid());

CREATE POLICY "Sellers can create their own listings"
  ON market_listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own listings"
  ON market_listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own listings"
  ON market_listings FOR DELETE
  TO authenticated
  USING (auth.uid() = seller_id);

CREATE INDEX IF NOT EXISTS idx_market_listings_seller ON market_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_category ON market_listings(category);
CREATE INDEX IF NOT EXISTS idx_market_listings_available ON market_listings(is_available, is_sold);
