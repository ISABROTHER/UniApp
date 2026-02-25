/*
  # Create Core Schema

  1. New Tables
    - `members` - User profiles linked to auth.users
      - `id` (uuid, PK, references auth.users)
      - `student_id`, `full_name`, `email`, `phone`, `date_of_birth`, `gender`
      - `faculty`, `department`, `level`, `hall_of_residence`
      - `avatar_url`, `membership_status`, `role`
      - `ghana_card_number`, `id_verified`, `id_verified_at`
      - `hall_id`, `hall_wing`, `hall_room_number`, `hall_designation_confirmed`
      - `joined_at`, `created_at`, `updated_at`
    - `hostels` - Hostel listings
      - `id` (uuid, PK)
      - `owner_id` (uuid, references members)
      - `name`, `description`, `address`, `campus_proximity`
      - `latitude`, `longitude`
      - `price_range_min`, `price_range_max`
      - `total_rooms`, `available_rooms`, `rating`, `review_count`
      - `featured`, `verified`, `status`
    - `hostel_images` - Images for hostels
    - `hostel_amenities` - Amenities for hostels
    - `hostel_rooms` - Room types for hostels
    - `bookings` - Booking records
    - `hostel_reviews` - User reviews of hostels
    - `favourites` - User favourite hostels
    - `check_ins` - QR-based check-in records

  2. Security
    - RLS enabled on all tables
    - Members can read/update their own profile
    - Authenticated users can view active hostels
    - Owners can manage their own hostels
    - Users can manage their own bookings, reviews, favourites, check-ins
*/

-- Members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id text,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  faculty text,
  department text,
  level text,
  hall_of_residence text,
  avatar_url text,
  membership_status text NOT NULL DEFAULT 'active',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'owner', 'admin')),
  ghana_card_number text,
  id_verified boolean NOT NULL DEFAULT false,
  id_verified_at timestamptz,
  hall_id uuid,
  hall_wing text,
  hall_room_number text,
  hall_designation_confirmed boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS members_phone_unique ON members (phone) WHERE phone IS NOT NULL AND phone != '';

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read own profile"
  ON members FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Members can update own profile"
  ON members FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Members can insert own profile"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can view other members basic info"
  ON members FOR SELECT
  TO authenticated
  USING (membership_status = 'active');

-- Hostels table
CREATE TABLE IF NOT EXISTS hostels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  campus_proximity text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  price_range_min numeric NOT NULL DEFAULT 0,
  price_range_max numeric NOT NULL DEFAULT 0,
  total_rooms integer NOT NULL DEFAULT 0,
  available_rooms integer NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  featured boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hostels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active hostels"
  ON hostels FOR SELECT
  TO authenticated
  USING (status = 'active' OR owner_id = auth.uid());

CREATE POLICY "Owners can insert own hostels"
  ON hostels FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own hostels"
  ON hostels FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete own hostels"
  ON hostels FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Hostel images
CREATE TABLE IF NOT EXISTS hostel_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  image_url text NOT NULL DEFAULT '',
  caption text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hostel_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hostel images"
  ON hostel_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_images.hostel_id
      AND (hostels.status = 'active' OR hostels.owner_id = auth.uid())
    )
  );

CREATE POLICY "Owners can manage hostel images"
  ON hostel_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_images.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update hostel images"
  ON hostel_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_images.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_images.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete hostel images"
  ON hostel_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_images.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

-- Hostel amenities
CREATE TABLE IF NOT EXISTS hostel_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  amenity text NOT NULL DEFAULT ''
);

ALTER TABLE hostel_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hostel amenities"
  ON hostel_amenities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_amenities.hostel_id
      AND (hostels.status = 'active' OR hostels.owner_id = auth.uid())
    )
  );

CREATE POLICY "Owners can insert hostel amenities"
  ON hostel_amenities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_amenities.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete hostel amenities"
  ON hostel_amenities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_amenities.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

-- Hostel rooms
CREATE TABLE IF NOT EXISTS hostel_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_type text NOT NULL DEFAULT '',
  price_per_month numeric NOT NULL DEFAULT 0,
  available_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  description text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hostel_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hostel rooms"
  ON hostel_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_rooms.hostel_id
      AND (hostels.status = 'active' OR hostels.owner_id = auth.uid())
    )
  );

CREATE POLICY "Owners can insert hostel rooms"
  ON hostel_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_rooms.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update hostel rooms"
  ON hostel_rooms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_rooms.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_rooms.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete hostel rooms"
  ON hostel_rooms FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = hostel_rooms.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES hostel_rooms(id),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  nights integer NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  special_requests text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'payment_pending')),
  qr_code text,
  payment_reference text,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'held')),
  paid_at timestamptz,
  payout_released_at timestamptz,
  platform_fee numeric NOT NULL DEFAULT 0,
  processing_fee numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners can view bookings for their hostels"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = bookings.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Hostel reviews
CREATE TABLE IF NOT EXISTS hostel_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  rating integer NOT NULL DEFAULT 0 CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_verified_guest boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hostel_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reviews"
  ON hostel_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews"
  ON hostel_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reviews"
  ON hostel_reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reviews"
  ON hostel_reviews FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Favourites
CREATE TABLE IF NOT EXISTS favourites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, hostel_id)
);

ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favourites"
  ON favourites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add favourites"
  ON favourites FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own favourites"
  ON favourites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Check-ins
CREATE TABLE IF NOT EXISTS check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  check_in_time timestamptz,
  check_out_time timestamptz,
  qr_code text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'checked_in', 'checked_out')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own check-ins"
  ON check_ins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create check-ins"
  ON check_ins FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own check-ins"
  ON check_ins FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hostels_owner ON hostels(owner_id);
CREATE INDEX IF NOT EXISTS idx_hostels_status ON hostels(status);
CREATE INDEX IF NOT EXISTS idx_hostel_images_hostel ON hostel_images(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_amenities_hostel ON hostel_amenities(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_rooms_hostel ON hostel_rooms(hostel_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_hostel ON bookings(hostel_id);
CREATE INDEX IF NOT EXISTS idx_hostel_reviews_hostel ON hostel_reviews(hostel_id);
CREATE INDEX IF NOT EXISTS idx_favourites_user ON favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_booking ON check_ins(booking_id);
