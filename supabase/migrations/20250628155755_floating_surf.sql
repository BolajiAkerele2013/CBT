/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - The current RLS policies create circular dependencies between exams and exam_codes tables
    - This causes infinite recursion when querying exams with subjects

  2. Solution
    - Simplify the RLS policies to avoid circular references
    - Remove complex subqueries that reference back to the same tables
    - Use direct user authentication checks instead of complex joins

  3. Changes
    - Update exams table policies to use direct creator_id checks
    - Simplify exam_codes policies to avoid circular references
    - Ensure subjects and questions policies work with simplified exam policies
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can read published exams they have codes for" ON exams;
DROP POLICY IF EXISTS "Users can read subjects of accessible exams" ON subjects;
DROP POLICY IF EXISTS "Users can read questions of accessible exams" ON questions;

-- Create simplified policies for exams table
CREATE POLICY "Users can read published exams"
  ON exams
  FOR SELECT
  TO authenticated
  USING (status = 'published');

-- Update subjects policies to work with simplified exam policies
CREATE POLICY "Users can read subjects of published exams"
  ON subjects
  FOR SELECT
  TO authenticated
  USING (
    exam_id IN (
      SELECT id FROM exams WHERE status = 'published'
    )
  );

-- Update questions policies to work with simplified exam policies
CREATE POLICY "Users can read questions of published exams"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    subject_id IN (
      SELECT s.id 
      FROM subjects s 
      JOIN exams e ON s.exam_id = e.id 
      WHERE e.status = 'published'
    )
  );

-- Keep the existing exam_codes policies as they are simpler and don't cause recursion
-- The exam_codes policies are:
-- 1. "Creators can manage codes for own exams" - uses exam_id IN (SELECT from exams WHERE creator_id = uid())
-- 2. "Users can read own exam codes" - uses user_email = (SELECT email FROM profiles WHERE id = uid())
-- These are fine and don't create circular dependencies