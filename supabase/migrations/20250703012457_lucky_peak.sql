/*
  # Fix all RLS policies and storage permissions

  1. Database Policies
    - Ensure public read access to properties and settings
    - Fix storage bucket permissions
    - Verify all policies are correctly applied

  2. Storage
    - Ensure property-images bucket allows public read
    - Fix any storage policy conflicts
*/

-- First, let's ensure RLS is enabled on all tables
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can view properties" ON properties;
DROP POLICY IF EXISTS "Allow public read" ON properties;
DROP POLICY IF EXISTS "Public read access" ON properties;
DROP POLICY IF EXISTS "Only admins can insert properties" ON properties;
DROP POLICY IF EXISTS "Only admins can update properties" ON properties;
DROP POLICY IF EXISTS "Only admins can delete properties" ON properties;
DROP POLICY IF EXISTS "Allow_upload" ON properties;
DROP POLICY IF EXISTS "Users can view properties assigned to them" ON properties;

DROP POLICY IF EXISTS "Anyone can view settings" ON settings;
DROP POLICY IF EXISTS "Only admins can modify settings" ON settings;

-- Create simple, clear policies for properties table
CREATE POLICY "Enable read access for all users" ON properties
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON properties
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON properties
  FOR UPDATE 
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" ON properties
  FOR DELETE 
  TO authenticated
  USING (true);

-- Create simple, clear policies for settings table
CREATE POLICY "Enable read access for all users" ON settings
  FOR SELECT USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON settings
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure the property-images bucket exists and is public
DO $$
BEGIN
  -- Create bucket if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'property-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('property-images', 'property-images', true);
  ELSE
    -- Make sure existing bucket is public
    UPDATE storage.buckets 
    SET public = true 
    WHERE id = 'property-images';
  END IF;
END $$;

-- Drop all existing storage policies
DROP POLICY IF EXISTS "Allow admins to upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to delete property images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view property images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view property images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own property images" ON storage.objects;
DROP POLICY IF EXISTS "allow authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete property images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update property images" ON storage.objects;

-- Create simple storage policies
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated users can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-images');

-- Insert some test data if properties table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM properties LIMIT 1) THEN
    INSERT INTO properties (
      title, 
      description, 
      price, 
      location, 
      images, 
      bedrooms, 
      bathrooms, 
      size, 
      amenities, 
      type, 
      year_built, 
      show_on_homepage, 
      assignment_status
    ) VALUES 
    (
      'Modern Downtown Apartment',
      'Beautiful modern apartment in the heart of downtown with stunning city views and premium amenities.',
      450000,
      'Downtown District, Metropolitan City',
      ARRAY[
        'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg',
        'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'
      ],
      2,
      2,
      1200,
      ARRAY['Air Conditioning', 'Balcony', 'Gym Access', 'Parking', 'Pool'],
      'apartment',
      2021,
      true,
      'published'
    ),
    (
      'Luxury Waterfront Condo',
      'Spectacular waterfront condominium with panoramic ocean views and world-class amenities.',
      750000,
      'Waterfront District, Coastal City',
      ARRAY[
        'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg',
        'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg'
      ],
      3,
      2.5,
      1800,
      ARRAY['Ocean View', 'Concierge', 'Spa', 'Marina Access', 'Rooftop Deck'],
      'condo',
      2020,
      true,
      'published'
    ),
    (
      'Charming Garden Townhouse',
      'Elegant townhouse with private garden, perfect for families seeking comfort and style.',
      320000,
      'Garden District, Suburban Area',
      ARRAY[
        'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg',
        'https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg'
      ],
      3,
      2,
      1500,
      ARRAY['Private Garden', 'Fireplace', 'Garage', 'Pet Friendly', 'Playground'],
      'townhouse',
      2019,
      true,
      'published'
    );
  END IF;
END $$;

-- Insert default settings if they don't exist
INSERT INTO settings (key, value) VALUES
  ('site_info', '{"title": "HomeVista", "description": "Find your dream home with our AI-powered apartment marketplace."}'::jsonb),
  ('contact_info', '{"admin_email": "admin@example.com"}'::jsonb),
  ('homepage_background', '{"image_url": "https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg"}'::jsonb)
ON CONFLICT (key) DO NOTHING;