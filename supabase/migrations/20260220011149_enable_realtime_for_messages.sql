/*
  # Enable Realtime for Messages

  1. Changes
    - Enable Supabase Realtime publication for `messages` table
    - Enable Supabase Realtime publication for `message_threads` table
  
  2. Purpose
    - Allow live message updates in chat screens
    - Enable instant message delivery without polling
*/

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_threads;