/*
  # Fix private assignment system

  1. Updates
    - Create users table to store user information
    - Update assignment functions to work with actual user data
    - Fix user lookup functionality
    - Ensure proper RLS policies

  2. Security
    - Maintain existing RLS policies
    - Add proper user data handling
*/

-- Create users table to store additional user information
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  username text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Function to sync auth.users with our users table
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'firstName', NEW.raw_user_meta_data->>'first_name'),
    COALESCE(NEW.raw_user_meta_data->>'lastName', NEW.raw_user_meta_data->>'last_name'),
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'firstName', NEW.raw_user_meta_data->>'first_name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update the user lookup function to work with our users table
CREATE OR REPLACE FUNCTION find_user_by_email_or_username(search_email text DEFAULT NULL, search_username text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
BEGIN
  -- First try to find by email
  IF search_email IS NOT NULL AND search_email != '' THEN
    SELECT id INTO user_id
    FROM users
    WHERE email = search_email
    LIMIT 1;
    
    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;
  END IF;

  -- Then try to find by username, first_name, or full name
  IF search_username IS NOT NULL AND search_username != '' THEN
    SELECT id INTO user_id
    FROM users
    WHERE 
      username = search_username OR
      first_name = search_username OR
      CONCAT(first_name, ' ', last_name) = search_username OR
      CONCAT(first_name, last_name) = search_username
    LIMIT 1;
    
    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the approve and publish function
CREATE OR REPLACE FUNCTION approve_and_publish_property(property_id uuid)
RETURNS boolean AS $$
DECLARE
  user_id uuid;
  property_exists boolean;
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  -- Check if the property exists and is assigned to this user
  SELECT EXISTS(
    SELECT 1 FROM properties 
    WHERE id = property_id 
    AND assigned_to_user_id = user_id 
    AND assignment_status = 'pending'
  ) INTO property_exists;
  
  IF NOT property_exists THEN
    RETURN false;
  END IF;
  
  -- Update the property status
  UPDATE properties 
  SET 
    assignment_status = 'published',
    approved_at = now()
  WHERE id = property_id AND assigned_to_user_id = user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get user assigned properties function
CREATE OR REPLACE FUNCTION get_user_assigned_properties(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price numeric,
  location text,
  images text[],
  bedrooms integer,
  bathrooms numeric,
  size numeric,
  amenities text[],
  type text,
  year_built integer,
  assignment_status text,
  assigned_at timestamptz,
  approved_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.price,
    p.location,
    p.images,
    p.bedrooms,
    p.bathrooms,
    p.size,
    p.amenities,
    p.type,
    p.year_built,
    p.assignment_status,
    p.assigned_at,
    p.approved_at
  FROM properties p
  WHERE p.assigned_to_user_id = user_uuid
  AND p.assignment_status IN ('pending', 'approved')
  ORDER BY p.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert existing auth users into our users table
INSERT INTO users (id, email, first_name, last_name, username)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'firstName', au.raw_user_meta_data->>'first_name', ''),
  COALESCE(au.raw_user_meta_data->>'lastName', au.raw_user_meta_data->>'last_name', ''),
  COALESCE(au.raw_user_meta_data->>'username', au.raw_user_meta_data->>'firstName', au.raw_user_meta_data->>'first_name', '')
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = au.id)
ON CONFLICT (id) DO NOTHING;