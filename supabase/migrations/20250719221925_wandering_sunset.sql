/*
  # Add Global User Manual Setting

  1. New Setting
    - Add `global_user_manual` setting to store the global PDF URL and filename
  
  2. Security
    - Uses existing RLS policies on settings table
*/

-- Insert or update the global user manual setting
INSERT INTO settings (key, value, created_at, updated_at)
VALUES (
  'global_user_manual',
  '{"pdf_url": null, "filename": null, "uploaded_at": null}'::jsonb,
  now(),
  now()
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = now();