/*
  # Enable Realtime for Hall Tables

  1. Tables Updated
    - `hall_posts` - Enable realtime for announcements and posts
    - `hall_events` - Enable realtime for events
    - `hall_members` - Enable realtime for membership changes
  
  2. Changes
    - Add tables to supabase_realtime publication
    - Allows real-time subscriptions to changes in hall data
  
  3. Benefits
    - Users see live updates when announcements are posted
    - Events appear immediately when created
    - Membership counts update in real-time
*/

-- Enable realtime for hall_posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'hall_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE hall_posts;
  END IF;
END $$;

-- Enable realtime for hall_events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'hall_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE hall_events;
  END IF;
END $$;

-- Enable realtime for hall_members table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'hall_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE hall_members;
  END IF;
END $$;