/*
  # Fix Email Rate Limit - Auto Confirm Emails

  1. Changes
    - Create trigger to auto-confirm emails on user creation
    - This prevents Supabase from sending confirmation emails
    - Since we use synthetic emails, no actual email confirmation is needed

  2. Security
    - Phone number uniqueness is still enforced
    - Authentication still requires valid credentials
*/

-- Function to auto-confirm email on user creation
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Auto-confirm the email immediately
  NEW.email_confirmed_at = NOW();
  NEW.confirmation_sent_at = NULL;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;

-- Create trigger to auto-confirm users
CREATE TRIGGER auto_confirm_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();
