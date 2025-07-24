/*
  # Add homepage visibility toggle feature

  1. Schema Changes
    - Add `show_on_homepage` column to properties table
    - Set default value to false (hidden by default)
    - Add index for efficient filtering

  2. Security
    - Maintain existing RLS policies
*/

-- Add show_on_homepage column to properties table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'show_on_homepage'
  ) THEN
    ALTER TABLE properties ADD COLUMN show_on_homepage boolean DEFAULT false;
    
    -- Add index for efficient filtering of homepage properties
    CREATE INDEX IF NOT EXISTS properties_show_on_homepage_idx ON properties (show_on_homepage, created_at DESC);
  END IF;
END $$;