/*
  # Create Halls Schema and Seed UCC Halls

  1. New Tables
    - `halls` - University halls of residence
      - `id` (uuid, PK)
      - `name`, `short_name`, `hall_type` (male/female/mixed)
      - `hall_category` (traditional/src/graduate)
      - `capacity`, `is_graduate`, `is_active`
    - `hall_members` - Student memberships in halls per academic year
      - `id` (uuid, PK)
      - `hall_id` (uuid, references halls)
      - `user_id` (uuid, references members)
      - `student_id`, `student_level`, `is_resident`
      - `affiliation_type`, `academic_year`, `verified_at`
    - `hall_posts` - Hall announcements and posts
      - `id` (uuid, PK)
      - `hall_id` (uuid, references halls)
      - `author_id` (uuid, references members)
      - `title`, `content`, `post_type`, `priority`
    - `hall_events` - Hall events
      - `id` (uuid, PK)
      - `hall_id` (uuid, references halls)
      - `title`, `description`, `event_date`, `location`, `created_by`

  2. Security
    - RLS enabled on all tables
    - Hall members can view their hall's data
    - Active halls viewable by all authenticated users

  3. Seed Data
    - UCC traditional halls and SRC halls
*/

-- Halls
CREATE TABLE IF NOT EXISTS halls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  short_name text,
  hall_type text NOT NULL DEFAULT 'mixed' CHECK (hall_type IN ('male', 'female', 'mixed')),
  hall_category text NOT NULL DEFAULT 'traditional' CHECK (hall_category IN ('traditional', 'src', 'graduate')),
  capacity integer NOT NULL DEFAULT 0,
  is_graduate boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE halls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active halls"
  ON halls FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Hall members
CREATE TABLE IF NOT EXISTS hall_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id uuid NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  student_id text,
  student_level text,
  is_resident boolean NOT NULL DEFAULT false,
  affiliation_type text NOT NULL DEFAULT 'diaspora' CHECK (affiliation_type IN ('resident', 'diaspora')),
  academic_year text NOT NULL DEFAULT '2026/27',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, academic_year)
);

ALTER TABLE hall_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hall membership"
  ON hall_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Hall members can view co-members"
  ON hall_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hall_members hm
      WHERE hm.hall_id = hall_members.hall_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own hall membership"
  ON hall_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own hall membership"
  ON hall_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Hall posts
CREATE TABLE IF NOT EXISTS hall_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id uuid NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
  author_id uuid REFERENCES members(id),
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  post_type text NOT NULL DEFAULT 'announcement' CHECK (post_type IN ('announcement', 'event', 'news', 'general')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hall_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hall members can view posts"
  ON hall_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hall_members hm
      WHERE hm.hall_id = hall_posts.hall_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Hall members can create posts"
  ON hall_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM hall_members hm
      WHERE hm.hall_id = hall_posts.hall_id
      AND hm.user_id = auth.uid()
    )
  );

-- Hall events
CREATE TABLE IF NOT EXISTS hall_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id uuid NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  event_date timestamptz NOT NULL,
  location text,
  created_by uuid REFERENCES members(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hall_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hall members can view events"
  ON hall_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hall_members hm
      WHERE hm.hall_id = hall_events.hall_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Hall members can create events"
  ON hall_events FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM hall_members hm
      WHERE hm.hall_id = hall_events.hall_id
      AND hm.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hall_members_hall ON hall_members(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_members_user ON hall_members(user_id);
CREATE INDEX IF NOT EXISTS idx_hall_posts_hall ON hall_posts(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_events_hall ON hall_events(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_events_date ON hall_events(event_date);

-- Add hall_id FK to members table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'members_hall_id_fkey'
  ) THEN
    ALTER TABLE members ADD CONSTRAINT members_hall_id_fkey
      FOREIGN KEY (hall_id) REFERENCES halls(id);
  END IF;
END $$;

-- Seed UCC Halls
INSERT INTO halls (name, short_name, hall_type, hall_category, capacity, is_graduate, is_active) VALUES
  ('Atlantic Hall', 'Atlantic', 'male', 'traditional', 800, false, true),
  ('Oguaa Hall', 'Oguaa', 'male', 'traditional', 1200, false, true),
  ('Casford Hall', 'Casford', 'male', 'traditional', 600, false, true),
  ('Adehye Hall', 'Adehye', 'female', 'traditional', 800, false, true),
  ('Valco Hall', 'Valco', 'mixed', 'traditional', 1000, false, true),
  ('SRC Annex A', 'Annex A', 'mixed', 'src', 500, false, true),
  ('SRC Annex B', 'Annex B', 'mixed', 'src', 500, false, true),
  ('Kwame Nkrumah Hall', 'Nkrumah', 'male', 'traditional', 700, false, true),
  ('Graduate Hostel', 'Grad Hostel', 'mixed', 'graduate', 300, true, true)
ON CONFLICT DO NOTHING;
