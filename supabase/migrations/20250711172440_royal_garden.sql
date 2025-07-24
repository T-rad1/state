/*
  # Purchase System Setup

  1. New Tables
    - `purchase_requests`
      - `id` (uuid, primary key)
      - `property_id` (uuid, foreign key to properties)
      - `user_id` (uuid, foreign key to auth.users)
      - `user_email` (text)
      - `first_name` (text)
      - `last_name` (text)
      - `phone` (text, optional)
      - `message` (text, optional)
      - `status` (text, enum: pending, contacted, completed, cancelled)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Property Updates
    - Add `user_manual_url` column to properties table for PDF storage

  3. Security
    - Enable RLS on purchase_requests table
    - Add policies for users to create and view their own requests
    - Add policies for admins to view and manage all requests

  4. Functions
    - Function to get purchase requests with property details
*/

-- Add user_manual_url column to properties table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'user_manual_url'
  ) THEN
    ALTER TABLE properties ADD COLUMN user_manual_url text;
  END IF;
END $$;

-- Create purchase_requests table
CREATE TABLE IF NOT EXISTS purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS purchase_requests_property_id_idx ON purchase_requests(property_id);
CREATE INDEX IF NOT EXISTS purchase_requests_user_id_idx ON purchase_requests(user_id);
CREATE INDEX IF NOT EXISTS purchase_requests_status_idx ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS purchase_requests_created_at_idx ON purchase_requests(created_at DESC);

-- RLS Policies for purchase_requests

-- Users can insert their own purchase requests
CREATE POLICY "Users can create their own purchase requests"
  ON purchase_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own purchase requests
CREATE POLICY "Users can view their own purchase requests"
  ON purchase_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all purchase requests
CREATE POLICY "Admins can view all purchase requests"
  ON purchase_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admins can update all purchase requests
CREATE POLICY "Admins can update all purchase requests"
  ON purchase_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Function to get purchase requests with property details
CREATE OR REPLACE FUNCTION get_purchase_requests_with_property_details()
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
  ORDER BY pr.created_at DESC;
END;
$$;

-- Function to get user's own purchase requests with property details
CREATE OR REPLACE FUNCTION get_user_purchase_requests_with_property_details()
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
  WHERE pr.user_id = auth.uid()
  ORDER BY pr.created_at DESC;
END;
$$;

-- Update trigger for purchase_requests
CREATE OR REPLACE FUNCTION update_purchase_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_requests_updated_at_trigger
  BEFORE UPDATE ON purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_request_updated_at();