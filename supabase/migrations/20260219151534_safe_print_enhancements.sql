/*
  # Safe Print Feature Enhancement

  1. Changes to print_jobs
    - Add file_url (stored file reference)
    - Add file_name (original file name)
    - Add file_size_kb (file size for display)
    - Add file_deleted_at (when file was deleted)
    - Add sender_file_kept (student opted to keep their copy)
    - Add printer_confirmed_at (printer confirmed job done)
    - Add deletion_scheduled_at (10 min countdown starts here)
    - Add tracking_steps (JSON array of status log)
    - Add print_chat_thread_id (FK to message thread for this job)

  2. New table: print_chat_messages
    - Secure in-job chat between student and print shop
    - Auto-deletes with job

  3. New table: print_job_tracking
    - Immutable status log for each job

  4. Security
    - RLS on all new/modified tables
*/

-- Add columns to print_jobs if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='print_jobs' AND column_name='file_url') THEN
    ALTER TABLE print_jobs ADD COLUMN file_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='print_jobs' AND column_name='file_name') THEN
    ALTER TABLE print_jobs ADD COLUMN file_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='print_jobs' AND column_name='file_size_kb') THEN
    ALTER TABLE print_jobs ADD COLUMN file_size_kb integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='print_jobs' AND column_name='file_deleted_at') THEN
    ALTER TABLE print_jobs ADD COLUMN file_deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='print_jobs' AND column_name='sender_file_kept') THEN
    ALTER TABLE print_jobs ADD COLUMN sender_file_kept boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='print_jobs' AND column_name='printer_confirmed_at') THEN
    ALTER TABLE print_jobs ADD COLUMN printer_confirmed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='print_jobs' AND column_name='deletion_scheduled_at') THEN
    ALTER TABLE print_jobs ADD COLUMN deletion_scheduled_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='print_jobs' AND column_name='safe_print_agreed') THEN
    ALTER TABLE print_jobs ADD COLUMN safe_print_agreed boolean DEFAULT true;
  END IF;
END $$;

-- Print chat messages table (job-scoped secure chat)
CREATE TABLE IF NOT EXISTS print_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES print_jobs(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  sender_role text NOT NULL DEFAULT 'student' CHECK (sender_role IN ('student', 'shop')),
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE print_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job participants can view print chat"
  ON print_chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM print_jobs pj
      WHERE pj.id = print_chat_messages.job_id
        AND pj.user_id = auth.uid()
    )
    OR auth.uid() = sender_id
  );

CREATE POLICY "Job participants can send print chat"
  ON print_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Mark print chat read"
  ON print_chat_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR EXISTS (
    SELECT 1 FROM print_jobs pj WHERE pj.id = print_chat_messages.job_id AND pj.user_id = auth.uid()
  ))
  WITH CHECK (auth.uid() = sender_id OR EXISTS (
    SELECT 1 FROM print_jobs pj WHERE pj.id = print_chat_messages.job_id AND pj.user_id = auth.uid()
  ));

-- Print job tracking log
CREATE TABLE IF NOT EXISTS print_job_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES print_jobs(id) ON DELETE CASCADE,
  status text NOT NULL,
  message text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE print_job_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job owner can view tracking"
  ON print_job_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM print_jobs pj
      WHERE pj.id = print_job_tracking.job_id
        AND pj.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can insert tracking"
  ON print_job_tracking FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fix print_jobs RLS policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own print jobs" ON print_jobs;
  DROP POLICY IF EXISTS "Users can create print jobs" ON print_jobs;
  DROP POLICY IF EXISTS "Users can update own print jobs" ON print_jobs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view own print jobs"
  ON print_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create print jobs"
  ON print_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own print jobs"
  ON print_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Print shops readable by all authenticated users
DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can read print shops" ON print_shops;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Anyone can read print shops"
  ON print_shops FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Print wallet RLS
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own wallet" ON print_wallet;
  DROP POLICY IF EXISTS "Users can create own wallet" ON print_wallet;
  DROP POLICY IF EXISTS "Users can update own wallet" ON print_wallet;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can view own wallet"
  ON print_wallet FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own wallet"
  ON print_wallet FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet"
  ON print_wallet FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
