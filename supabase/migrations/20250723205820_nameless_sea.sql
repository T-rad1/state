/*
  # Add Storage Upload Policy for Authenticated Users

  1. Security
    - Add RLS policy to allow authenticated users to upload files to property-images bucket
    - This enables admin users to upload global user manuals and other documents
    - Policy restricts uploads to authenticated users only for security

  2. Changes
    - Creates INSERT policy on storage.objects for property-images bucket
    - Allows authenticated users to upload files
    - Maintains security by requiring authentication
*/

-- Add policy to allow authenticated users to upload files to the property-images bucket
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-images');

-- Also add policy to allow authenticated users to update files (for upsert operations)
CREATE POLICY "Allow authenticated users to update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'property-images')
WITH CHECK (bucket_id = 'property-images');

-- Add policy to allow authenticated users to delete files (for cleanup operations)
CREATE POLICY "Allow authenticated users to delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'property-images');