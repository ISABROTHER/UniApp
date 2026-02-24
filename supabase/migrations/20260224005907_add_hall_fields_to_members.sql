/*
  # Add Hall Fields to Members Table

  ## Summary
  The hall.tsx screen queries members.hall_id, members.student_level, and members.is_resident
  to determine which hall a user belongs to. These columns are missing from the members table.

  ## Changes to members table
  - `hall_id` (uuid, nullable) - FK reference to halls.id for quick lookup
  - `student_level` (text, nullable) - e.g. '100', '200', '300', '400', 'Postgraduate'
  - `is_resident` (boolean, default false) - whether the student lives in the hall
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'hall_id'
  ) THEN
    ALTER TABLE members ADD COLUMN hall_id UUID REFERENCES halls(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'student_level'
  ) THEN
    ALTER TABLE members ADD COLUMN student_level TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'is_resident'
  ) THEN
    ALTER TABLE members ADD COLUMN is_resident BOOLEAN DEFAULT false;
  END IF;
END $$;
