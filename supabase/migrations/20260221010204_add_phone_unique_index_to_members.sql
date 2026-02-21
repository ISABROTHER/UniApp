/*
  # Add partial unique index on phone in members table

  ## Summary
  Ensures each non-empty phone number can only be registered once in the members table,
  supporting phone-based login lookup. Existing rows with empty phone values are excluded.

  ## Changes
  - members: add partial unique index on `phone` WHERE phone != ''

  ## Notes
  - Uses a partial index to allow multiple empty string phone values (legacy data)
  - New registrations will always have a phone number provided
*/

CREATE UNIQUE INDEX IF NOT EXISTS members_phone_unique_nonempty
  ON public.members (phone)
  WHERE phone IS NOT NULL AND phone <> '';
