/*
  # Fix Profile Creation Trigger Robustness

  Updates the handle_new_user trigger function to be more robust and handle edge cases:
  - Properly extracts phone from metadata
  - Uses proper schema qualification
  - Better error handling

  No data changes, only improves trigger function reliability.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert new member profile with data from auth.users
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
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'student',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, members.email),
    phone = COALESCE(EXCLUDED.phone, members.phone),
    full_name = COALESCE(EXCLUDED.full_name, members.full_name),
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;
