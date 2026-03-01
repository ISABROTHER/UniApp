/*
  # Smart Planner (Planday Core) + Feature Enhancements

  1. New Tables
    - `timetable_entries` - Student course schedule blocks
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `course_code` (text) - e.g. "CSM 101"
      - `course_name` (text)
      - `lecturer` (text)
      - `venue` (text)
      - `day_of_week` (integer 0-6, Mon=0)
      - `start_time` (time)
      - `end_time` (time)
      - `color` (text) - hex color for the block
      - `semester` (text)
      - `notes` (text)
    - `planner_assignments` - Assignments and exam deadlines
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `title` (text)
      - `course_code` (text)
      - `type` (text: assignment, exam, quiz, project, presentation)
      - `due_date` (date)
      - `due_time` (time)
      - `description` (text)
      - `status` (text: pending, in_progress, submitted, completed)
      - `priority` (text: low, medium, high)
      - `reminder_enabled` (boolean, default true)
    - `planner_service_slots` - Auto-populated service bookings
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `service_type` (text: laundry_pickup, laundry_delivery, print_job, food_order, study_room, transport)
      - `title` (text)
      - `scheduled_date` (date)
      - `scheduled_time` (time)
      - `end_time` (time)
      - `status` (text: scheduled, in_progress, completed, cancelled)
      - `reference_id` (uuid) - links to original order/booking
    - `walk_me_home_sessions` - Walk-Me-Home GPS tracking
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `destination` (text)
      - `start_latitude` (double precision)
      - `start_longitude` (double precision)
      - `current_latitude` (double precision)
      - `current_longitude` (double precision)
      - `share_link` (text) - shareable tracking link
      - `status` (text: active, completed, alert_triggered)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `last_movement_at` (timestamptz)
    - `walk_me_home_watchers` - People watching a session
      - `id` (uuid, primary key)
      - `session_id` (uuid)
      - `watcher_name` (text)
      - `watcher_phone` (text)
      - `notified` (boolean, default false)

  2. Enhancements
    - Add `reward_offered` and `reward_amount` to lost_found_items
    - Add `delivery_type` and `special_instructions` to food_orders

  3. Security
    - RLS on all new tables
    - Users can only access own planner data
    - Walk-Me-Home sessions viewable by authenticated users (for shared links)
*/

-- Timetable Entries
CREATE TABLE IF NOT EXISTS timetable_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  course_code text NOT NULL,
  course_name text NOT NULL DEFAULT '',
  lecturer text NOT NULL DEFAULT '',
  venue text NOT NULL DEFAULT '',
  day_of_week integer NOT NULL DEFAULT 0,
  start_time time NOT NULL,
  end_time time NOT NULL,
  color text NOT NULL DEFAULT '#4A90E2',
  semester text NOT NULL DEFAULT '',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own timetable" ON timetable_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create timetable entries" ON timetable_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own timetable" ON timetable_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own timetable" ON timetable_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Planner Assignments
CREATE TABLE IF NOT EXISTS planner_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  course_code text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'assignment',
  due_date date NOT NULL,
  due_time time,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  reminder_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE planner_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own assignments" ON planner_assignments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create assignments" ON planner_assignments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own assignments" ON planner_assignments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own assignments" ON planner_assignments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Planner Service Slots
CREATE TABLE IF NOT EXISTS planner_service_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  service_type text NOT NULL DEFAULT 'laundry_pickup',
  title text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  end_time time,
  status text NOT NULL DEFAULT 'scheduled',
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE planner_service_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own service slots" ON planner_service_slots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create service slots" ON planner_service_slots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own service slots" ON planner_service_slots FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own service slots" ON planner_service_slots FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Walk Me Home Sessions
CREATE TABLE IF NOT EXISTS walk_me_home_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  destination text NOT NULL DEFAULT '',
  start_latitude double precision,
  start_longitude double precision,
  current_latitude double precision,
  current_longitude double precision,
  share_link text,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_movement_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE walk_me_home_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own walk sessions" ON walk_me_home_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create walk sessions" ON walk_me_home_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own walk sessions" ON walk_me_home_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Walk Me Home Watchers
CREATE TABLE IF NOT EXISTS walk_me_home_watchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES walk_me_home_sessions(id),
  watcher_name text NOT NULL DEFAULT '',
  watcher_phone text NOT NULL DEFAULT '',
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE walk_me_home_watchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Session owner can view watchers" ON walk_me_home_watchers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM walk_me_home_sessions s WHERE s.id = walk_me_home_watchers.session_id AND s.user_id = auth.uid())
);
CREATE POLICY "Session owner can add watchers" ON walk_me_home_watchers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM walk_me_home_sessions s WHERE s.id = walk_me_home_watchers.session_id AND s.user_id = auth.uid())
);

-- Enhance lost_found_items with reward fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lost_found_items' AND column_name = 'reward_offered'
  ) THEN
    ALTER TABLE lost_found_items ADD COLUMN reward_offered boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lost_found_items' AND column_name = 'reward_amount'
  ) THEN
    ALTER TABLE lost_found_items ADD COLUMN reward_amount numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Enhance food_orders with delivery type and special instructions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_orders' AND column_name = 'delivery_type'
  ) THEN
    ALTER TABLE food_orders ADD COLUMN delivery_type text NOT NULL DEFAULT 'delivery';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_orders' AND column_name = 'special_instructions'
  ) THEN
    ALTER TABLE food_orders ADD COLUMN special_instructions text;
  END IF;
END $$;
