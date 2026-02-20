/*
  # Seed Demo Owner in Members + Fix Message RLS

  1. Changes
    - Insert the demo hostel owner into members table so chat can resolve their name
    - Fix message_threads RLS: allow participants to read and insert their own threads
    - Fix messages RLS: allow sender/receiver to read and insert messages

  2. Notes
    - Owner id matches profiles table: a0000000-0000-0000-0000-000000000001
    - RLS policies are restrictive - only participants can see their own threads/messages
*/

INSERT INTO members (id, full_name, email, phone, faculty, hall_of_residence, role, membership_status)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Kofi Mensah (Owner)',
  'kofi.mensah.owner@ucchousing.edu.gh',
  '+233244001122',
  'Housing Management',
  'UCC Campus',
  'owner',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Drop old policies if they exist then recreate cleanly
DO $$ BEGIN
  DROP POLICY IF EXISTS "Participants can view their threads" ON message_threads;
  DROP POLICY IF EXISTS "Users can create threads" ON message_threads;
  DROP POLICY IF EXISTS "Participants can update threads" ON message_threads;
  DROP POLICY IF EXISTS "Participants can view messages" ON messages;
  DROP POLICY IF EXISTS "Senders can insert messages" ON messages;
  DROP POLICY IF EXISTS "Receivers can mark messages read" ON messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Participants can view their threads"
  ON message_threads FOR SELECT
  TO authenticated
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create threads"
  ON message_threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Participants can update threads"
  ON message_threads FOR UPDATE
  TO authenticated
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2)
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Senders can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receivers can mark messages read"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Also allow reading members for chat (need to see other participant's name)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can read member names for chat" ON members;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Authenticated users can read member names for chat"
  ON members FOR SELECT
  TO authenticated
  USING (true);
