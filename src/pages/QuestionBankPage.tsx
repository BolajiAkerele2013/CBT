import { useState } from 'react'
import { useQuestionBank } from '../hooks/useQuestionBank'
import { useExams } from '../hooks/useExams'
import { supabase } from '../lib/supabase'
import { 
  Search, 
  Copy, 
  BookOpen,
  AlertCircle,
  Upload,
  Download,
  X,
  CheckCircle
} from 'lucide-react'

export function QuestionBankPage() {
  const { questions, loading, error, copyQuestionToSubject } = useQuestionBank()
  const { exams } = useExams()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedExam, setSelectedExam] = useState<string>('all')
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [bulkUploadData, setBulkUploadData] = useState('')
  const [selectedSubjectForUpload, setSelectedSubjectForUpload] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const questionTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True/False' },
    { value: 'fill_blank', label: 'Fill in the Blank' },
    { value: 'short_answer', label: 'Short Answer' }
  ]

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question_text.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || question.type === selectedType
    const matchesExam = selectedExam === 'all' || question.subjects.exams.id === selectedExam
    
    return matchesSearch && matchesType && matchesExam
  })

  const handleCopyQuestion = async (questionId: string, targetSubjectId: string) => {
    try {
      await copyQuestionToSubject(questionId, targetSubjectId)
      setShowCopyModal(false)
      setSelectedQuestion(null)
      alert('Question copied successfully!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to copy question')
    }
  }

  const getAvailableSubjects = () => {
    return exams.flatMap(exam => 
      exam.subjects?.map(subject => ({
        id: subject.id,
        name: subject.name,
        examTitle: exam.title
      })) || []
    )
  }

  const downloadTemplate = () => {
    const csvTemplate = [
      'Question Type,Question Text,Option 1,Option 2,Option 3,Option 4,Correct Answer(s),Points',
      'multiple_choice,"What is 2+2?","3","4","5","6","4",1',
      'true_false,"The earth is round","True","False","","","True",1',
      'fill_blank,"The capital of France is ____","","","","","Paris",1',
      'short_answer,"Explain photosynthesis","","","","","Process by which plants make food",2'
    ].join('\n')

    const blob = new Blob([csvTemplate], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'question-bank-template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const parseCSVLine = (line: string): string[] => {
    const result = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  const handleBulkUpload = async () => {
    if (!bulkUploadData.trim()) {
      setUploadError('Please paste CSV data')
      return
    }

    if (!selectedSubjectForUpload) {
      setUploadError('Please select a subject for the questions')
      return
    }

    try {
      setUploading(true)
      setUploadError(null)
      setUploadSuccess(null)

      // Parse CSV data
      const lines = bulkUploadData.trim().split('\n')
      
      if (lines.length < 2) {
        throw new Error('CSV must contain at least a header row and one data row')
      }

      const headers = parseCSVLine(lines[0])
      
      if (headers.length < 7) {
        throw new Error('Invalid CSV format. Please use the template with all required columns.')
      }

      // Parse questions
      const questionsToUpload = []
      const errors = []

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCSVLine(lines[i])
          
          if (values.length < 7) {
            errors.push(`Row ${i + 1}: Insufficient columns`)
            continue
          }

          const questionType = values[0].toLowerCase().trim()
          const questionText = values[1].trim()
          const options = values.slice(2, 6).filter(v => v.trim())
          const correctAnswers = values[6].split(';').map(a => a.trim()).filter(a => a)
          const points = parseInt(values[7]) || 1

          // Validate question type
          if (!['multiple_choice', 'true_false', 'fill_blank', 'short_answer'].includes(questionType)) {
            errors.push(`Row ${i + 1}: Invalid question type "${questionType}"`)
            continue
          }

          // Validate required fields
          if (!questionText) {
            errors.push(`Row ${i + 1}: Question text is required`)
            continue
          }

          if (correctAnswers.length === 0) {
            errors.push(`Row ${i + 1}: At least one correct answer is required`)
            continue
          }

          // Validate multiple choice questions have options
          if (questionType === 'multiple_choice' && options.length < 2) {
            errors.push(`Row ${i + 1}: Multiple choice questions need at least 2 options`)
            continue
          }

          // For true/false, ensure options are correct
          if (questionType === 'true_false') {
            options.length = 0 // Clear any existing options
            options.push('True', 'False')
          }

          questionsToUpload.push({
            type: questionType as 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer',
            question_text: questionText,
            options: options.length > 0 ? options : null,
            correct_answers: correctAnswers,
            points: points
          })
        } catch (err) {
          errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Parse error'}`)
        }
      }

      if (errors.length > 0) {
        throw new Error(`Parsing errors:\n${errors.join('\n')}`)
      }

      if (questionsToUpload.length === 0) {
        throw new Error('No valid questions found to upload')
      }

      // Get the next order index for the selected subject
      const { data: existingQuestions } = await supabase
        .from('questions')
        .select('order_index')
        .eq('subject_id', selectedSubjectForUpload)
        .order('order_index', { ascending: false })
        .limit(1)

      let nextOrderIndex = existingQuestions && existingQuestions.length > 0 
        ? existingQuestions[0].order_index + 1 
        : 0

      // Prepare questions for database insertion
      const questionsForDB = questionsToUpload.map(question => ({
        subject_id: selectedSubjectForUpload,
        type: question.type,
        question_text: question.question_text,
        options: question.options,
        correct_answers: question.correct_answers,
        points: question.points,
        order_index: nextOrderIndex++
      }))

      // Insert questions into database
      const { data: insertedQuestions, error: insertError } = await supabase
        .from('questions')
        .insert(questionsForDB)
        .select()

      if (insertError) throw insertError

      setUploadSuccess(`Successfully uploaded ${insertedQuestions.length} questions!`)
      setBulkUploadData('')
      setSelectedSubjectForUpload('')
      
      // Refresh the question bank
      window.location.reload()

    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload questions')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Question Bank</h1>
          <p className="text-secondary-600">Manage your question library</p>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Question Bank</h1>
          <p className="text-secondary-600">Manage your question library</p>
        </div>
        
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Error loading questions</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Question Bank</h1>
          <p className="text-secondary-600">Manage and reuse questions across exams</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={downloadTemplate}
            className="btn-outline px-4 py-2 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Download Template</span>
          </button>
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="btn-primary px-4 py-2 flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>Bulk Upload</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Search Questions
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                className="input pl-10 w-full"
                placeholder="Search by question text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Question Type
            </label>
            <select
              className="input w-full"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              {questionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Source Exam
            </label>
            <select
              className="input w-full"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option value="all">All Exams</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-secondary-900">
              Questions ({filteredQuestions.length})
            </h3>
          </div>
        </div>

        {filteredQuestions.length > 0 ? (
          <div className="divide-y divide-secondary-200">
            {filteredQuestions.map((question) => (
              <div key={question.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        question.type === 'multiple_choice' ? 'bg-blue-100 text-blue-800' :
                        question.type === 'true_false' ? 'bg-green-100 text-green-800' :
                        question.type === 'fill_blank' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {question.type.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-secondary-500">
                        {question.points} points
                      </span>
                    </div>
                    
                    <h4 className="text-sm font-medium text-secondary-900 mb-2">
                      {question.question_text}
                    </h4>
                    
                    {question.options && question.options.length > 0 && (
                      <div className="text-sm text-secondary-600 mb-2">
                        <strong>Options:</strong> {question.options.join(', ')}
                      </div>
                    )}
                    
                    <div className="text-sm text-secondary-600 mb-2">
                      <strong>Correct Answer(s):</strong> {question.correct_answers.join(', ')}
                    </div>
                    
                    <div className="text-xs text-secondary-500">
                      From: {question.subjects.exams.title} → {question.subjects.name}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedQuestion(question.id)
                        setShowCopyModal(true)
                      }}
                      className="btn-outline px-3 py-1 text-sm flex items-center space-x-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <BookOpen className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              {questions.length === 0 ? 'No questions yet' : 'No questions match your filters'}
            </h3>
            <p className="text-secondary-500">
              {questions.length === 0 
                ? 'Questions will appear here as you create exams'
                : 'Try adjusting your search criteria'
              }
            </p>
          </div>
        )}
      </div>

      {/* Copy Question Modal */}
      {showCopyModal && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-secondary-200">
              <h3 className="text-lg font-semibold text-secondary-900">Copy Question</h3>
              <button
                onClick={() => {
                  setShowCopyModal(false)
                  setSelectedQuestion(null)
                }}
                className="text-secondary-400 hover:text-secondary-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-secondary-600 mb-4">
                Select the subject where you want to copy this question:
              </p>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getAvailableSubjects().map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => handleCopyQuestion(selectedQuestion, subject.id)}
                    className="w-full text-left p-3 border border-secondary-200 rounded-lg hover:bg-secondary-50 transition-colors"
                  >
                    <div className="font-medium text-secondary-900">{subject.name}</div>
                    <div className="text-sm text-secondary-500">{subject.examTitle}</div>
                  </button>
                ))}
              </div>
              
              {getAvailableSubjects().length === 0 && (
                <p className="text-sm text-secondary-500 text-center py-4">
                  No subjects available. Create an exam with subjects first.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-secondary-200">
              <h3 className="text-lg font-semibold text-secondary-900">Bulk Upload Questions</h3>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false)
                  setUploadError(null)
                  setUploadSuccess(null)
                  setBulkUploadData('')
                  setSelectedSubjectForUpload('')
                }}
                className="text-secondary-400 hover:text-secondary-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Success Message */}
              {uploadSuccess && (
                <div className="mb-4 rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">{uploadSuccess}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">Upload Error</p>
                      <pre className="text-sm text-red-700 mt-1 whitespace-pre-wrap">{uploadError}</pre>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm text-secondary-600 mb-2">
                  Upload questions in CSV format. Download the template to see the required format.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="btn-outline px-3 py-1 text-sm flex items-center space-x-1"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Template</span>
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Select Subject *
                </label>
                <select
                  className="input w-full"
                  value={selectedSubjectForUpload}
                  onChange={(e) => setSelectedSubjectForUpload(e.target.value)}
                  disabled={uploading}
                >
                  <option value="">Choose a subject for the questions...</option>
                  {getAvailableSubjects().map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.examTitle} → {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  CSV Data *
                </label>
                <textarea
                  className="input w-full h-48 resize-none font-mono text-xs"
                  placeholder="Paste your CSV data here..."
                  value={bulkUploadData}
                  onChange={(e) => setBulkUploadData(e.target.value)}
                  disabled={uploading}
                />
                <p className="text-xs text-secondary-500 mt-1">
                  Format: Question Type, Question Text, Option 1, Option 2, Option 3, Option 4, Correct Answer(s), Points
                </p>
              </div>

              {/* CSV Format Help */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">CSV Format Guidelines:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Question Type: multiple_choice, true_false, fill_blank, or short_answer</li>
                  <li>• Use quotes around text containing commas</li>
                  <li>• For multiple correct answers, separate with semicolons (;)</li>
                  <li>• True/False questions automatically get True/False options</li>
                  <li>• Fill blank and short answer questions don't need options</li>
                </ul>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowBulkUploadModal(false)
                    setUploadError(null)
                    setUploadSuccess(null)
                    setBulkUploadData('')
                    setSelectedSubjectForUpload('')
                  }}
                  className="btn-outline px-4 py-2"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={uploading || !bulkUploadData.trim() || !selectedSubjectForUpload}
                  className="btn-primary px-4 py-2 flex items-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Upload Questions</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}