/*
  # Disable email verification for user signup

  1. Changes
    - Remove email confirmation requirement for new users
    - Update existing unconfirmed users to be confirmed
    - Ensure smooth signup flow without email verification

  2. Security
    - Maintain existing RLS policies
    - Keep user data integrity
*/

-- Update all existing users to be email confirmed
-- This ensures existing users aren't locked out
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- Create a function to auto-confirm new users
CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm email for new users
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = now();
  END IF;
  
  -- Ensure confirmation token is cleared
  NEW.confirmation_token = '';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-confirm new users on signup
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;
CREATE TRIGGER auto_confirm_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_user();

-- Update existing unconfirmed users to clear confirmation tokens
UPDATE auth.users 
SET confirmation_token = ''
WHERE confirmation_token IS NOT NULL AND confirmation_token != '';

-- Create a function to handle user signup without email confirmation
CREATE OR REPLACE FUNCTION handle_signup_without_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure the user is immediately confirmed
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  NEW.confirmation_token = '';
  
  -- Set confirmed_at if not already set
  IF NEW.confirmed_at IS NULL THEN
    NEW.confirmed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the signup handler trigger
DROP TRIGGER IF EXISTS handle_signup_without_confirmation_trigger ON auth.users;
CREATE TRIGGER handle_signup_without_confirmation_trigger
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_signup_without_confirmation();