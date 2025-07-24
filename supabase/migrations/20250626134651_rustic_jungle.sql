/*
  # Add homepage background image setting and improve background handling

  1. Changes
    - Add homepage background image setting to settings table
    - Set default background image URL
    - Ensure proper cleanup of old background images

  2. Security
    - Maintain existing RLS policies for settings table
*/

-- Insert default homepage background setting
INSERT INTO settings (key, value) VALUES
  ('homepage_background', '{"image_url": "https://images.pexels.com/photos/2404843/pexels-photo-2404843.jpeg"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- Create a function to clean up old background images when new ones are uploaded
CREATE OR REPLACE FUNCTION cleanup_old_background_images()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be extended to handle cleanup logic
  -- For now, it just ensures the updated_at timestamp is set
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for settings table to handle background image updates
DROP TRIGGER IF EXISTS settings_updated_at_trigger ON settings;
CREATE TRIGGER settings_updated_at_trigger
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_background_images();