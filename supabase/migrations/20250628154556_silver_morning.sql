/*
  # CBT System Database Schema

  1. New Tables
    - `profiles` - User profiles with roles (creator, editor, admin, user)
    - `exams` - Main exam configuration and metadata
    - `subjects` - Exam subjects/sections with individual time limits
    - `questions` - Questions belonging to subjects with various types
    - `exam_codes` - Unique codes for exam access
    - `exam_attempts` - User exam attempts and results

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on roles
    - Creators can manage their own exams
    - Users can only access exams they have codes for

  3. Features
    - Support for multiple question types (multiple choice, true/false, fill blank, short answer)
    - Time limits per subject and overall exam
    - Exam scheduling with start/end dates
    - Code-based access control
    - Comprehensive attempt tracking
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role text DEFAULT 'user' CHECK (role IN ('creator', 'editor', 'admin', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create exams table
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  start_date timestamptz,
  end_date timestamptz,
  time_limit integer, -- in minutes
  shuffle_questions boolean DEFAULT false,
  show_results boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  time_limit integer, -- in minutes
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'fill_blank', 'short_answer')),
  question_text text NOT NULL,
  options text[], -- JSON array for multiple choice options
  correct_answers text[] NOT NULL, -- Array to support multiple correct answers
  points integer DEFAULT 1,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create exam codes table
CREATE TABLE IF NOT EXISTS exam_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  code text UNIQUE NOT NULL,
  user_email text NOT NULL,
  used boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create exam attempts table
CREATE TABLE IF NOT EXISTS exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  code_id uuid REFERENCES exam_codes(id) ON DELETE CASCADE NOT NULL,
  answers jsonb DEFAULT '{}',
  score integer,
  total_points integer NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  time_spent integer -- in minutes
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Exams policies
CREATE POLICY "Creators can manage own exams"
  ON exams
  FOR ALL
  TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Users can read published exams they have codes for"
  ON exams
  FOR SELECT
  TO authenticated
  USING (
    status = 'published' AND
    id IN (
      SELECT exam_id FROM exam_codes 
      WHERE user_email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

-- Subjects policies
CREATE POLICY "Creators can manage subjects of own exams"
  ON subjects
  FOR ALL
  TO authenticated
  USING (
    exam_id IN (SELECT id FROM exams WHERE creator_id = auth.uid())
  );

CREATE POLICY "Users can read subjects of accessible exams"
  ON subjects
  FOR SELECT
  TO authenticated
  USING (
    exam_id IN (
      SELECT id FROM exams WHERE 
      status = 'published' AND
      id IN (
        SELECT exam_id FROM exam_codes 
        WHERE user_email = (SELECT email FROM profiles WHERE id = auth.uid())
      )
    )
  );

-- Questions policies
CREATE POLICY "Creators can manage questions of own exams"
  ON questions
  FOR ALL
  TO authenticated
  USING (
    subject_id IN (
      SELECT s.id FROM subjects s
      JOIN exams e ON s.exam_id = e.id
      WHERE e.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can read questions of accessible exams"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    subject_id IN (
      SELECT s.id FROM subjects s
      JOIN exams e ON s.exam_id = e.id
      WHERE e.status = 'published' AND
      e.id IN (
        SELECT exam_id FROM exam_codes 
        WHERE user_email = (SELECT email FROM profiles WHERE id = auth.uid())
      )
    )
  );

-- Exam codes policies
CREATE POLICY "Creators can manage codes for own exams"
  ON exam_codes
  FOR ALL
  TO authenticated
  USING (
    exam_id IN (SELECT id FROM exams WHERE creator_id = auth.uid())
  );

CREATE POLICY "Users can read own exam codes"
  ON exam_codes
  FOR SELECT
  TO authenticated
  USING (user_email = (SELECT email FROM profiles WHERE id = auth.uid()));

-- Exam attempts policies
CREATE POLICY "Users can manage own attempts"
  ON exam_attempts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Creators can read attempts for own exams"
  ON exam_attempts
  FOR SELECT
  TO authenticated
  USING (
    exam_id IN (SELECT id FROM exams WHERE creator_id = auth.uid())
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exams_creator_id ON exams(creator_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_subjects_exam_id ON subjects(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_codes_exam_id ON exam_codes(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_codes_code ON exam_codes(code);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON exam_attempts(user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();