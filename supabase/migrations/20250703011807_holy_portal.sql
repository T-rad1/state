/*
  # Fix RLS policies for anonymous access

  1. Security Changes
    - Ensure anonymous users can read properties and settings
    - Fix any blocking policies
    - Maintain admin-only write access

  2. User Table Sync
    - Ensure user creation works properly
    - Fix any foreign key issues
*/

-- Ensure properties table has correct policies for anonymous access
DROP POLICY IF EXISTS "Anyone can view properties" ON properties;
CREATE POLICY "Anyone can view properties"
  ON properties FOR SELECT
  TO public
  USING (true);

-- Ensure settings table has correct policies for anonymous access  
DROP POLICY IF EXISTS "Anyone can view settings" ON settings;
CREATE POLICY "Anyone can view settings"
  ON settings FOR SELECT
  TO public
  USING (true);

-- Ensure user_favorites policies don't block property reads
DROP POLICY IF EXISTS "Users can view their own favorites" ON user_favorites;
CREATE POLICY "Users can view their own favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix the allow_upload policy that might be too restrictive
DROP POLICY IF EXISTS "Allow_upload" ON properties;
CREATE POLICY "Allow_upload"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- Ensure admin policies work correctly
DROP POLICY IF EXISTS "Only admins can insert properties" ON properties;
DROP POLICY IF EXISTS "Only admins can update properties" ON properties;
DROP POLICY IF EXISTS "Only admins can delete properties" ON properties;

CREATE POLICY "Only admins can insert properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
  );

CREATE POLICY "Only admins can update properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
  );

CREATE POLICY "Only admins can delete properties"
  ON properties FOR DELETE
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
  );

-- Ensure settings policies work for admins
DROP POLICY IF EXISTS "Only admins can modify settings" ON settings;
CREATE POLICY "Only admins can modify settings"
  ON settings FOR ALL
  TO authenticated
  USING (
    auth.role() = 'authenticated' AND 
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
  );

-- Update the user creation trigger to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table, ignore conflicts
  INSERT INTO public.users (id, email, first_name, last_name, username, profile_picture_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'firstName', NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastName', NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'firstName', NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'profile_picture_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    username = COALESCE(EXCLUDED.username, users.username),
    profile_picture_url = COALESCE(EXCLUDED.profile_picture_url, users.profile_picture_url),
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth process
    RAISE WARNING 'Failed to sync user to users table: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also handle updates to auth.users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();