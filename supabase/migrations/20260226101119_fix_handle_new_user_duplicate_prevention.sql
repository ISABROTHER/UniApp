/*
  # Fix handle_new_user Trigger - Prevent Duplicate Key Violations

  Updates the handle_new_user function to properly prevent duplicate key violations
  by checking if the member already exists before attempting insert.

  Changes:
  - Check for existing member first
  - Only insert if member doesn't exist
  - Update if member exists but with different data
  - Better error handling and logging
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_exists boolean;
BEGIN
  -- Check if member already exists
  SELECT EXISTS(SELECT 1 FROM public.members WHERE id = NEW.id) INTO member_exists;
  
  IF NOT member_exists THEN
    -- Insert new member profile
    INSERT INTO public.members (
      id, 
      email, 
      phone,
      full_name, 
      role, 
      membership_status
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'student',
      'active'
    );
  ELSE
    -- Update existing member with auth data if needed
    UPDATE public.members
    SET 
      email = COALESCE(NEW.email, email),
      phone = COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, phone),
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
      updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE LOG 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
