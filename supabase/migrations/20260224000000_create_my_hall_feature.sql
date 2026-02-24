-- My Hall Feature Database Schema
-- Purpose: Official digital hall system for university hall management

-- =====================================================
-- TABLES
-- =====================================================

-- Halls table
CREATE TABLE IF NOT EXISTS halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  university_id UUID REFERENCES universities(id),
  hall_type TEXT CHECK (hall_type IN ('male', 'female', 'mixed')),
  capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hall members (residents + affiliates)
CREATE TABLE IF NOT EXISTS hall_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id UUID REFERENCES halls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES members(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_level TEXT CHECK (student_level IN ('100', '200', '300', '400', 'postgraduate')),
  is_resident BOOLEAN DEFAULT true,
  affiliation_type TEXT CHECK (affiliation_type IN ('resident', 'diaspora', 'alumni')),
  verified_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  academic_year TEXT NOT NULL,
  UNIQUE(hall_id, user_id, academic_year)
);

-- Hall roles and permissions
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

-- Hall posts (official feed)
CREATE TABLE IF NOT EXISTS hall_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hall_id UUID REFERENCES halls(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('announcement', 'event', 'exercise', 'election', 'emergency')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  
  -- Targeting engine
  target_audience JSONB NOT NULL, -- {type: 'all'|'residents'|'affiliates'|'level'|'custom', levels: [], custom_groups: []}
  
  -- Poster information
  poster_role TEXT NOT NULL,
  poster_user_id UUID REFERENCES members(id),
  
  -- Content and attachments
  attachments JSONB DEFAULT '[]',
  
  -- Event specific
  event_date TIMESTAMPTZ,
  event_location TEXT,
  rsvp_required BOOLEAN DEFAULT false,
  
  -- Exercise specific
  deadline TIMESTAMPTZ,
  submission_instructions TEXT,
  
  -- Election specific
  election_type TEXT,
  nomination_start TIMESTAMPTZ,
  nomination_end TIMESTAMPTZ,
  voting_start TIMESTAMPTZ,
  voting_end TIMESTAMPTZ,
  
  -- Accountability
  expires_at TIMESTAMPTZ,
  is_pinned BOOLEAN DEFAULT false,
  edit_history JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hall post reads (tracking)
CREATE TABLE IF NOT EXISTS hall_post_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES hall_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES members(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Hall exercises (tasks/obligations)
CREATE TABLE IF NOT EXISTS hall_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES hall_posts(id) ON DELETE CASCADE,
  hall_id UUID REFERENCES halls(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  target_audience JSONB NOT NULL,
  requires_submission BOOLEAN DEFAULT true,
  submission_type TEXT CHECK (submission_type IN ('text', 'file', 'photo', 'none')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hall exercise submissions
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

-- Hall events
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
  target_audience JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hall event RSVPs
CREATE TABLE IF NOT EXISTS hall_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES hall_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES members(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('attending', 'not_attending', 'maybe')) DEFAULT 'attending',
  rsvp_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);

-- Hall elections and positions
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

-- Hall position nominations
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

-- Hall accountability ledger
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

-- Hall memory vault (archive metadata)
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

CREATE INDEX idx_hall_members_hall_id ON hall_members(hall_id);
CREATE INDEX idx_hall_members_user_id ON hall_members(user_id);
CREATE INDEX idx_hall_members_academic_year ON hall_members(academic_year);
CREATE INDEX idx_hall_posts_hall_id ON hall_posts(hall_id);
CREATE INDEX idx_hall_posts_created_at ON hall_posts(created_at DESC);
CREATE INDEX idx_hall_posts_priority ON hall_posts(priority);
CREATE INDEX idx_hall_posts_expires_at ON hall_posts(expires_at);
CREATE INDEX idx_hall_exercises_deadline ON hall_exercises(deadline);
CREATE INDEX idx_hall_events_event_date ON hall_events(event_date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
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

-- Halls: Public read access
CREATE POLICY "Anyone can view active halls"
  ON halls FOR SELECT
  USING (is_active = true);

-- Hall members: Members can view their own hall
CREATE POLICY "Members can view their hall membership"
  ON hall_members FOR SELECT
  USING (auth.uid() = user_id);

-- Hall roles: View own roles
CREATE POLICY "Users can view their hall roles"
  ON hall_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Hall posts: Members can view posts targeted to them
CREATE POLICY "Hall members can view posts"
  ON hall_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hall_members
      WHERE hall_members.hall_id = hall_posts.hall_id
      AND hall_members.user_id = auth.uid()
    )
  );

-- Hall posts: Admins can create posts
CREATE POLICY "Hall admins can create posts"
  ON hall_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hall_roles
      WHERE hall_roles.hall_id = hall_posts.hall_id
      AND hall_roles.user_id = auth.uid()
      AND hall_roles.role_type IN ('jcrc_admin', 'hall_management', 'super_admin')
      AND hall_roles.is_active = true
    )
  );

-- Hall post reads: Users can view and update their own reads
CREATE POLICY "Users can manage their post reads"
  ON hall_post_reads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Hall exercises: Members can view exercises
CREATE POLICY "Hall members can view exercises"
  ON hall_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hall_members
      WHERE hall_members.hall_id = hall_exercises.hall_id
      AND hall_members.user_id = auth.uid()
    )
  );

-- Exercise submissions: Users can manage own submissions
CREATE POLICY "Users can manage their exercise submissions"
  ON hall_exercise_submissions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Hall events: Members can view events
CREATE POLICY "Hall members can view events"
  ON hall_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hall_members
      WHERE hall_members.hall_id = hall_events.hall_id
      AND hall_members.user_id = auth.uid()
    )
  );

-- Event RSVPs: Users can manage own RSVPs
CREATE POLICY "Users can manage their event RSVPs"
  ON hall_event_rsvps FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Hall positions: Members can view positions
CREATE POLICY "Hall members can view positions"
  ON hall_positions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hall_members
      WHERE hall_members.hall_id = hall_positions.hall_id
      AND hall_members.user_id = auth.uid()
    )
  );

-- Nominations: Users can view and create nominations
CREATE POLICY "Hall members can view nominations"
  ON hall_nominations FOR SELECT
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
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hall_positions hp
      JOIN hall_members hm ON hm.hall_id = hp.hall_id
      WHERE hp.id = hall_nominations.position_id
      AND hm.user_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to mark post as read
CREATE OR REPLACE FUNCTION mark_post_read(p_post_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO hall_post_reads (post_id, user_id, is_read, read_at)
  VALUES (p_post_id, p_user_id, true, NOW())
  ON CONFLICT (post_id, user_id)
  DO UPDATE SET is_read = true, read_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate post reach
CREATE OR REPLACE FUNCTION calculate_post_reach(p_post_id UUID)
RETURNS TABLE (
  target_count INTEGER,
  read_count INTEGER,
  read_percentage DECIMAL(5,2)
) AS $$
DECLARE
  v_hall_id UUID;
  v_target_count INTEGER;
  v_read_count INTEGER;
BEGIN
  -- Get hall_id and count target audience
  SELECT hall_id INTO v_hall_id FROM hall_posts WHERE id = p_post_id;
  
  -- Count all members in hall (simplified - should respect target_audience)
  SELECT COUNT(*) INTO v_target_count
  FROM hall_members
  WHERE hall_id = v_hall_id;
  
  -- Count reads
  SELECT COUNT(*) INTO v_read_count
  FROM hall_post_reads
  WHERE post_id = p_post_id AND is_read = true;
  
  RETURN QUERY SELECT
    v_target_count,
    v_read_count,
    CASE WHEN v_target_count > 0 THEN ROUND((v_read_count::DECIMAL / v_target_count) * 100, 2) ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_halls_updated_at BEFORE UPDATE ON halls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hall_posts_updated_at BEFORE UPDATE ON hall_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA (Example)
-- =====================================================

-- Insert example halls
INSERT INTO halls (name, hall_type, capacity, is_active) VALUES
  ('Valco Hall', 'male', 500, true),
  ('Adehye Hall', 'female', 450, true),
  ('Atlantic Hall', 'mixed', 600, true)
ON CONFLICT DO NOTHING;