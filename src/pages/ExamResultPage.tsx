import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Clock, 
  FileText, 
  Printer,
  Home,
  BarChart3,
  Award,
  Target,
  User
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface SubjectResult {
  id: string
  name: string
  pass_mark: number
  score: number
  total_points: number
  passed: boolean
}

interface ExamResult {
  id: string
  exam_id: string
  exam_title: string
  exam_description: string | null
  score: number
  total_points: number
  time_spent: number | null
  completed_at: string
  passed: boolean
  show_results: boolean
  subjects: SubjectResult[]
  user_name: string | null
  user_email: string
}

export function ExamResultPage() {
  const { examId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [result, setResult] = useState<ExamResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (examId && user) {
      loadExamResult()
    }
  }, [examId, user])

  const loadExamResult = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get the most recent exam attempt for this user and exam
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          exams (
            title,
            description,
            show_results,
            subjects (
              id,
              name,
              pass_mark
            )
          ),
          profiles (
            full_name,
            email
          )
        `)
        .eq('exam_id', examId)
        .eq('user_id', user!.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

      if (attemptError) throw attemptError

      if (!attempt) {
        throw new Error('No completed exam attempt found')
      }

      // Calculate subject-wise scores
      const subjectScores = await calculateSubjectScores(attempt.answers, attempt.exams.subjects)

      // Calculate overall pass status based on average pass mark
      const overallPassMark = subjectScores.length > 0 
        ? subjectScores.reduce((sum, s) => sum + s.pass_mark, 0) / subjectScores.length
        : 60
      const overallPassed = attempt.score >= overallPassMark

      setResult({
        id: attempt.id,
        exam_id: attempt.exam_id,
        exam_title: attempt.exams.title,
        exam_description: attempt.exams.description,
        score: attempt.score,
        total_points: attempt.total_points,
        time_spent: attempt.time_spent,
        completed_at: attempt.completed_at,
        passed: overallPassed,
        show_results: attempt.exams.show_results,
        subjects: subjectScores,
        user_name: attempt.profiles.full_name,
        user_email: attempt.profiles.email
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exam result')
    } finally {
      setLoading(false)
    }
  }

  const calculateSubjectScores = async (answers: any, subjects: any[]): Promise<SubjectResult[]> => {
    const subjectScores: SubjectResult[] = []

    for (const subject of subjects) {
      // Get questions for this subject
      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('subject_id', subject.id)

      if (!questions) continue

      let subjectScore = 0
      let subjectTotalPoints = 0

      questions.forEach(question => {
        subjectTotalPoints += question.points
        const userAnswer = answers[question.id]
        
        if (userAnswer) {
          // Handle different question types
          if (question.type === 'multiple_choice' || question.type === 'true_false') {
            if (question.correct_answers.includes(userAnswer)) {
              subjectScore += question.points
            }
          } else if (question.type === 'fill_blank' || question.type === 'short_answer') {
            // For text answers, check if user answer matches any correct answer (case insensitive)
            const userAnswerLower = userAnswer.toLowerCase().trim()
            const hasCorrectAnswer = question.correct_answers.some(correctAnswer => 
              correctAnswer.toLowerCase().trim() === userAnswerLower
            )
            if (hasCorrectAnswer) {
              subjectScore += question.points
            }
          }
        }
      })

      const subjectPercentage = subjectTotalPoints > 0 ? Math.round((subjectScore / subjectTotalPoints) * 100) : 0
      const subjectPassed = subjectPercentage >= subject.pass_mark

      subjectScores.push({
        id: subject.id,
        name: subject.name,
        pass_mark: subject.pass_mark,
        score: subjectPercentage,
        total_points: subjectTotalPoints,
        passed: subjectPassed
      })
    }

    return subjectScores
  }

  const handlePrint = () => {
    window.print()
  }

  const handleReturnToDashboard = () => {
    navigate('/dashboard')
  }

  const getScoreColor = (score: number, passMark: number) => {
    if (score >= passMark) return 'text-green-600'
    if (score >= passMark * 0.8) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeColor = (score: number, passMark: number) => {
    if (score >= passMark) return 'bg-green-100 text-green-800'
    if (score >= passMark * 0.8) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading your results...</p>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">Unable to Load Results</h1>
            <p className="text-secondary-600 mb-4">{error || 'Results not found'}</p>
            <button
              onClick={handleReturnToDashboard}
              className="btn-primary px-4 py-2"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!result.show_results) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            <FileText className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">Exam Completed</h1>
            <p className="text-secondary-600 mb-4">
              Your exam has been submitted successfully. Results will be available later.
            </p>
            <button
              onClick={handleReturnToDashboard}
              className="btn-primary px-4 py-2"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const overallPassMark = result.subjects.length > 0 
    ? result.subjects.reduce((sum, s) => sum + s.pass_mark, 0) / result.subjects.length
    : 60

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .card { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="max-w-4xl mx-auto p-4">
        {/* Header - No Print */}
        <div className="no-print mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Exam Results</h1>
            <p className="text-secondary-600">Your performance summary</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="btn-outline px-4 py-2 flex items-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print Results</span>
            </button>
            <button
              onClick={handleReturnToDashboard}
              className="btn-primary px-4 py-2 flex items-center space-x-2"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* Print Header */}
        <div className="print-only mb-6 text-center border-b pb-4">
          <h1 className="text-3xl font-bold text-secondary-900">Exam Results Certificate</h1>
          <p className="text-secondary-600 mt-2">Computer-Based Testing System</p>
        </div>

        {/* Main Result Card */}
        <div className="card p-8 mb-6">
          {/* Student Information - Prominent Display */}
          <div className="text-center mb-8 border-b border-secondary-200 pb-6">
            <div className="flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-primary-600 mr-3" />
              <div className="text-left">
                <h2 className="text-2xl font-bold text-secondary-900">
                  {result.user_name || 'Student Name Not Available'}
                </h2>
                <p className="text-lg text-secondary-600">{result.user_email}</p>
              </div>
            </div>
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <p className="text-sm text-primary-700">
                This certificate belongs to the above named individual
              </p>
            </div>
          </div>

          {/* Pass/Fail Status */}
          <div className="text-center mb-8">
            {result.passed ? (
              <div>
                <Trophy className="h-20 w-20 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-3xl font-bold text-green-600 mb-2">Congratulations!</h3>
                <p className="text-xl text-secondary-900 mb-2">
                  <strong>{result.user_name || result.user_email}</strong> passed the exam!
                </p>
                <p className="text-secondary-600">
                  You have successfully met the pass mark requirements for this examination.
                </p>
              </div>
            ) : (
              <div>
                <XCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
                <h3 className="text-3xl font-bold text-red-600 mb-2">Unfortunately</h3>
                <p className="text-xl text-secondary-900 mb-2">
                  <strong>{result.user_name || result.user_email}</strong> didn't meet the pass mark for this exam
                </p>
                <p className="text-secondary-600">
                  Don't worry! You can review the material and try again when available.
                </p>
              </div>
            )}
          </div>

          {/* Exam Information */}
          <div className="border-t border-secondary-200 pt-6 mb-6">
            <h4 className="text-xl font-semibold text-secondary-900 mb-4">{result.exam_title}</h4>
            {result.exam_description && (
              <p className="text-secondary-600 mb-4">{result.exam_description}</p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-secondary-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-secondary-900">{result.score}%</div>
                <div className="text-sm text-secondary-600">Overall Score</div>
              </div>
              
              <div className="p-4 bg-secondary-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-secondary-900">{Math.round(overallPassMark)}%</div>
                <div className="text-sm text-secondary-600">Required Pass Mark</div>
              </div>
              
              <div className="p-4 bg-secondary-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-secondary-900">
                  {result.time_spent ? `${result.time_spent} min` : 'N/A'}
                </div>
                <div className="text-sm text-secondary-600">Time Spent</div>
              </div>
            </div>
          </div>

          {/* Subject-wise Results */}
          {result.subjects.length > 0 && (
            <div className="border-t border-secondary-200 pt-6">
              <h5 className="text-lg font-semibold text-secondary-900 mb-4">Subject-wise Performance</h5>
              <div className="space-y-4">
                {result.subjects.map((subject) => (
                  <div key={subject.id} className="border border-secondary-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h6 className="font-medium text-secondary-900">{subject.name}</h6>
                      <div className="flex items-center space-x-2">
                        {subject.passed ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`font-bold text-lg ${getScoreColor(subject.score, subject.pass_mark)}`}>
                          {subject.score}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary-600">
                        Pass Mark: {subject.pass_mark}%
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreBadgeColor(subject.score, subject.pass_mark)}`}>
                        {subject.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-secondary-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            subject.passed ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(subject.score, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-secondary-500 mt-1">
                        <span>0%</span>
                        <span className="font-medium">Pass: {subject.pass_mark}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completion Details */}
          <div className="border-t border-secondary-200 pt-6 mt-6">
            <div className="text-sm text-secondary-600 space-y-1">
              <p><strong>Student:</strong> {result.user_name || result.user_email}</p>
              <p><strong>Email:</strong> {result.user_email}</p>
              <p><strong>Completed:</strong> {new Date(result.completed_at).toLocaleString()}</p>
              <p><strong>Total Points:</strong> {Math.round((result.score / 100) * result.total_points)} / {result.total_points}</p>
              {result.time_spent && (
                <p><strong>Time Taken:</strong> {result.time_spent} minutes</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons - No Print */}
        <div className="no-print text-center space-x-4">
          <button
            onClick={handlePrint}
            className="btn-outline px-6 py-3 flex items-center space-x-2 mx-auto"
          >
            <Printer className="h-5 w-5" />
            <span>Print Certificate</span>
          </button>
          
          <button
            onClick={handleReturnToDashboard}
            className="btn-primary px-6 py-3 flex items-center space-x-2 mx-auto"
          >
            <Home className="h-5 w-5" />
            <span>Return to Dashboard</span>
          </button>
        </div>

        {/* Print Footer */}
        <div className="print-only mt-8 pt-4 border-t text-center text-sm text-secondary-600">
          <p>This is an official result certificate from the Computer-Based Testing System</p>
          <p>Student: <strong>{result.user_name || result.user_email}</strong> • Email: {result.user_email}</p>
          <p>Generated on: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}