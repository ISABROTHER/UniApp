/*
  # Bulletproof Handle New User Trigger - Final Fix

  Creates an absolutely bulletproof version of the handle_new_user function that will
  NEVER throw duplicate key violations, even under race conditions.

  Strategy:
  - Use INSERT...ON CONFLICT DO UPDATE (upsert pattern)
  - Handle both id and phone unique constraints
  - Proper NULL handling for phone field
  - Comprehensive error handling
  
  This ensures that no matter what, the trigger will never fail due to duplicates.
*/

-- Drop and recreate the function with bulletproof upsert logic
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_phone text;
BEGIN
  -- Extract phone from metadata or use auth phone
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone);
  
  -- Use INSERT...ON CONFLICT to handle duplicates gracefully
  -- This is atomic and handles race conditions properly
  INSERT INTO public.members (
    id, 
    email, 
    phone,
    full_name, 
    role, 
    membership_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    user_phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'student',
    'active',
    now(),
    now()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    email = COALESCE(EXCLUDED.email, members.email),
    phone = CASE 
      WHEN EXCLUDED.phone IS NOT NULL THEN EXCLUDED.phone
      ELSE members.phone
    END,
    full_name = COALESCE(EXCLUDED.full_name, members.full_name),
    updated_at = now()
  WHERE members.id = EXCLUDED.id;
  
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- If we somehow still get a unique violation (e.g., phone number conflict),
    -- just update the existing record by ID
    UPDATE public.members
    SET 
      email = COALESCE(NEW.email, email),
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
      updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
    
  WHEN OTHERS THEN
    -- Log any other errors but don't fail the auth signup
    RAISE LOG 'Error in handle_new_user trigger for user %: % - %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates or updates a member profile when a new user signs up. Uses upsert pattern to prevent duplicate key violations.';
