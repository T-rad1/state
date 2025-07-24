/*
  # Add function to get user's approved properties

  1. New Functions
    - `get_user_approved_properties` - Returns properties that user has approved and are now published

  2. Security
    - Function uses SECURITY DEFINER to access data safely
    - Only returns properties assigned to the specific user
*/

-- Function to get user's approved properties
CREATE OR REPLACE FUNCTION get_user_approved_properties(user_uuid uuid)
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
  AND p.assignment_status IN ('approved', 'published')
  AND p.approved_at IS NOT NULL
  ORDER BY p.approved_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;