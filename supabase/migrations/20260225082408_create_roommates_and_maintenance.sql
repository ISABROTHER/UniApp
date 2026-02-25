/*
  # Create Roommates and Maintenance Tables

  1. New Tables
    - `roommate_profiles` - Users seeking roommates
      - `id` (uuid, PK)
      - `user_id` (uuid, references members)
      - `budget_min`, `budget_max`
      - `preferred_location`, `preferred_university`, `gender_preference`
      - `academic_level`, `lifestyle_notes`
      - `hostel_id` (uuid, references hostels, optional)
      - `is_active`
    - `maintenance_requests` - Maintenance/repair requests
      - `id` (uuid, PK)
      - `user_id` (uuid, references members)
      - `hostel_id` (uuid, references hostels)
      - `title`, `description`, `priority`, `status`

  2. Security
    - RLS enabled on all tables
    - Roommate profiles visible to all authenticated users (for matching)
    - Maintenance requests visible to user and hostel owner
*/

-- Roommate profiles
CREATE TABLE IF NOT EXISTS roommate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  budget_min numeric NOT NULL DEFAULT 0,
  budget_max numeric NOT NULL DEFAULT 0,
  preferred_location text,
  preferred_university text,
  gender_preference text NOT NULL DEFAULT 'any' CHECK (gender_preference IN ('male', 'female', 'any')),
  academic_level text,
  lifestyle_notes text,
  hostel_id uuid REFERENCES hostels(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roommate_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active roommate profiles"
  ON roommate_profiles FOR SELECT
  TO authenticated
  USING (is_active = true OR user_id = auth.uid());

CREATE POLICY "Users can create own roommate profile"
  ON roommate_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own roommate profile"
  ON roommate_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own roommate profile"
  ON roommate_profiles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Maintenance requests
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  hostel_id uuid NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own maintenance requests"
  ON maintenance_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Hostel owners can view maintenance requests"
  ON maintenance_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hostels WHERE hostels.id = maintenance_requests.hostel_id
      AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create maintenance requests"
  ON maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own maintenance requests"
  ON maintenance_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roommate_profiles_user ON roommate_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_user ON maintenance_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_hostel ON maintenance_requests(hostel_id);
