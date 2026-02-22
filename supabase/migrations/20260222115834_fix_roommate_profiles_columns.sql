/*
  # Fix roommate_profiles table columns

  ## Summary
  The roommate_profiles table is missing several columns that the app expects,
  and column names differ from what the UI code uses. This migration adds the
  missing columns as aliases/additions to align the schema with the application.

  ## Changes
  - Add `is_active` column (alias behavior via default from `active`)
  - Add `lifestyle_notes` column (was `bio`)
  - Add `preferred_university` column
  - Add `preferred_location` column (may already exist, use IF NOT EXISTS)
  - Add `gender_preference` column (may already exist)
  - Add `academic_level` column (may already exist)
  - Fix RLS: replace FOR ALL policy with separate INSERT/UPDATE/DELETE policies

  ## Security
  - Remove the broad FOR ALL policy
  - Add separate INSERT, UPDATE, DELETE policies (all authenticated, own data only)
  - SELECT policy already correct but restricted to `active=true`; add `is_active` support
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roommate_profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE roommate_profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
    UPDATE roommate_profiles SET is_active = active;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roommate_profiles' AND column_name = 'lifestyle_notes'
  ) THEN
    ALTER TABLE roommate_profiles ADD COLUMN lifestyle_notes text;
    UPDATE roommate_profiles SET lifestyle_notes = bio;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roommate_profiles' AND column_name = 'preferred_university'
  ) THEN
    ALTER TABLE roommate_profiles ADD COLUMN preferred_university text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roommate_profiles' AND column_name = 'preferred_location'
  ) THEN
    ALTER TABLE roommate_profiles ADD COLUMN preferred_location text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roommate_profiles' AND column_name = 'gender_preference'
  ) THEN
    ALTER TABLE roommate_profiles ADD COLUMN gender_preference text NOT NULL DEFAULT 'any';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roommate_profiles' AND column_name = 'academic_level'
  ) THEN
    ALTER TABLE roommate_profiles ADD COLUMN academic_level text;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can manage own profile" ON roommate_profiles;

CREATE POLICY "Users can insert own roommate profile"
  ON roommate_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own roommate profile"
  ON roommate_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own roommate profile"
  ON roommate_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view active profiles" ON roommate_profiles;

CREATE POLICY "Authenticated users can view active roommate profiles"
  ON roommate_profiles FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.uid() = user_id);
