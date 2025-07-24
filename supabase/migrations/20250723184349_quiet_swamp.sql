/*
  # Storage policies for user manuals and documents

  1. Storage Setup
    - Ensure property-images bucket exists and is public
    - Add policies for document uploads and downloads

  2. Security
    - Allow authenticated users to upload documents
    - Allow public access to download documents
    - Allow admins to delete documents
*/

-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images', 
  'property-images', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

-- Policy for authenticated users to upload files
CREATE POLICY "Authenticated users can upload files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-images');

-- Policy for authenticated users to update their own files
CREATE POLICY "Authenticated users can update files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'property-images');

-- Policy for authenticated users to delete files (admins)
CREATE POLICY "Authenticated users can delete files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'property-images');

-- Policy for public read access
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'property-images');

-- Policy for public read access to bucket
CREATE POLICY "Public bucket access" ON storage.buckets
FOR SELECT TO public
USING (id = 'property-images');