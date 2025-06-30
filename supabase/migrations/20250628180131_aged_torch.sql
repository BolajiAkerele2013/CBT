/*
  # Add pass marks to subjects and create exam results view

  1. New Columns
    - `subjects.pass_mark` (integer, default 60) - Pass mark percentage for each subject

  2. Views
    - `exam_results_view` - Comprehensive view for exam results with pass/fail calculation

  3. Security
    - Constraint to ensure pass_mark is between 0-100
    - View inherits security from underlying tables
*/

-- Add pass_mark column to subjects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects' AND column_name = 'pass_mark'
  ) THEN
    ALTER TABLE subjects ADD COLUMN pass_mark integer DEFAULT 60;
  END IF;
END $$;

-- Add comment to pass_mark column
COMMENT ON COLUMN subjects.pass_mark IS 'Pass mark percentage for this subject (0-100)';

-- Add constraint to ensure pass_mark is between 0 and 100
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subjects_pass_mark_check'
  ) THEN
    ALTER TABLE subjects ADD CONSTRAINT subjects_pass_mark_check CHECK (pass_mark >= 0 AND pass_mark <= 100);
  END IF;
END $$;

-- Create a view for exam results with calculated pass/fail status
CREATE OR REPLACE VIEW exam_results_view AS
SELECT 
  ea.id,
  ea.exam_id,
  ea.user_id,
  ea.code_id,
  ea.score,
  ea.total_points,
  ea.started_at,
  ea.completed_at,
  ea.time_spent,
  e.title as exam_title,
  e.description as exam_description,
  e.show_results,
  p.email as user_email,
  p.full_name as user_name,
  -- Calculate overall pass status based on weighted average of subject pass marks
  CASE 
    WHEN ea.completed_at IS NOT NULL AND ea.score IS NOT NULL THEN
      CASE 
        WHEN ea.score >= (
          SELECT COALESCE(AVG(s.pass_mark), 60)
          FROM subjects s 
          WHERE s.exam_id = ea.exam_id
        ) THEN true
        ELSE false
      END
    ELSE NULL
  END as passed
FROM exam_attempts ea
JOIN exams e ON ea.exam_id = e.id
JOIN profiles p ON ea.user_id = p.id;

-- Grant access to the view (security is inherited from underlying tables)
GRANT SELECT ON exam_results_view TO authenticated;