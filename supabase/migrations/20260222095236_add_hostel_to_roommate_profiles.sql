/*
  # Add Hostel Link to Roommate Profiles

  ## Summary
  Adds a hostel_id foreign key to roommate_profiles so students can indicate
  which hostel they are looking to share. This enables hostel-specific roommate
  matching shown on the hostel detail screen.

  ## Changes to roommate_profiles
  - `hostel_id` (uuid, nullable): References hostels(id), SET NULL on delete
  - Index on hostel_id for performance on detail screen queries
*/

ALTER TABLE roommate_profiles
  ADD COLUMN IF NOT EXISTS hostel_id uuid REFERENCES hostels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_roommate_profiles_hostel
  ON roommate_profiles(hostel_id);
