/*
  # Fix Admin Update Policy for Profiles

  1. Changes
    - Add WITH CHECK clause to "Admins can update all profiles" policy
    - This ensures admins can update any profile while maintaining security
    - Prevents potential RLS check failures during profile updates

  2. Security
    - Admins can update any profile
    - Maintains check that the requester is an admin
    - Consistent policy structure across all update operations
*/

-- Drop and recreate the admin update policy with explicit WITH CHECK
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
