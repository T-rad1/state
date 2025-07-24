/*
  # Global PDF Upload and Enhanced Platform Request System

  1. New Features
    - Add global user manual URL to settings table
    - Create user manuals storage bucket
    - Add approval/rejection status to purchase requests
    - Add notification system for users

  2. Storage
    - Create user-manuals bucket for global PDF storage
    - Set up proper storage policies

  3. Security
    - Maintain existing RLS policies
    - Add admin-only access for manual uploads
    - Secure notification system
*/

-- Create user-manuals storage bucket for global PDF uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'user-manuals'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('user-manuals', 'user-manuals', true);
  END IF;
END $$;

-- Storage policies for user manuals
DROP POLICY IF EXISTS "Admins can upload user manuals" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view user manuals" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update user manuals" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete user manuals" ON storage.objects;

-- Allow admins to upload user manuals
CREATE POLICY "Admins can upload user manuals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-manuals'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Allow anyone to view user manuals
CREATE POLICY "Anyone can view user manuals"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-manuals');

-- Allow admins to update user manuals
CREATE POLICY "Admins can update user manuals"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-manuals'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Allow admins to delete user manuals
CREATE POLICY "Admins can delete user manuals"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-manuals'
  AND EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Add global user manual URL to settings
INSERT INTO settings (key, value) VALUES
  ('global_user_manual', '{"pdf_url": "", "filename": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add admin response fields to purchase_requests table
DO $$
BEGIN
  -- Add admin_response column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_requests' AND column_name = 'admin_response'
  ) THEN
    ALTER TABLE purchase_requests ADD COLUMN admin_response text;
  END IF;

  -- Add admin_responded_at timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_requests' AND column_name = 'admin_responded_at'
  ) THEN
    ALTER TABLE purchase_requests ADD COLUMN admin_responded_at timestamptz;
  END IF;

  -- Add admin_user_id to track which admin responded
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_requests' AND column_name = 'admin_user_id'
  ) THEN
    ALTER TABLE purchase_requests ADD COLUMN admin_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Update the status enum to include approved and rejected
ALTER TABLE purchase_requests 
DROP CONSTRAINT IF EXISTS purchase_requests_status_check;

ALTER TABLE purchase_requests 
ADD CONSTRAINT purchase_requests_status_check 
CHECK (status IN ('pending', 'contacted', 'approved', 'rejected', 'completed', 'cancelled'));

-- Function to approve a purchase request
CREATE OR REPLACE FUNCTION approve_purchase_request(
  request_id uuid,
  admin_response_text text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the current admin user ID
  admin_id := auth.uid();
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = admin_id
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Update the request status to approved
  UPDATE purchase_requests 
  SET 
    status = 'approved',
    admin_response = admin_response_text,
    admin_responded_at = now(),
    admin_user_id = admin_id,
    updated_at = now()
  WHERE id = request_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a purchase request
CREATE OR REPLACE FUNCTION reject_purchase_request(
  request_id uuid,
  admin_response_text text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the current admin user ID
  admin_id := auth.uid();
  
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = admin_id
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Update the request status to rejected
  UPDATE purchase_requests 
  SET 
    status = 'rejected',
    admin_response = admin_response_text,
    admin_responded_at = now(),
    admin_user_id = admin_id,
    updated_at = now()
  WHERE id = request_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending purchase requests (for admin dashboard)
CREATE OR REPLACE FUNCTION get_pending_purchase_requests()
RETURNS TABLE (
  id uuid,
  property_id uuid,
  user_id uuid,
  user_email text,
  first_name text,
  last_name text,
  phone text,
  message text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  property_title text,
  property_price numeric,
  property_location text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    pr.id,
    pr.property_id,
    pr.user_id,
    pr.user_email,
    pr.first_name,
    pr.last_name,
    pr.phone,
    pr.message,
    pr.status,
    pr.created_at,
    pr.updated_at,
    p.title as property_title,
    p.price as property_price,
    p.location as property_location
  FROM purchase_requests pr
  JOIN properties p ON pr.property_id = p.id
  WHERE pr.status = 'pending'
  ORDER BY pr.created_at ASC;
END;
$$;

-- Function to get user notifications (approved/rejected requests)
CREATE OR REPLACE FUNCTION get_user_notifications()
RETURNS TABLE (
  id uuid,
  property_id uuid,
  property_title text,
  status text,
  admin_response text,
  admin_responded_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.property_id,
    p.title as property_title,
    pr.status,
    pr.admin_response,
    pr.admin_responded_at
  FROM purchase_requests pr
  JOIN properties p ON pr.property_id = p.id
  WHERE pr.user_id = auth.uid()
  AND pr.status IN ('approved', 'rejected')
  AND pr.admin_responded_at IS NOT NULL
  ORDER BY pr.admin_responded_at DESC;
END;
$$;

-- Function to mark notification as read (remove from pending list)
CREATE OR REPLACE FUNCTION mark_notification_read(request_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Update the request to mark it as seen by changing status
  UPDATE purchase_requests 
  SET 
    status = CASE 
      WHEN status = 'approved' THEN 'completed'
      WHEN status = 'rejected' THEN 'cancelled'
      ELSE status
    END,
    updated_at = now()
  WHERE id = request_id 
  AND user_id = auth.uid()
  AND status IN ('approved', 'rejected');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;