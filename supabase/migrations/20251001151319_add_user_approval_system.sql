/*
  # Add User Approval System

  1. New Columns
    - `profiles.approved` (boolean, default false) - Whether the user has been approved by an admin
    - `profiles.approved_at` (timestamptz) - When the user was approved
    - `profiles.approved_by` (uuid) - Which admin approved the user

  2. Security Updates
    - Add RLS policies for admins to view all profiles
    - Add RLS policies for admins to update approval status
    - Grant admins permission to manage user approvals

  3. Important Notes
    - Existing users will have approved set to false by default
    - Admins need to manually approve existing users
    - New signups will require admin approval before accessing the system
*/

-- Add approval-related columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'approved'
  ) THEN
    ALTER TABLE profiles ADD COLUMN approved boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN approved_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Add comments to document the columns
COMMENT ON COLUMN profiles.approved IS 'Whether the user has been approved by an admin';
COMMENT ON COLUMN profiles.approved_at IS 'Timestamp when the user was approved';
COMMENT ON COLUMN profiles.approved_by IS 'Admin user ID who approved this user';

-- Create index on approved column for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON profiles(approved);

-- Add RLS policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add RLS policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add RLS policy for creators to view all profiles (for user management)
CREATE POLICY "Creators can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('creator', 'admin')
    )
  );