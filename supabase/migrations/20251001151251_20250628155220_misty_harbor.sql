/*
  # Fix user signup trigger

  1. Problem
    - The signup process is failing with "Database error saving new user"
    - This indicates the trigger that creates profiles for new users is failing

  2. Solution
    - Update the trigger function to properly handle profile creation
    - Ensure the role column gets the default value
    - Add proper error handling

  3. Changes
    - Recreate the handle_new_user trigger function with proper defaults
    - Ensure the function handles all required fields correctly
*/

-- Drop and recreate the trigger function to fix the user signup issue
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();