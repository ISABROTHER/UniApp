/*
  # Add University and Traditional Hall Fields to Members Table

  ## Summary
  This migration adds support for university affiliation and traditional hall residence
  to the members table. It also removes the unique constraint on phone numbers and 
  adds a bio field for personal descriptions.

  ## Changes
  
  1. New Columns
     - `bio` (TEXT) - Personal bio/description, nullable
     - `university` (TEXT) - Selected university/institution name, nullable
     - `traditional_hall` (TEXT) - Traditional hall of residence, nullable
  
  2. Constraint Modifications
     - Remove unique constraint from `phone` column to allow multiple users with same phone
     - This is common in African contexts where family members may share phones
  
  3. Notes
     - All new columns are nullable for backward compatibility
     - Existing data remains unchanged
     - University selection will be required for new profiles via app validation
     - Traditional hall is optional and depends on university selection
*/

-- Remove unique constraint from phone column if it exists
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_phone_unique;
DROP INDEX IF EXISTS members_phone_unique;

-- Add new columns for university affiliation
ALTER TABLE members ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS traditional_hall TEXT;

-- Create index on university for faster filtering (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_members_university ON members(university);
CREATE INDEX IF NOT EXISTS idx_members_traditional_hall ON members(traditional_hall);