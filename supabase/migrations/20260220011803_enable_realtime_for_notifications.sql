/*
  # Enable Realtime for Notifications

  1. Changes
    - Enable Supabase Realtime publication for `notifications` table
  
  2. Purpose
    - Allow live notification updates without polling
    - Enable instant alert delivery to users
*/

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;