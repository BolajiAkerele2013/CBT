import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Clock, AlertCircle, CheckCircle, Key, Calendar, CalendarX, UserX } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Question {
  id: string
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer'
  question_text: string
  options: string[]
  correct_answers: string[]
  points: number
}

interface Subject {
  id: string
  name: string
  time_limit: number | null
  pass_mark: number
  questions: Question[]
}

interface ExamData {
  id: string
  title: string
  description: string | null
  time_limit: number | null
  shuffle_questions: boolean
  show_results: boolean
  start_date: string | null
  end_date: string | null
  subjects: Subject[]
}

export function ExamTakingPage() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [examData, setExamData] = useState<ExamData | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [examStarted, setExamStarted] = useState(false)
  const [accessCode, setAccessCode] = useState('')
  const [codeId, setCodeId] = useState<string | null>(null)
  const [codeVerified, setCodeVerified] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [dateError, setDateError] = useState<string | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [userValidationError, setUserValidationError] = useState<string | null>(null)

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!user) {
      // If there's a code in the URL, preserve it in the redirect
      const codeFromUrl = searchParams.get('code')
      const redirectUrl = codeFromUrl 
        ? `/login?redirect=${encodeURIComponent(`/exam/${examId}/take?code=${codeFromUrl}`)}`
        : '/login'
      navigate(redirectUrl)
      return
    }
  }, [user, navigate, examId, searchParams])

  // Get code from URL parameters and auto-verify if available
  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl && user) {
      setAccessCode(codeFromUrl)
      // Auto-verify if code is in URL
      handleVerifyCode(codeFromUrl)
    } else if (user) {
      setLoading(false)
    }
  }, [searchParams, user])

  // Load exam data
  useEffect(() => {
    if (examId && codeVerified && user) {
      loadExamData()
    }
  }, [examId, codeVerified, user])

  const checkExamDateAvailability = (exam: any): string | null => {
    const now = new Date()
    
    // Check if exam has started
    if (exam.start_date) {
      const startDate = new Date(exam.start_date)
      if (now < startDate) {
        return `This exam is not yet available. It will start on ${startDate.toLocaleString()}.`
      }
    }
    
    // Check if exam has ended
    if (exam.end_date) {
      const endDate = new Date(exam.end_date)
      if (now > endDate) {
        return `This exam has ended. It was available until ${endDate.toLocaleString()}.`
      }
    }
    
    return null
  }

  const loadExamData = async () => {
    try {
      setLoading(true)
      setError(null)
      setDateError(null)

      // Fetch exam with subjects and questions
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .select(`
          *,
          subjects (
            *,
            questions (*)
          )
        `)
        .eq('id', examId)
        .eq('status', 'published')
        .single()

      if (examError) throw examError

      if (!exam) {
        throw new Error('Exam not found or not published')
      }

      // Check exam date availability
      const dateValidationError = checkExamDateAvailability(exam)
      if (dateValidationError) {
        setDateError(dateValidationError)
        return
      }

      // Process and flatten questions
    const subjects: Subject[] = exam.subjects?.map((subject: Subject) => ({
      id: subject.id,
      name: subject.name,
      time_limit: subject.time_limit,
      pass_mark: subject.pass_mark || 60,
      questions: subject.questions?.map((q: Question) => ({
        id: q.id,
        type: q.type,
        question_text: q.question_text,
        options: q.options || [],
        correct_answers: q.correct_answers,
        points: q.points,
      })) || [],
    })) || [];

      // Flatten all questions for easier navigation
      const flatQuestions = subjects.flatMap(subject => subject.questions)
      
      // Shuffle questions if enabled
      if (exam.shuffle_questions) {
        for (let i = flatQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [flatQuestions[i], flatQuestions[j]] = [flatQuestions[j], flatQuestions[i]]
        }
      }

      setExamData({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        time_limit: exam.time_limit,
        shuffle_questions: exam.shuffle_questions,
        show_results: exam.show_results,
        start_date: exam.start_date,
        end_date: exam.end_date,
        subjects
      })

      setAllQuestions(flatQuestions)
      
      // Set time limit (convert minutes to seconds)
      const timeInSeconds = (exam.time_limit || 60) * 60
      setTimeLeft(timeInSeconds)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exam')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (code: string) => {
    if (!code.trim()) {
      setUserValidationError('Please enter your access code')
      setLoading(false)
      return
    }

    if (!user) {
      setUserValidationError('You must be logged in to access this exam. Please log in with your account.')
      setLoading(false)
      return
    }

    try {
      setVerifyingCode(true)
      setUserValidationError(null)
      setLoading(true)
      
      // Verify code with Supabase
      const { data: codeData, error } = await supabase
        .from('exam_codes')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('exam_id', examId)
        .eq('used', false)

      if (error) {
        console.error('Database error:', error)
        setUserValidationError('Failed to verify access code. Please try again.')
        setLoading(false)
        return
      }

      // Check if any matching codes were found
      if (!codeData || codeData.length === 0) {
        setUserValidationError('Invalid or expired access code. Please check your code and try again.')
        setLoading(false)
        return
      }

      // Get the first matching code
      const code_record = codeData[0]

      // Check if code has expired
      if (code_record.expires_at && new Date(code_record.expires_at) < new Date()) {
        setUserValidationError('This access code has expired. Please contact your administrator for a new code.')
        setLoading(false)
        return
      }

      // CRITICAL: Check if user email matches the code assignment
      if (code_record.user_email !== user.email) {
        setUserValidationError(
          'This access code is not assigned to your account. Please use the correct access code for your account or contact your administrator.'
        )
        setLoading(false)
        return
      }

      // Verify that the user has a valid profile (account exists)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setUserValidationError(
          'Your account is not properly registered in the system. Please contact your administrator to set up your account before taking exams.'
        )
        setLoading(false)
        return
      }

      // Store the UUID of the exam code record
      setCodeId(code_record.id)
      setCodeVerified(true)
      // Loading will be handled by the loadExamData effect
    } catch (error) {
      console.error('Verification error:', error)
      setUserValidationError('Failed to verify access code. Please try again.')
      setLoading(false)
    } finally {
      setVerifyingCode(false)
    }
  }

  useEffect(() => {
    if (examStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    } else if (timeLeft === 0 && examStarted) {
      handleSubmitExam()
    }
  }, [examStarted, timeLeft])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartExam = async () => {
    if (!user || !examData || !codeId) return

    // Final check for exam availability before starting
    const dateValidationError = checkExamDateAvailability(examData)
    if (dateValidationError) {
      setDateError(dateValidationError)
      return
    }

    try {
      // Create exam attempt record using the UUID of the exam code
      const { data: attempt, error } = await supabase
        .from('exam_attempts')
        .insert({
          exam_id: examData.id,
          user_id: user.id,
          code_id: codeId,
          total_points: allQuestions.reduce((sum, q) => sum + q.points, 0)
        })
        .select()
        .single()

      if (error) throw error

      setAttemptId(attempt.id)
      setExamStarted(true)
    } catch (error) {
      alert('Failed to start exam. Please try again.')
    }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleNextQuestion = () => {
    if (currentQuestion < allQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const calculateScore = () => {
    let correctAnswers = 0
    let totalPoints = 0

    allQuestions.forEach(question => {
      totalPoints += question.points
      const userAnswer = answers[question.id]
      
      if (userAnswer) {
        // Handle different question types
        if (question.type === 'multiple_choice' || question.type === 'true_false') {
          // For multiple choice and true/false, check exact match
          if (question.correct_answers.includes(userAnswer)) {
            correctAnswers += question.points
          }
        } else if (question.type === 'fill_blank' || question.type === 'short_answer') {
          // For text answers, check if user answer matches any correct answer
          // Use flexible matching: trim whitespace and case insensitive
          const userAnswerNormalized = userAnswer.toString().trim().toLowerCase()
          
          const hasCorrectAnswer = question.correct_answers.some(correctAnswer => {
            const correctAnswerNormalized = correctAnswer.toString().trim().toLowerCase()
            
            // Check for exact match first
            if (correctAnswerNormalized === userAnswerNormalized) {
              return true
            }
            
            // For fill in the blank, also check if the user answer contains the correct answer
            // or if the correct answer contains the user answer (for partial credit)
            if (question.type === 'fill_blank') {
              return correctAnswerNormalized.includes(userAnswerNormalized) || 
                     userAnswerNormalized.includes(correctAnswerNormalized)
            }
            
            return false
          })
          
          if (hasCorrectAnswer) {
            correctAnswers += question.points
          }
        }
      }
    })

    return {
      score: correctAnswers,
      totalPoints,
      percentage: totalPoints > 0 ? Math.round((correctAnswers / totalPoints) * 100) : 0
    }
  }

  const handleSubmitExam = async () => {
    if (!user || !examData || !attemptId) return

    try {
      // Calculate score
      const { score, totalPoints, percentage } = calculateScore()

      // Calculate time spent
      const timeSpentMinutes = Math.round(((examData.time_limit || 60) * 60 - timeLeft) / 60)

      // Update exam attempt
      const { error } = await supabase
        .from('exam_attempts')
        .update({
          answers,
          score: percentage,
          completed_at: new Date().toISOString(),
          time_spent: timeSpentMinutes
        })
        .eq('id', attemptId)

      if (error) throw error

      // Mark code as used
      if (codeId) {
        await supabase
          .from('exam_codes')
          .update({ used: true })
          .eq('id', codeId)
      }

      // Navigate to results or completion page
      if (examData.show_results) {
        navigate(`/exam/${examData.id}/result?score=${percentage}&total=${totalPoints}&points=${score}`)
      } else {
        navigate('/dashboard?message=exam-completed')
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('Failed to submit exam. Please try again.')
    }
  }

  // Redirect to login if not authenticated
  if (!user) {
    return null // Component will redirect via useEffect
  }

  // User validation error state
  if (userValidationError) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            <UserX className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">Access Denied</h1>
            <p className="text-secondary-600 mb-4">{userValidationError}</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  // Preserve the exam URL with code for after login
                  const codeFromUrl = searchParams.get('code')
                  const redirectUrl = codeFromUrl 
                    ? `/login?redirect=${encodeURIComponent(`/exam/${examId}/take?code=${codeFromUrl}`)}`
                    : '/login'
                  navigate(redirectUrl)
                }}
                className="btn-primary w-full px-4 py-2"
              >
                Go to Login
              </button>
              <button
                onClick={() => {
                  setUserValidationError(null)
                  setCodeVerified(false)
                  setAccessCode('')
                  setLoading(false)
                }}
                className="btn-outline w-full px-4 py-2"
              >
                Try Different Code
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading exam...</p>
        </div>
      </div>
    )
  }

  // Date error state
  if (dateError) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            <CalendarX className="h-16 w-16 text-orange-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">Exam Not Available</h1>
            <p className="text-secondary-600 mb-4">{dateError}</p>
            {examData?.start_date && new Date() < new Date(examData.start_date) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center space-x-2 text-blue-700">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Exam Schedule</span>
                </div>
                <div className="text-sm text-blue-600 mt-2">
                  <p><strong>Starts:</strong> {new Date(examData.start_date).toLocaleString()}</p>
                  {examData.end_date && (
                    <p><strong>Ends:</strong> {new Date(examData.end_date).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary px-4 py-2"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">Error Loading Exam</h1>
            <p className="text-secondary-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary px-4 py-2"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Code verification screen
  if (!codeVerified) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            <div className="mb-6">
              <Key className="h-16 w-16 text-primary-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-secondary-900 mb-2">
                Enter Access Code
              </h1>
              <p className="text-secondary-600">
                Please enter your exam access code to continue
              </p>
            </div>

            {/* User Info Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 text-blue-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Logged in as</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                <strong>{user?.email}</strong>
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Make sure your access code is assigned to this email address
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  className="input w-full text-center text-lg font-mono tracking-wider"
                  placeholder="Enter your access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  maxLength={10}
                />
              </div>
              
              <button
                onClick={() => handleVerifyCode(accessCode)}
                disabled={verifyingCode || !accessCode.trim()}
                className="btn-primary w-full py-3 text-lg"
              >
                {verifyingCode ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Verify Code'
                )}
              </button>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                <strong>Important:</strong><br />
                • You must have a registered account to take exams<br />
                • Your access code must be assigned to your email address<br />
                • Contact your administrator if you need help
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Exam not loaded yet
  if (!examData || allQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Preparing exam...</p>
        </div>
      </div>
    )
  }

  const currentQ = allQuestions[currentQuestion]
  const progress = ((currentQuestion + 1) / allQuestions.length) * 100

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="card p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-secondary-900 mb-2">
                {examData.title}
              </h1>
              <p className="text-secondary-600">
                {examData.description || 'Welcome to your exam'}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Access Verified</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Code: <span className="font-mono">{accessCode}</span> • User: <strong>{user.email}</strong>
              </p>
            </div>

            {/* Exam Schedule Information */}
            {(examData.start_date || examData.end_date) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center space-x-2 text-blue-700 mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Exam Schedule</span>
                </div>
                <div className="text-sm text-blue-600 space-y-1">
                  {examData.start_date && (
                    <p><strong>Started:</strong> {new Date(examData.start_date).toLocaleString()}</p>
                  )}
                  {examData.end_date && (
                    <p><strong>Ends:</strong> {new Date(examData.end_date).toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-secondary-50 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-secondary-900 mb-4">Exam Instructions</h2>
              <div className="text-left space-y-2 text-sm text-secondary-600">
                <p>• You have {examData.time_limit || 60} minutes to complete this exam</p>
                <p>• There are {allQuestions.length} questions in total</p>
                <p>• You can navigate between questions using the Next/Previous buttons</p>
                <p>• Make sure to save your answers before the time runs out</p>
                <p>• Once you start, you cannot pause the exam</p>
                {examData.shuffle_questions && <p>• Questions have been randomized for this attempt</p>}
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4 text-sm text-secondary-500 mb-6">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>{examData.time_limit || 60} minutes</span>
              </div>
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>{allQuestions.length} questions</span>
              </div>
            </div>

            <button
              onClick={handleStartExam}
              className="btn-primary px-8 py-3 text-lg"
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <div className="bg-white border-b border-secondary-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium text-secondary-900">{examData.title}</h1>
            <p className="text-sm text-secondary-500">
              Question {currentQuestion + 1} of {allQuestions.length} • <strong>{user.email}</strong>
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-secondary-600">
              <Clock className="h-4 w-4 mr-1" />
              <span className={timeLeft < 300 ? 'text-red-600 font-medium' : ''}>
                {formatTime(timeLeft)}
              </span>
            </div>
            
            <button
              onClick={handleSubmitExam}
              className="btn-primary px-4 py-2"
            >
              Submit Exam
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-secondary-200">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="w-full bg-secondary-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="card p-8">
          <div className="mb-6">
            <h2 className="text-xl font-medium text-secondary-900 mb-4">
              {currentQ.question_text}
            </h2>
            
            <div className="space-y-3">
              {currentQ.type === 'multiple_choice' || currentQ.type === 'true_false' ? (
                currentQ.options.map((option, index) => (
                  <label
                    key={index}
                    className="flex items-center p-3 border border-secondary-200 rounded-lg hover:bg-secondary-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      value={option}
                      checked={answers[currentQ.id] === option}
                      onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                      className="mr-3 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-secondary-900">{option}</span>
                  </label>
                ))
              ) : (
                <textarea
                  className="input w-full h-32 resize-none"
                  placeholder="Enter your answer here..."
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-secondary-200">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
              className="btn-outline px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <span className="text-sm text-secondary-500">
              {Object.keys(answers).length} of {allQuestions.length} answered
            </span>
            
            {currentQuestion === allQuestions.length - 1 ? (
              <button
                onClick={handleSubmitExam}
                className="btn-primary px-4 py-2"
              >
                Submit Exam
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="btn-primary px-4 py-2"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}