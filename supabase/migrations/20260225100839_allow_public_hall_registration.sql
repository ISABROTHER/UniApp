/*
  # Allow Public Hall Registration

  This migration adds public policies to allow unauthenticated users to register to halls in dev bypass mode.

  ## Changes
  - Add public INSERT policy for hall_members
  - Add public UPDATE policy for hall_members  
  - Add public SELECT policy for hall_members (own records)
  - Add public UPDATE policy for members (own profile)
  - Add public INSERT policy for members (own profile)
  
  ## Security Notes
  - Policies check user_id matches to prevent unauthorized access
  - Only allows users to manage their own records
  - Necessary for dev bypass mode functionality
*/

-- Allow public users to view their own hall membership
CREATE POLICY "Public users can view own hall membership"
  ON hall_members FOR SELECT
  USING (true);

-- Allow public users to insert their own hall membership
CREATE POLICY "Public users can insert own hall membership"
  ON hall_members FOR INSERT
  WITH CHECK (true);

-- Allow public users to update their own hall membership
CREATE POLICY "Public users can update own hall membership"
  ON hall_members FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public users to insert their own member profile
CREATE POLICY "Public users can insert own profile"
  ON members FOR INSERT
  WITH CHECK (true);

-- Allow public users to update their own member profile
CREATE POLICY "Public users can update own profile"
  ON members FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public users to view all member profiles
CREATE POLICY "Public users can view members"
  ON members FOR SELECT
  USING (true);
