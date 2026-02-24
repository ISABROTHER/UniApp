/*
  # Create Halls Schema and Seed All 11 UCC Halls

  ## Summary
  Creates the complete hall management system schema and populates it with all
  11 official University of Cape Coast (UCC) halls.

  ## New Tables
  1. `halls` - Core hall registry (name, type, capacity, etc.)
  2. `hall_members` - Student hall memberships per academic year
  3. `hall_roles` - JCRC/admin role assignments within halls
  4. `hall_posts` - Official hall feed (announcements, events, exercises, elections, emergencies)
  5. `hall_post_reads` - Per-user read tracking for posts
  6. `hall_exercises` - Tasks/obligations with deadlines
  7. `hall_exercise_submissions` - Student submissions for exercises
  8. `hall_events` - Hall events with RSVP support
  9. `hall_event_rsvps` - RSVP records
  10. `hall_positions` - Electable positions within a hall
  11. `hall_nominations` - Nomination records for positions
  12. `hall_accountability_ledger` - Reach/compliance metrics
  13. `hall_archive_metadata` - Semester-level archive tracking

  ## Security
  - RLS enabled on all tables
  - Hall data publicly readable (is_active)
  - All member/post/event data scoped to authenticated hall members

  ## UCC Halls Seeded
  ### Traditional Halls (6)
  - Oguaa Hall (Mixed, 800)
  - Atlantic Hall / ATL (Mixed, 750)
  - Adehye Hall (Female, 600)
  - Casely Hayford Hall / Casford (Male, 700)
  - Kwame Nkrumah Hall (Male, 650)
  - Valco Hall (Male, 550)

  ### SRC/Graduate Halls (5)
  - SRC Hall (Mixed, 400)
  - Superannuation Hall (Mixed, 350)
  - Alumni Hall (Mixed/Graduate, 300)
  - Valco Trust Hall (Mixed/Graduate, 250)
  - PSI Hall (Mixed, 200)
*/

-- =====================================================
-- TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  hall_type TEXT CHECK (hall_type IN ('male', 'female', 'mixed')) DEFAULT 'mixed',
  hall_category TEXT CHECK (hall_category IN ('traditional', 'src', 'graduate')) DEFAULT 'traditional',
  capacity INTEGER DEFAULT 0,
  is_graduate BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hall_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id UUID REFERENCES halls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES members(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_level TEXT CHECK (student_level IN ('100', '200', '300', '400', 'Postgraduate')),
  is_resident BOOLEAN DEFAULT true,
  affiliation_type TEXT CHECK (affiliation_type IN ('resident', 'diaspora', 'alumni')),
  verified_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  academic_year TEXT NOT NULL,
  UNIQUE(hall_id, user_id, academic_year)
);

CREATE TABLE IF NOT EXISTS hall_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id UUID REFERENCES halls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES members(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('student', 'moderator', 'jcrc_admin', 'hall_management', 'super_admin')),
  position_title TEXT,
  permissions JSONB DEFAULT '[]',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES members(id),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(hall_id, user_id, role_type)
);

CREATE TABLE IF NOT EXISTS hall_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id UUID REFERENCES halls(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('announcement', 'event', 'exercise', 'election', 'emergency')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  target_audience JSONB NOT NULL DEFAULT '{"type": "all"}',
  poster_role TEXT NOT NULL,
  poster_user_id UUID REFERENCES members(id),
  attachments JSONB DEFAULT '[]',
  event_date TIMESTAMPTZ,
  event_location TEXT,
  rsvp_required BOOLEAN DEFAULT false,
  deadline TIMESTAMPTZ,
  submission_instructions TEXT,
  election_type TEXT,
  nomination_start TIMESTAMPTZ,
  nomination_end TIMESTAMPTZ,
  voting_start TIMESTAMPTZ,
  voting_end TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_pinned BOOLEAN DEFAULT false,
  edit_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hall_post_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES hall_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES members(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS hall_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES hall_posts(id) ON DELETE CASCADE,
  hall_id UUID REFERENCES halls(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  target_audience JSONB NOT NULL DEFAULT '{"type": "all"}',
  requires_submission BOOLEAN DEFAULT true,
  submission_type TEXT CHECK (submission_type IN ('text', 'file', 'photo', 'none')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hall_exercise_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES hall_exercises(id) ON DELETE CASCADE,
  user_id UUID REFERENCES members(id) ON DELETE CASCADE,
  submission_content TEXT,
  submission_files JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('pending', 'submitted', 'late', 'missing')) DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES members(id),
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exercise_id, user_id)
);

CREATE TABLE IF NOT EXISTS hall_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES hall_posts(id) ON DELETE CASCADE,
  hall_id UUID REFERENCES halls(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT,
  max_attendees INTEGER,
  rsvp_required BOOLEAN DEFAULT false,
  rsvp_deadline TIMESTAMPTZ,
  target_audience JSONB NOT NULL DEFAULT '{"type": "all"}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hall_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES hall_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES members(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('attending', 'not_attending', 'maybe')) DEFAULT 'attending',
  rsvp_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS hall_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id UUID REFERENCES halls(id) ON DELETE CASCADE,
  position_name TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  term_duration TEXT,
  max_holders INTEGER DEFAULT 1,
  nomination_open BOOLEAN DEFAULT false,
  voting_open BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hall_nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID REFERENCES hall_positions(id) ON DELETE CASCADE,
  nominee_user_id UUID REFERENCES members(id) ON DELETE CASCADE,
  nominator_user_id UUID REFERENCES members(id),
  statement TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')) DEFAULT 'pending',
  nominated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES members(id),
  UNIQUE(position_id, nominee_user_id)
);

CREATE TABLE IF NOT EXISTS hall_accountability_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id UUID REFERENCES halls(id) ON DELETE CASCADE,
  post_id UUID REFERENCES hall_posts(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('reach', 'read_rate', 'task_compliance', 'rsvp_rate')),
  target_count INTEGER NOT NULL,
  actual_count INTEGER NOT NULL,
  percentage DECIMAL(5,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hall_archive_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id UUID REFERENCES halls(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  semester TEXT,
  total_posts INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  total_exercises INTEGER DEFAULT 0,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hall_id, academic_year, semester)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_hall_members_hall_id ON hall_members(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_members_user_id ON hall_members(user_id);
CREATE INDEX IF NOT EXISTS idx_hall_members_academic_year ON hall_members(academic_year);
CREATE INDEX IF NOT EXISTS idx_hall_posts_hall_id ON hall_posts(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_posts_created_at ON hall_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hall_posts_priority ON hall_posts(priority);
CREATE INDEX IF NOT EXISTS idx_hall_exercises_deadline ON hall_exercises(deadline);
CREATE INDEX IF NOT EXISTS idx_hall_events_event_date ON hall_events(event_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_post_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_exercise_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_accountability_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_archive_metadata ENABLE ROW LEVEL SECURITY;

-- Halls: public read for active halls
CREATE POLICY "Anyone can view active halls"
  ON halls FOR SELECT
  USING (is_active = true);

-- Hall members: users can view their own membership
CREATE POLICY "Members can view their hall membership"
  ON hall_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members can insert their hall membership"
  ON hall_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can update their hall membership"
  ON hall_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Hall roles: view own roles
CREATE POLICY "Users can view their hall roles"
  ON hall_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Hall posts: hall members can view posts in their hall
CREATE POLICY "Hall members can view posts"
  ON hall_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hall_members
      WHERE hall_members.hall_id = hall_posts.hall_id
      AND hall_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Hall admins can create posts"
  ON hall_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hall_roles
      WHERE hall_roles.hall_id = hall_posts.hall_id
      AND hall_roles.user_id = auth.uid()
      AND hall_roles.role_type IN ('jcrc_admin', 'hall_management', 'super_admin')
      AND hall_roles.is_active = true
    )
  );

-- Hall post reads: users manage their own
CREATE POLICY "Users can view their post reads"
  ON hall_post_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their post reads"
  ON hall_post_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their post reads"
  ON hall_post_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Hall exercises
CREATE POLICY "Hall members can view exercises"
  ON hall_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hall_members
      WHERE hall_members.hall_id = hall_exercises.hall_id
      AND hall_members.user_id = auth.uid()
    )
  );

-- Exercise submissions: users manage own
CREATE POLICY "Users can view their exercise submissions"
  ON hall_exercise_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their exercise submissions"
  ON hall_exercise_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their exercise submissions"
  ON hall_exercise_submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Hall events
CREATE POLICY "Hall members can view events"
  ON hall_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hall_members
      WHERE hall_members.hall_id = hall_events.hall_id
      AND hall_members.user_id = auth.uid()
    )
  );

-- Event RSVPs
CREATE POLICY "Users can view their event RSVPs"
  ON hall_event_rsvps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their event RSVPs"
  ON hall_event_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their event RSVPs"
  ON hall_event_rsvps FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Hall positions: members can view
CREATE POLICY "Hall members can view positions"
  ON hall_positions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hall_members
      WHERE hall_members.hall_id = hall_positions.hall_id
      AND hall_members.user_id = auth.uid()
    )
  );

-- Nominations
CREATE POLICY "Hall members can view nominations"
  ON hall_nominations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = nominee_user_id OR auth.uid() = nominator_user_id OR
    EXISTS (
      SELECT 1 FROM hall_positions hp
      JOIN hall_members hm ON hm.hall_id = hp.hall_id
      WHERE hp.id = hall_nominations.position_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Hall members can create nominations"
  ON hall_nominations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hall_positions hp
      JOIN hall_members hm ON hm.hall_id = hp.hall_id
      WHERE hp.id = hall_nominations.position_id
      AND hm.user_id = auth.uid()
    )
  );

-- Accountability and archive: authenticated read
CREATE POLICY "Authenticated users can view accountability data"
  ON hall_accountability_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view archive metadata"
  ON hall_archive_metadata FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- =====================================================
-- FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION mark_post_read(p_post_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO hall_post_reads (post_id, user_id, is_read, read_at)
  VALUES (p_post_id, p_user_id, true, NOW())
  ON CONFLICT (post_id, user_id)
  DO UPDATE SET is_read = true, read_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_hall_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_halls_updated_at') THEN
    CREATE TRIGGER update_halls_updated_at BEFORE UPDATE ON halls
      FOR EACH ROW EXECUTE FUNCTION update_hall_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_hall_posts_updated_at') THEN
    CREATE TRIGGER update_hall_posts_updated_at BEFORE UPDATE ON hall_posts
      FOR EACH ROW EXECUTE FUNCTION update_hall_updated_at();
  END IF;
END $$;

-- =====================================================
-- SEED: ALL 11 UCC HALLS
-- =====================================================

INSERT INTO halls (name, short_name, hall_type, hall_category, capacity, is_graduate, is_active) VALUES
  ('Oguaa Hall',             'Oguaa',   'mixed',  'traditional', 800, false, true),
  ('Atlantic Hall',          'ATL',     'mixed',  'traditional', 750, false, true),
  ('Adehye Hall',            'Adehye',  'female', 'traditional', 600, false, true),
  ('Casely Hayford Hall',    'Casford', 'male',   'traditional', 700, false, true),
  ('Kwame Nkrumah Hall',     'KNH',     'male',   'traditional', 650, false, true),
  ('Valco Hall',             'Valco',   'male',   'traditional', 550, false, true),
  ('SRC Hall',               'SRC',     'mixed',  'src',         400, false, true),
  ('Superannuation Hall',    'Super',   'mixed',  'src',         350, false, true),
  ('Alumni Hall',            'Alumni',  'mixed',  'graduate',    300, true,  true),
  ('Valco Trust Hall',       'VTH',     'mixed',  'graduate',    250, true,  true),
  ('PSI Hall',               'PSI',     'mixed',  'src',         200, false, true)
ON CONFLICT DO NOTHING;
