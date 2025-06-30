import React from 'react'
import { Link } from 'react-router-dom'
import { useAvailableExams } from '../hooks/useAvailableExams'
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Trophy,
  User,
  FileText
} from 'lucide-react'

export function AvailableExamsPage() {
  const { availableExams, loading, error } = useAvailableExams()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <Calendar className="h-5 w-5 text-green-600" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-blue-600" />
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'not_started':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Available'
      case 'completed':
        return 'Completed'
      case 'expired':
        return 'Expired'
      case 'not_started':
        return 'Not Started'
      default:
        return 'Unknown'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'not_started':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getExamUrl = (examId: string, code: string) => {
    return `/exam/${examId}/take?code=${code}`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Available Exams</h1>
          <p className="text-secondary-600">Exams assigned to you</p>
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
          <h1 className="text-2xl font-bold text-secondary-900">Available Exams</h1>
          <p className="text-secondary-600">Exams assigned to you</p>
        </div>
        
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Error loading available exams</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const stats = {
    total: availableExams.length,
    available: availableExams.filter(e => e.status === 'available').length,
    completed: availableExams.filter(e => e.status === 'completed').length,
    expired: availableExams.filter(e => e.status === 'expired').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Available Exams</h1>
        <p className="text-secondary-600">Exams assigned to you with access codes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-5">
              <p className="text-sm font-medium text-secondary-500">Total Assigned</p>
              <p className="text-lg font-medium text-secondary-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-green-600" />
            <div className="ml-5">
              <p className="text-sm font-medium text-secondary-500">Available</p>
              <p className="text-lg font-medium text-secondary-900">{stats.available}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-blue-600" />
            <div className="ml-5">
              <p className="text-sm font-medium text-secondary-500">Completed</p>
              <p className="text-lg font-medium text-secondary-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-5">
              <p className="text-sm font-medium text-secondary-500">Expired</p>
              <p className="text-lg font-medium text-secondary-900">{stats.expired}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Exams List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200">
          <h3 className="text-lg font-medium text-secondary-900">Your Assigned Exams</h3>
        </div>

        {availableExams.length > 0 ? (
          <div className="divide-y divide-secondary-200">
            {availableExams.map((exam) => (
              <div key={exam.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(exam.status)}
                      <h4 className="text-lg font-medium text-secondary-900">
                        {exam.exam_title}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                        {getStatusText(exam.status)}
                      </span>
                    </div>
                    
                    {exam.exam_description && (
                      <p className="text-sm text-secondary-600 mb-2">{exam.exam_description}</p>
                    )}
                    
                    <div className="flex items-center space-x-6 text-sm text-secondary-500">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        <span>Code: <span className="font-mono">{exam.code}</span></span>
                      </div>
                      
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Assigned: {new Date(exam.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {exam.expires_at && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Expires: {new Date(exam.expires_at).toLocaleDateString()}</span>
                        </div>
                      )}

                      {exam.exam_start_date && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Starts: {new Date(exam.exam_start_date).toLocaleDateString()}</span>
                        </div>
                      )}

                      {exam.exam_end_date && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Ends: {new Date(exam.exam_end_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {exam.status === 'completed' && exam.attempt_score !== null && (
                      <div className="mt-2 flex items-center space-x-2">
                        <Trophy className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-secondary-900">
                          Score: {exam.attempt_score}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {exam.status === 'available' && (
                      <Link
                        to={getExamUrl(exam.exam_id, exam.code)}
                        className="btn-primary px-4 py-2 flex items-center space-x-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Take Exam</span>
                      </Link>
                    )}
                    
                    {exam.status === 'completed' && (
                      <Link
                        to={`/exam/${exam.exam_id}/result`}
                        className="btn-outline px-4 py-2 flex items-center space-x-2"
                      >
                        <Trophy className="h-4 w-4" />
                        <span>View Results</span>
                      </Link>
                    )}

                    {exam.status === 'not_started' && (
                      <div className="text-sm text-yellow-600 font-medium">
                        {exam.exam_start_date && new Date(exam.exam_start_date) > new Date() 
                          ? 'Exam not started yet'
                          : 'Exam not published yet'
                        }
                      </div>
                    )}

                    {exam.status === 'expired' && (
                      <div className="text-sm text-red-600 font-medium">
                        {exam.expires_at && new Date(exam.expires_at) < new Date()
                          ? 'Access code expired'
                          : 'Exam period ended'
                        }
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <Calendar className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No exams assigned</h3>
            <p className="text-secondary-500">
              You don't have any exams assigned to you yet. Contact your administrator to get access codes for exams.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}