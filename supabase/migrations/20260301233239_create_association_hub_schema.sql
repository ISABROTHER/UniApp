/*
  # Association & Organization Hub Schema

  This migration creates the complete database structure for Innovation 11:
  the Association & Organization Hub that connects every group on campus.

  1. New Tables
    - `organizations` - Master record for every campus group
      - `id` (uuid, primary key)
      - `name` (text) - Organization name
      - `type` (text) - student_gov, hall, dept, church, club, non_student_religious, service_provider
      - `description` (text) - About the organization
      - `logo_url` (text) - Organization logo
      - `verified` (boolean) - Admin-verified status
      - `parent_org_id` (uuid) - Parent organization reference
      - `category` (text) - Sub-category
      - `contact_email` (text)
      - `contact_phone` (text)
      - `affiliated_hall` (text)
      - `affiliated_department` (text)
      - `created_by` (uuid) - Creator user
      - `member_count` (integer) - Cached count
      - `is_open` (boolean) - Auto-join or requires approval

    - `org_memberships` - Who belongs to which org
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `org_id` (uuid)
      - `role` (text) - member, exec, admin, leader, pastor
      - `title` (text) - Display title e.g. "President"
      - `status` (text) - active, pending, suspended
      - `joined_at` (timestamptz)

    - `org_announcements` - Official communications
      - `id` (uuid, primary key)
      - `org_id` (uuid)
      - `author_id` (uuid)
      - `title` (text)
      - `body` (text)
      - `priority` (text) - normal, urgent, pinned
      - `target_roles` (text) - comma-separated roles or 'all'

    - `org_dues` - Financial contributions (dues, tithe, offering)
      - `id` (uuid, primary key)
      - `org_id` (uuid)
      - `member_id` (uuid)
      - `amount` (numeric)
      - `type` (text) - dues, tithe, offering, fundraising
      - `period` (text) - e.g. "Semester 1 2026"
      - `paid_at` (timestamptz)
      - `receipt_ref` (text)

    - `org_events` - Organization events
      - `id` (uuid, primary key)
      - `org_id` (uuid)
      - `title` (text)
      - `description` (text)
      - `event_date` (date)
      - `start_time` (time)
      - `end_time` (time)
      - `venue` (text)
      - `is_members_only` (boolean)
      - `attendance_tracking` (boolean)

    - `org_elections` - Structured election system
      - `id` (uuid, primary key)
      - `org_id` (uuid)
      - `title` (text)
      - `description` (text)
      - `voting_start` (timestamptz)
      - `voting_end` (timestamptz)
      - `status` (text) - upcoming, active, completed, cancelled
      - `results_published` (boolean)

    - `org_election_candidates` - Candidates for elections
      - `id` (uuid, primary key)
      - `election_id` (uuid)
      - `user_id` (uuid)
      - `position` (text)
      - `manifesto` (text)
      - `vote_count` (integer)

    - `org_election_votes` - Anonymous vote records
      - `id` (uuid, primary key)
      - `election_id` (uuid)
      - `candidate_id` (uuid)
      - `voter_hash` (text) - hashed voter ID for anonymity
      - `voted_at` (timestamptz)

    - `org_finance` - Budget and expense tracking
      - `id` (uuid, primary key)
      - `org_id` (uuid)
      - `type` (text) - income, expense
      - `amount` (numeric)
      - `category` (text)
      - `description` (text)
      - `approved_by` (uuid)
      - `receipt_url` (text)
      - `transaction_date` (date)

    - `org_subgroups` - Cells, ministry units, committees
      - `id` (uuid, primary key)
      - `org_id` (uuid)
      - `name` (text)
      - `type` (text) - cell, ministry_unit, committee, team
      - `leader_id` (uuid)
      - `description` (text)
      - `meeting_schedule` (text)

    - `org_roster_shifts` - Volunteer/ministry shift scheduling (Planday-style)
      - `id` (uuid, primary key)
      - `org_id` (uuid)
      - `subgroup_id` (uuid)
      - `user_id` (uuid) - assigned volunteer
      - `shift_date` (date)
      - `start_time` (time)
      - `end_time` (time)
      - `role_name` (text) - e.g. "Lead Vocalist", "Camera Operator"
      - `status` (text) - assigned, confirmed, swap_requested, completed

  2. Security
    - RLS enabled on all tables
    - Members can view their org's data
    - Only admins/execs can create announcements, manage elections
    - Vote anonymity enforced
*/

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'club',
  description text NOT NULL DEFAULT '',
  logo_url text,
  verified boolean NOT NULL DEFAULT false,
  parent_org_id uuid REFERENCES organizations(id),
  category text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  affiliated_hall text,
  affiliated_department text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  member_count integer NOT NULL DEFAULT 0,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can browse organizations"
  ON organizations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Org creator can update"
  ON organizations FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Org Memberships
CREATE TABLE IF NOT EXISTS org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  org_id uuid NOT NULL REFERENCES organizations(id),
  role text NOT NULL DEFAULT 'member',
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, org_id)
);
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org memberships"
  ON org_memberships FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_memberships.org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Users can join organizations"
  ON org_memberships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave organizations"
  ON org_memberships FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update member roles"
  ON org_memberships FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_memberships.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec')
      AND om.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_memberships.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec')
      AND om.status = 'active'
    )
  );

-- Org Announcements
CREATE TABLE IF NOT EXISTS org_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  author_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'normal',
  target_roles text NOT NULL DEFAULT 'all',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view announcements"
  ON org_announcements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_announcements.org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Org admins can create announcements"
  ON org_announcements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_announcements.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec', 'leader', 'pastor')
      AND om.status = 'active'
    )
  );

CREATE POLICY "Org admins can update announcements"
  ON org_announcements FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Org admins can delete announcements"
  ON org_announcements FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- Org Dues
CREATE TABLE IF NOT EXISTS org_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  member_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'dues',
  period text NOT NULL DEFAULT '',
  paid_at timestamptz NOT NULL DEFAULT now(),
  receipt_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org_dues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own dues"
  ON org_dues FOR SELECT TO authenticated
  USING (
    auth.uid() = member_id
    OR EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_dues.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec')
      AND om.status = 'active'
    )
  );

CREATE POLICY "Members can pay dues"
  ON org_dues FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = member_id);

-- Org Events
CREATE TABLE IF NOT EXISTS org_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_date date NOT NULL,
  start_time time,
  end_time time,
  venue text NOT NULL DEFAULT '',
  is_members_only boolean NOT NULL DEFAULT false,
  attendance_tracking boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public events visible to all, member events to members"
  ON org_events FOR SELECT TO authenticated
  USING (
    is_members_only = false
    OR EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_events.org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Org admins can create events"
  ON org_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_events.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec', 'leader')
      AND om.status = 'active'
    )
  );

CREATE POLICY "Event creators can update events"
  ON org_events FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Event creators can delete events"
  ON org_events FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Org Elections
CREATE TABLE IF NOT EXISTS org_elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  voting_start timestamptz NOT NULL,
  voting_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'upcoming',
  results_published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org_elections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view elections"
  ON org_elections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_elections.org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Org admins can create elections"
  ON org_elections FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_elections.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec')
      AND om.status = 'active'
    )
  );

CREATE POLICY "Election creators can update"
  ON org_elections FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Election Candidates
CREATE TABLE IF NOT EXISTS org_election_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES org_elections(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  position text NOT NULL,
  manifesto text NOT NULL DEFAULT '',
  vote_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org_election_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view candidates"
  ON org_election_candidates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_elections e
      JOIN org_memberships om ON om.org_id = e.org_id
      WHERE e.id = org_election_candidates.election_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Org admins can add candidates"
  ON org_election_candidates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_elections e
      JOIN org_memberships om ON om.org_id = e.org_id
      WHERE e.id = org_election_candidates.election_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec')
      AND om.status = 'active'
    )
  );

-- Election Votes (anonymous)
CREATE TABLE IF NOT EXISTS org_election_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES org_elections(id),
  candidate_id uuid NOT NULL REFERENCES org_election_candidates(id),
  voter_hash text NOT NULL,
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(election_id, voter_hash)
);
ALTER TABLE org_election_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can cast votes"
  ON org_election_votes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_elections e
      JOIN org_memberships om ON om.org_id = e.org_id
      WHERE e.id = org_election_votes.election_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND e.status = 'active'
    )
  );

CREATE POLICY "Only admins can view vote records"
  ON org_election_votes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_elections e
      JOIN org_memberships om ON om.org_id = e.org_id
      WHERE e.id = org_election_votes.election_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec')
      AND om.status = 'active'
    )
  );

-- Org Finance
CREATE TABLE IF NOT EXISTS org_finance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  type text NOT NULL DEFAULT 'income',
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  approved_by uuid REFERENCES auth.users(id),
  receipt_url text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org_finance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view finance"
  ON org_finance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_finance.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec')
      AND om.status = 'active'
    )
  );

CREATE POLICY "Org admins can add finance records"
  ON org_finance FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_finance.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec')
      AND om.status = 'active'
    )
  );

-- Org Subgroups
CREATE TABLE IF NOT EXISTS org_subgroups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'committee',
  leader_id uuid REFERENCES auth.users(id),
  description text NOT NULL DEFAULT '',
  meeting_schedule text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org_subgroups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view subgroups"
  ON org_subgroups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_subgroups.org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Org admins can manage subgroups"
  ON org_subgroups FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_subgroups.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec', 'leader')
      AND om.status = 'active'
    )
  );

CREATE POLICY "Org admins can update subgroups"
  ON org_subgroups FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_subgroups.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec', 'leader')
      AND om.status = 'active'
    )
  );

-- Org Roster Shifts (Planday-style)
CREATE TABLE IF NOT EXISTS org_roster_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  subgroup_id uuid REFERENCES org_subgroups(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  role_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'assigned',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE org_roster_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view roster"
  ON org_roster_shifts FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_roster_shifts.org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

CREATE POLICY "Org admins can create shifts"
  ON org_roster_shifts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_roster_shifts.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec', 'leader')
      AND om.status = 'active'
    )
  );

CREATE POLICY "Assigned users can update shift status"
  ON org_roster_shifts FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_roster_shifts.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec', 'leader')
      AND om.status = 'active'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM org_memberships om
      WHERE om.org_id = org_roster_shifts.org_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'exec', 'leader')
      AND om.status = 'active'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON org_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_org_announcements_org ON org_announcements(org_id);
CREATE INDEX IF NOT EXISTS idx_org_dues_org ON org_dues(org_id);
CREATE INDEX IF NOT EXISTS idx_org_dues_member ON org_dues(member_id);
CREATE INDEX IF NOT EXISTS idx_org_events_org ON org_events(org_id);
CREATE INDEX IF NOT EXISTS idx_org_events_date ON org_events(event_date);
CREATE INDEX IF NOT EXISTS idx_org_elections_org ON org_elections(org_id);
CREATE INDEX IF NOT EXISTS idx_org_finance_org ON org_finance(org_id);
CREATE INDEX IF NOT EXISTS idx_org_subgroups_org ON org_subgroups(org_id);
CREATE INDEX IF NOT EXISTS idx_org_roster_shifts_org ON org_roster_shifts(org_id);
CREATE INDEX IF NOT EXISTS idx_org_roster_shifts_user ON org_roster_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
