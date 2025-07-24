/*
  # Create user favorites system

  1. New Tables
    - `user_favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `property_id` (uuid, foreign key to properties)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `user_favorites` table
    - Add policies for users to manage their own favorites
    - Ensure users can only see/modify their own favorites

  3. Indexes
    - Add indexes for efficient querying
    - Unique constraint to prevent duplicate favorites
*/

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, property_id)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS user_favorites_user_id_idx ON user_favorites (user_id);
CREATE INDEX IF NOT EXISTS user_favorites_property_id_idx ON user_favorites (property_id);
CREATE INDEX IF NOT EXISTS user_favorites_created_at_idx ON user_favorites (created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for user favorites
CREATE POLICY "Users can view their own favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
  ON user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON user_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to get user's favorite properties with property details
CREATE OR REPLACE FUNCTION get_user_favorites(user_uuid uuid)
RETURNS TABLE (
  favorite_id uuid,
  property_id uuid,
  title text,
  location text,
  price numeric,
  images text[],
  bedrooms integer,
  bathrooms numeric,
  size numeric,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uf.id as favorite_id,
    p.id as property_id,
    p.title,
    p.location,
    p.price,
    p.images,
    p.bedrooms,
    p.bathrooms,
    p.size,
    uf.created_at
  FROM user_favorites uf
  JOIN properties p ON uf.property_id = p.id
  WHERE uf.user_id = user_uuid
  ORDER BY uf.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;