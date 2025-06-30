import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, Plus, Trash2, Settings, CheckCircle, Edit, QrCode} from 'lucide-react'
import { useExams } from '../hooks/useExams'
import { QuestionModal } from '../components/QuestionModal'
import { ExamCodesModal } from '../components/ExamCodesModal'
import { supabase } from '../lib/supabase'

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
  time_limit: number
  pass_mark: number
  questions: Question[]
}

export function ExamCreationPage() {
  const navigate = useNavigate()
  const { examId } = useParams()
  const { createExam, updateExam, publishExam, exams } = useExams()
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [showCodesModal, setShowCodesModal] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [loadingQuestions, setLoadingQuestions] = useState<Record<string, boolean>>({})
  const [dataLoaded, setDataLoaded] = useState(false) // Track if initial data has been loaded

type ExamStatus = 'draft' | 'published' | 'archived';

interface ExamData {
  title: string;
  description: string;
  time_limit: number;
  shuffle_questions: boolean;
  show_results: boolean;
  start_date: string;
  end_date: string;
  status: ExamStatus;
}

const [examData, setExamData] = useState<ExamData>({
  title: '',
  description: '',
  time_limit: 60,
  shuffle_questions: false,
  show_results: true,
  start_date: '',
  end_date: '',
  status: 'draft'
});

  const [subjects, setSubjects] = useState<Subject[]>([
    {
      id: '1',
      name: 'General Knowledge',
      time_limit: 30,
      pass_mark: 60,
      questions: []
    }
  ])

  // Load existing exam data if editing - only run once when component mounts
  useEffect(() => {
    if (examId && exams.length > 0 && !dataLoaded) {
      const exam = exams.find(e => e.id === examId)
      if (exam) {
        setExamData({
          title: exam.title,
          description: exam.description || '',
          time_limit: exam.time_limit || 60,
          shuffle_questions: exam.shuffle_questions,
          show_results: exam.show_results,
          start_date: exam.start_date ? new Date(exam.start_date).toISOString().slice(0, 16) : '',
          end_date: exam.end_date ? new Date(exam.end_date).toISOString().slice(0, 16) : '',
          status: exam.status
        })

        if (exam.subjects && exam.subjects.length > 0) {
          const subjectsWithQuestions = exam.subjects.map(subject => ({
            id: subject.id,
            name: subject.name,
            time_limit: subject.time_limit || 30,
            pass_mark: (subject as any).pass_mark || 60,
            questions: [] // Will be loaded separately
          }))
          setSubjects(subjectsWithQuestions)
          
          // Load questions for each subject
          subjectsWithQuestions.forEach(subject => {
            loadQuestionsForSubject(subject.id)
          })
        }
        
        setDataLoaded(true) // Mark data as loaded to prevent re-loading
      }
    }
  }, [examId, exams, dataLoaded]) // Add dataLoaded to dependencies

  // Function to load questions for a specific subject
  const loadQuestionsForSubject = async (subjectId: string) => {
    try {
      setLoadingQuestions(prev => ({ ...prev, [subjectId]: true }))
      
      const { data: questions, error } = await supabase
        .from('questions')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true })

      if (error) throw error

      // Update the subject with loaded questions
      setSubjects(prev => prev.map(subject => {
        if (subject.id === subjectId) {
          return {
            ...subject,
            questions: questions.map(q => ({
              id: q.id,
              type: q.type,
              question_text: q.question_text,
              options: q.options || [],
              correct_answers: q.correct_answers,
              points: q.points
            }))
          }
        }
        return subject
      }))
    } catch (err) {
      console.error('Failed to load questions for subject:', err)
    } finally {
      setLoadingQuestions(prev => ({ ...prev, [subjectId]: false }))
    }
  }

  const getHumanReadableError = (error: any): string => {
    if (typeof error === 'string') {
      return error
    }

    if (error?.message) {
      const message = error.message.toLowerCase()
      
      // Database connection errors
      if (message.includes('connection') || message.includes('network')) {
        return 'Unable to connect to the database. Please check your internet connection and try again.'
      }
      
      // Permission errors
      if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
        return 'You don\'t have permission to perform this action. Please contact your administrator.'
      }
      
      // Validation errors
      if (message.includes('validation') || message.includes('invalid')) {
        return 'Some of the exam information is invalid. Please check all fields and try again.'
      }
      
      // Database constraint errors
      if (message.includes('unique') || message.includes('duplicate')) {
        return 'An exam with this title already exists. Please choose a different title.'
      }
      
      // Foreign key errors
      if (message.includes('foreign key') || message.includes('reference')) {
        return 'There\'s a problem with the exam data structure. Please refresh the page and try again.'
      }
      
      // Timeout errors
      if (message.includes('timeout') || message.includes('time out')) {
        return 'The operation took too long to complete. Please try again.'
      }
      
      // Server errors
      if (message.includes('server error') || message.includes('internal error')) {
        return 'There\'s a temporary problem with our servers. Please try again in a few minutes.'
      }
      
      // Authentication errors
      if (message.includes('authentication') || message.includes('session')) {
        return 'Your session has expired. Please log out and log back in.'
      }
      
      // Return the original message if we can't categorize it
      return error.message
    }
    
    return 'An unexpected error occurred. Please try again.'
  }

  const showMessage = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message)
      setError(null)
    } else {
      setError(message)
      setSuccess(null)
    }
    
    setTimeout(() => {
      setSuccess(null)
      setError(null)
    }, 5000)
  }

  const handleSave = async () => {
    if (!examData.title.trim()) {
      showMessage('Please enter an exam title before saving', 'error')
      return
    }

    if (subjects.some(subject => !subject.name.trim())) {
      showMessage('Please provide names for all subjects before saving', 'error')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const examPayload = {
        title: examData.title,
        description: examData.description || null,
        time_limit: examData.time_limit,
        shuffle_questions: examData.shuffle_questions,
        show_results: examData.show_results,
        start_date: examData.start_date ? new Date(examData.start_date).toISOString() : null,
        end_date: examData.end_date ? new Date(examData.end_date).toISOString() : null,
        status: 'draft' as const
      }

    const subjectsPayload = subjects.map((subject, index) => ({
      name: subject.name,
      time_limit: subject.time_limit,
      pass_mark: subject.pass_mark,
      order_index: index // required
    }));

      if (examId) {
        await updateExam(examId, examPayload, subjectsPayload)
        showMessage('Exam updated successfully!', 'success')
        
        // Don't reload questions here - they're already loaded and managed in state
        // The updateExam function now preserves existing questions
      } else {
        const newExam = await createExam(examPayload, subjectsPayload)
        showMessage('Exam saved as draft!', 'success')
        // Navigate to edit mode for the newly created exam
        navigate(`/exams/${newExam.id}/edit`, { replace: true })
      }
    } catch (err) {
      showMessage(getHumanReadableError(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    // Validation checks with specific error messages
    if (!examData.title.trim()) {
      showMessage('Please enter an exam title before publishing', 'error')
      return
    }

    if (subjects.length === 0) {
      showMessage('Please add at least one subject before publishing the exam', 'error')
      return
    }

    if (subjects.some(subject => !subject.name.trim())) {
      showMessage('Please provide names for all subjects before publishing', 'error')
      return
    }

    const totalQuestions = subjects.reduce((sum, subject) => sum + subject.questions.length, 0)
    if (totalQuestions === 0) {
      showMessage('Please add at least one question to your exam before publishing', 'error')
      return
    }

    // Check if any subject has no questions
    const subjectsWithoutQuestions = subjects.filter(subject => subject.questions.length === 0)
    if (subjectsWithoutQuestions.length > 0) {
      const subjectNames = subjectsWithoutQuestions.map(s => s.name).join(', ')
      showMessage(`The following subjects need questions before publishing: ${subjectNames}`, 'error')
      return
    }

    // Check for incomplete questions
    const incompleteQuestions = subjects.some(subject => 
      subject.questions.some(question => 
        !question.question_text.trim() || 
        question.correct_answers.length === 0 ||
        (question.type === 'multiple_choice' && question.options.some(opt => !opt.trim()))
      )
    )
    
    if (incompleteQuestions) {
      showMessage('Some questions are incomplete. Please ensure all questions have text, options (for multiple choice), and correct answers', 'error')
      return
    }

    // Check date validation
    if (examData.start_date && examData.end_date) {
      const startDate = new Date(examData.start_date)
      const endDate = new Date(examData.end_date)
      
      if (startDate >= endDate) {
        showMessage('The exam end date must be after the start date', 'error')
        return
      }
      
      if (startDate < new Date()) {
        showMessage('The exam start date cannot be in the past', 'error')
        return
      }
    }

    try {
      setPublishing(true)
      setError(null)

      let currentExamId = examId

      // If this is a new exam, save it first
      if (!currentExamId) {
        const examPayload = {
          title: examData.title,
          description: examData.description || null,
          time_limit: examData.time_limit,
          shuffle_questions: examData.shuffle_questions,
          show_results: examData.show_results,
          start_date: examData.start_date ? new Date(examData.start_date).toISOString() : null,
          end_date: examData.end_date ? new Date(examData.end_date).toISOString() : null,
          status: 'draft' as const
        }

        const subjectsPayload = subjects.map((subject, index) => ({
          name: subject.name,
          time_limit: subject.time_limit,
          pass_mark: subject.pass_mark,
          order_index: index // required
        }));

        const newExam = await createExam(examPayload, subjectsPayload)
        currentExamId = newExam.id
      }

      // Publish the exam
      if (!currentExamId) return;
      await publishExam(currentExamId);
      setExamData(prev => ({ ...prev, status: 'published' }))
      showMessage('Exam published successfully! Students can now access it with exam codes.', 'success')

      // Navigate to the published exam
      if (!examId) {
        navigate(`/exams/${currentExamId}/edit`, { replace: true })
      }
    } catch (err) {
      showMessage(getHumanReadableError(err), 'error')
    } finally {
      setPublishing(false)
    }
  }

  const addSubject = () => {
    const newSubject: Subject = {
      id: Date.now().toString(),
      name: `Subject ${subjects.length + 1}`,
      time_limit: 30,
      pass_mark: 60,
      questions: []
    }
    setSubjects([...subjects, newSubject])
  }

  const removeSubject = (subjectId: string) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter(s => s.id !== subjectId))
    }
  }

  const updateSubject = (subjectId: string, field: string, value: any) => {
    setSubjects(subjects.map(s => 
      s.id === subjectId ? { ...s, [field]: value } : s
    ))
  }

  const handleAddQuestion = (subjectId: string) => {
    setSelectedSubjectId(subjectId)
    setEditingQuestion(null)
    setShowQuestionModal(true)
  }

  const handleEditQuestion = (subjectId: string, question: Question) => {
    setSelectedSubjectId(subjectId)
    setEditingQuestion(question)
    setShowQuestionModal(true)
  }

  const handleSaveQuestion = async (questionData: Omit<Question, 'id'>) => {
    if (!selectedSubjectId) return

    try {
      // Find the actual subject ID from the database
      const currentExam = exams.find(e => e.id === examId)
      const dbSubject = currentExam?.subjects?.find(s => s.id === selectedSubjectId)
      
      if (!dbSubject) {
        showMessage('Please save the exam first before adding questions', 'error')
        return
      }

      if (editingQuestion) {
        // Update existing question in database
        const { error } = await supabase
          .from('questions')
          .update({
            type: questionData.type,
            question_text: questionData.question_text,
            options: questionData.options,
            correct_answers: questionData.correct_answers,
            points: questionData.points
          })
          .eq('id', editingQuestion.id)

        if (error) throw error

        // Update local state
        setSubjects(subjects.map(subject => {
          if (subject.id === selectedSubjectId) {
            return {
              ...subject,
              questions: subject.questions.map(q => 
                q.id === editingQuestion.id ? { ...questionData, id: editingQuestion.id } : q
              )
            }
          }
          return subject
        }))

        showMessage('Question updated successfully!', 'success')
      } else {
        // Create new question in database
        const { data: newQuestion, error } = await supabase
          .from('questions')
          .insert({
            subject_id: dbSubject.id,
            type: questionData.type,
            question_text: questionData.question_text,
            options: questionData.options,
            correct_answers: questionData.correct_answers,
            points: questionData.points,
            order_index: subjects.find(s => s.id === selectedSubjectId)?.questions.length || 0
          })
          .select()
          .single()

        if (error) throw error

        // Update local state
        setSubjects(subjects.map(subject => {
          if (subject.id === selectedSubjectId) {
            return {
              ...subject,
              questions: [...subject.questions, {
                id: newQuestion.id,
                type: newQuestion.type,
                question_text: newQuestion.question_text,
                options: newQuestion.options || [],
                correct_answers: newQuestion.correct_answers,
                points: newQuestion.points
              }]
            }
          }
          return subject
        }))

        showMessage('Question added successfully!', 'success')
      }

      setShowQuestionModal(false)
      setSelectedSubjectId(null)
      setEditingQuestion(null)
    } catch (err) {
      showMessage(getHumanReadableError(err), 'error')
    }
  }

  const handleDeleteQuestion = async (subjectId: string, questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      try {
        // Delete from database
        const { error } = await supabase
          .from('questions')
          .delete()
          .eq('id', questionId)

        if (error) throw error

        // Update local state
        setSubjects(subjects.map(subject => {
          if (subject.id === subjectId) {
            return {
              ...subject,
              questions: subject.questions.filter(q => q.id !== questionId)
            }
          }
          return subject
        }))

        showMessage('Question deleted successfully!', 'success')
      } catch (err) {
        showMessage(getHumanReadableError(err), 'error')
      }
    }
  }

  const getTotalQuestions = () => {
    return subjects.reduce((sum, subject) => sum + subject.questions.length, 0)
  }

  const getTotalPoints = () => {
    return subjects.reduce((sum, subject) => 
      sum + subject.questions.reduce((subSum, question) => subSum + question.points, 0), 0
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            {examId ? 'Edit Exam' : 'Create New Exam'}
          </h1>
          <p className="text-secondary-600">Build your computer-based test</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-outline px-4 py-2"
            disabled={saving || publishing}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || publishing}
            className="btn-secondary px-4 py-2 flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-secondary-600"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Draft</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="card p-6">
            <h2 className="text-lg font-medium text-secondary-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Exam Title *
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Enter exam title"
                  value={examData.title}
                  onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                  disabled={saving || publishing}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input w-full h-24 resize-none"
                  placeholder="Enter exam description"
                  value={examData.description}
                  onChange={(e) => setExamData({ ...examData, description: e.target.value })}
                  disabled={saving || publishing}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    className="input w-full"
                    value={examData.start_date}
                    onChange={(e) => setExamData({ ...examData, start_date: e.target.value })}
                    disabled={saving || publishing}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    className="input w-full"
                    value={examData.end_date}
                    onChange={(e) => setExamData({ ...examData, end_date: e.target.value })}
                    disabled={saving || publishing}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Subjects */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-secondary-900">Subjects</h2>
              <button
                onClick={addSubject}
                disabled={saving || publishing}
                className="btn-primary px-3 py-1 text-sm flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Add Subject</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {subjects.map((subject, _index) => (
                <div key={subject.id} className="border border-secondary-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <input
                      type="text"
                      className="input"
                      value={subject.name}
                      onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                      disabled={saving || publishing}
                      placeholder="Subject name"
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        className="input w-full"
                        placeholder="Time (min)"
                        value={subject.time_limit}
                        onChange={(e) => updateSubject(subject.id, 'time_limit', parseInt(e.target.value) || 0)}
                        disabled={saving || publishing}
                        min="1"
                      />
                      <span className="text-sm text-secondary-500">min</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        className="input w-full"
                        placeholder="Pass mark (%)"
                        value={subject.pass_mark}
                        onChange={(e) => updateSubject(subject.id, 'pass_mark', parseInt(e.target.value) || 60)}
                        disabled={saving || publishing}
                        min="0"
                        max="100"
                      />
                      <span className="text-sm text-secondary-500">%</span>
                    </div>
                    <div className="flex items-center justify-end">
                      {subjects.length > 1 && (
                        <button
                          onClick={() => removeSubject(subject.id)}
                          disabled={saving || publishing}
                          className="text-red-600 hover:text-red-700 p-1 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-secondary-500 mb-3 flex items-center space-x-2">
                    <span>{subject.questions.length} questions • {subject.questions.reduce((sum, q) => sum + q.points, 0)} points • Pass mark: {subject.pass_mark}%</span>
                    {loadingQuestions[subject.id] && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    )}
                  </div>

                  {/* Questions List */}
                  {subject.questions.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {subject.questions.map((question, qIndex) => (
                        <div key={question.id} className="bg-secondary-50 rounded p-3 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-secondary-900">
                              Q{qIndex + 1}: {question.question_text.substring(0, 60)}
                              {question.question_text.length > 60 ? '...' : ''}
                            </div>
                            <div className="text-xs text-secondary-500">
                              {question.type.replace('_', ' ')} • {question.points} points
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditQuestion(subject.id, question)}
                              disabled={saving || publishing}
                              className="text-primary-600 hover:text-primary-700 p-1"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(subject.id, question.id)}
                              disabled={saving || publishing}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <button 
                    onClick={() => handleAddQuestion(subject.id)}
                    className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50 flex items-center"
                    disabled={saving || publishing || !examId}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {!examId ? 'Save exam first to add questions' : 'Add Questions'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Sidebar */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Exam Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Total Time Limit (minutes)
                </label>
                <input
                  type="number"
                  className="input w-full"
                  value={examData.time_limit}
                  onChange={(e) => setExamData({ ...examData, time_limit: parseInt(e.target.value) || 0 })}
                  disabled={saving || publishing}
                  min="1"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-secondary-700">
                  Shuffle Questions
                </label>
                <input
                  type="checkbox"
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                  checked={examData.shuffle_questions}
                  onChange={(e) => setExamData({ ...examData, shuffle_questions: e.target.checked })}
                  disabled={saving || publishing}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-secondary-700">
                  Show Results Immediately
                </label>
                <input
                  type="checkbox"
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                  checked={examData.show_results}
                  onChange={(e) => setExamData({ ...examData, show_results: e.target.checked })}
                  disabled={saving || publishing}
                />
              </div>
            </div>
          </div>

          {/* Exam Summary */}
          <div className="card p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Exam Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-600">Total Questions:</span>
                <span className="font-medium">{getTotalQuestions()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Total Points:</span>
                <span className="font-medium">{getTotalPoints()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Subjects:</span>
                <span className="font-medium">{subjects.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Avg. Pass Mark:</span>
                <span className="font-medium">
                  {Math.round(subjects.reduce((sum, s) => sum + s.pass_mark, 0) / subjects.length)}%
                </span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-medium text-secondary-900 mb-4">Publish Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-secondary-600">Status</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  examData.status === 'published' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {examData.status === 'published' ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : null}
                  {examData.status}
                </span>
              </div>
              
              {examData.status !== 'published' && (
                <button 
                  onClick={handlePublish}
                  disabled={publishing || saving}
                  className="btn-primary w-full py-2"
                >
                  {publishing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Publishing...
                    </div>
                  ) : (
                    'Publish Exam'
                  )}
                </button>
              )}

              {examData.status === 'published' && examId && (
                <button 
                  onClick={() => setShowCodesModal(true)}
                  className="btn-primary w-full py-2 flex items-center justify-center space-x-2"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Generate Codes</span>
                </button>
              )}
              
              <p className="text-xs text-secondary-500">
                {examData.status === 'published' 
                  ? 'This exam is live and accessible to users with valid codes.'
                  : 'Once published, exam codes can be generated and distributed to users.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Question Modal */}
      <QuestionModal
        isOpen={showQuestionModal}
        onClose={() => {
          setShowQuestionModal(false)
          setSelectedSubjectId(null)
          setEditingQuestion(null)
        }}
        onSave={handleSaveQuestion}
        question={editingQuestion || undefined}
      />

      {/* Exam Codes Modal */}
      {examId && (
        <ExamCodesModal
          isOpen={showCodesModal}
          onClose={() => setShowCodesModal(false)}
          examId={examId}
        />
      )}
    </div>
  )
}