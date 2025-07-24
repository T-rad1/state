/*
  # Add profile picture support and user profile management

  1. Schema Changes
    - Add `profile_picture_url` column to users table
    - Create profile pictures storage bucket
    - Set up storage policies for profile pictures

  2. Security
    - Users can upload/update their own profile pictures
    - Public read access for profile pictures
    - Secure file naming and storage
*/

-- Add profile_picture_url column to users table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_picture_url text;
  END IF;
END $$;

-- Create profile pictures storage bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'profile-pictures'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('profile-pictures', 'profile-pictures', true);
  END IF;
END $$;

-- Storage policies for profile pictures
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;

-- Allow users to upload their own profile pictures
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view profile pictures
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Function to get default avatar URL
CREATE OR REPLACE FUNCTION get_default_avatar_url()
RETURNS text AS $$
BEGIN
  RETURN 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1';
END;
$$ LANGUAGE plpgsql;

-- Update existing users to have default avatar if no profile picture
UPDATE users 
SET profile_picture_url = get_default_avatar_url()
WHERE profile_picture_url IS NULL OR profile_picture_url = '';