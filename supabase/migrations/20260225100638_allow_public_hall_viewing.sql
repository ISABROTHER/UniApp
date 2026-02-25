/*
  # Allow Public Viewing of Active Halls

  This migration adds a public read policy for the halls table to allow unauthenticated users to view active halls. This is necessary for the hall designation screen to work properly in dev bypass mode and for users who haven't signed in yet.

  ## Changes
  - Add public SELECT policy for active halls
  
  ## Security Notes
  - Hall information is public campus data (hall names, types, categories)
  - Only active halls are visible
  - No write permissions for unauthenticated users
*/

-- Drop the existing authenticated-only policy
DROP POLICY IF EXISTS "Authenticated users can view active halls" ON halls;

-- Create a new public policy that allows anyone to view active halls
CREATE POLICY "Anyone can view active halls"
  ON halls FOR SELECT
  USING (is_active = true);
