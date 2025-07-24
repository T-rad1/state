/*
  # Add private property assignment system

  1. Schema Changes
    - Add `assigned_to_user_id` column to properties table
    - Add `assigned_to_email` column for email-based assignment
    - Add `assigned_to_username` column for username-based assignment
    - Add `assignment_status` column (pending, approved, published)
    - Add `assigned_at` timestamp
    - Add `approved_at` timestamp

  2. Security
    - Maintain existing RLS policies
    - Add policies for assigned properties
*/

-- Add assignment columns to properties table
DO $$ 
BEGIN
  -- Add assigned_to_user_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'assigned_to_user_id'
  ) THEN
    ALTER TABLE properties ADD COLUMN assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add assigned_to_email column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'assigned_to_email'
  ) THEN
    ALTER TABLE properties ADD COLUMN assigned_to_email text;
  END IF;

  -- Add assigned_to_username column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'assigned_to_username'
  ) THEN
    ALTER TABLE properties ADD COLUMN assigned_to_username text;
  END IF;

  -- Add assignment_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'assignment_status'
  ) THEN
    ALTER TABLE properties ADD COLUMN assignment_status text DEFAULT 'published' CHECK (assignment_status IN ('pending', 'approved', 'published'));
  END IF;

  -- Add assigned_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'assigned_at'
  ) THEN
    ALTER TABLE properties ADD COLUMN assigned_at timestamptz;
  END IF;

  -- Add approved_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE properties ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS properties_assigned_to_user_id_idx ON properties (assigned_to_user_id);
CREATE INDEX IF NOT EXISTS properties_assignment_status_idx ON properties (assignment_status);
CREATE INDEX IF NOT EXISTS properties_assigned_at_idx ON properties (assigned_at DESC);

-- Update existing properties to have 'published' status
UPDATE properties 
SET assignment_status = 'published' 
WHERE assignment_status IS NULL;

-- Create RLS policy for assigned properties
CREATE POLICY "Users can view properties assigned to them"
  ON properties FOR SELECT
  TO authenticated
  USING (
    assigned_to_user_id = auth.uid() OR
    assignment_status = 'published' OR
    assignment_status = 'approved'
  );

-- Function to approve and publish a property
CREATE OR REPLACE FUNCTION approve_and_publish_property(property_id uuid)
RETURNS boolean AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Get the current user ID
  user_id := auth.uid();
  
  -- Check if the property is assigned to this user
  IF NOT EXISTS (
    SELECT 1 FROM properties 
    WHERE id = property_id 
    AND assigned_to_user_id = user_id 
    AND assignment_status = 'pending'
  ) THEN
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

-- Function to get user's assigned properties
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