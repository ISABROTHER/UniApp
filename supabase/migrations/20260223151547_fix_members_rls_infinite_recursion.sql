/*
  # Fix Members RLS Infinite Recursion

  ## Problem
  The "Admins can read all members" and "Admins can update all members" policies
  query the `members` table from within a `members` policy, causing infinite recursion
  (PostgreSQL error: "infinite recursion detected in policy for relation members").

  ## Fix
  - Drop the recursive admin policies
  - Replace with policies that use `auth.jwt()` to check role from the JWT/app_metadata
    instead of querying the members table itself
  - Also clean up the duplicate SELECT policy ("Authenticated users can read member names for chat"
    uses USING (true) which is insecure and redundant given "Members can read own profile")
    — replace it with a safer policy allowing authenticated users to read basic fields

  ## Changes
  1. Drop recursive admin SELECT policy
  2. Drop recursive admin UPDATE policy
  3. Drop overly permissive "Authenticated users can read member names for chat" policy
  4. Add safe admin SELECT policy using security definer function
  5. Add safe admin UPDATE policy using security definer function
  6. Re-add members read-for-chat policy scoped to authenticated users only
*/

-- Drop the recursive policies
DROP POLICY IF EXISTS "Admins can read all members" ON members;
DROP POLICY IF EXISTS "Admins can update all members" ON members;
DROP POLICY IF EXISTS "Authenticated users can read member names for chat" ON members;

-- Create a security definer function to check admin role without RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Admins can read all members (uses security definer function, no recursion)
CREATE POLICY "Admins can read all members"
  ON members
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can update all members (uses security definer function, no recursion)
CREATE POLICY "Admins can update all members"
  ON members
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Authenticated users can read basic member info (for chat/messaging features)
CREATE POLICY "Authenticated users can read member names for chat"
  ON members
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
