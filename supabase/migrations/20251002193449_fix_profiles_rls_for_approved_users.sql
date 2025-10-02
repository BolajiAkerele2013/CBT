/*
  # Fix RLS Policies for Approved Users

  1. Changes
    - Update the "Users can update own profile" policy to include WITH CHECK clause
    - This ensures that users can update their own profile data without being blocked
    - The policy allows users to modify their profiles as long as they're not changing their own ID

  2. Security
    - Maintains security by preventing users from impersonating others
    - Users can only update their own profile (auth.uid() = id)
    - All other RLS policies remain unchanged
*/

-- Drop and recreate the update policy with explicit WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
