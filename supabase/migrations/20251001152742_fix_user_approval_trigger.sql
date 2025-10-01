/*
  # Fix User Approval System

  1. Changes
    - Update the handle_new_user trigger function to set approved = false by default
    - This ensures all new signups require admin approval
    - Existing users with approved = NULL will need manual approval
    
  2. Security
    - New users cannot access the system until approved
    - Maintains RLS policies from previous migrations
*/

-- Update the trigger function to set approved = false for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user',
    false  -- New users are not approved by default
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update any existing NULL approved values to false for safety
UPDATE profiles 
SET approved = false 
WHERE approved IS NULL;

-- Optional: Auto-approve the first admin user (if needed for testing)
-- Uncomment the following lines if you want the first user to be auto-approved
-- UPDATE profiles 
-- SET approved = true, approved_at = NOW()
-- WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1)
-- AND NOT EXISTS (SELECT 1 FROM profiles WHERE approved = true);
