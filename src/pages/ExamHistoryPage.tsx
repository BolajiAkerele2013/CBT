import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Clock, 
  Calendar, 
  Trophy, 
  XCircle, 
  Eye, 
  CheckCircle,
  AlertCircle,
  BarChart3,
  FileText,
  Target,
  User
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ExamHistory {
  id: string
  exam_id: string
  exam_title: string
  exam_description: string | null
  score: number
  total_points: number
  time_spent: number | null
  started_at: string
  completed_at: string | null
  passed: boolean | null
  show_results: boolean
  user_name: string | null
  user_email: string
}

export function ExamHistoryPage() {
  const { user } = useAuth()
  const [examHistory, setExamHistory] = useState<ExamHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'completed' | 'passed' | 'failed'>('all')

  useEffect(() => {
    if (user) {
      loadExamHistory()
    }
  }, [user])

  const loadExamHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: historyError } = await supabase
        .from('exam_results_view')
        .select('*')
        .eq('user_id', user!.id)
        .order('started_at', { ascending: false })

      if (historyError) throw historyError

      setExamHistory(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exam history')
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = examHistory.filter(exam => {
    switch (filter) {
      case 'completed':
        return exam.completed_at !== null
      case 'passed':
        return exam.passed === true
      case 'failed':
        return exam.passed === false
      default:
        return true
    }
  })

  const getStatusIcon = (exam: ExamHistory) => {
    if (!exam.completed_at) {
      return <Clock className="h-5 w-5 text-yellow-600" />
    }
    if (exam.passed) {
      return <Trophy className="h-5 w-5 text-green-600" />
    }
    return <XCircle className="h-5 w-5 text-red-600" />
  }

  const getStatusText = (exam: ExamHistory) => {
    if (!exam.completed_at) return 'In Progress'
    if (exam.passed) return 'Passed'
    return 'Failed'
  }

  const getStatusColor = (exam: ExamHistory) => {
    if (!exam.completed_at) return 'bg-yellow-100 text-yellow-800'
    if (exam.passed) return 'bg-green-100 text-green-800'
    return 'bg-red-100 text-red-800'
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const stats = {
    total: examHistory.length,
    completed: examHistory.filter(e => e.completed_at).length,
    passed: examHistory.filter(e => e.passed === true).length,
    averageScore: examHistory.filter(e => e.completed_at).length > 0 
      ? Math.round(examHistory.filter(e => e.completed_at).reduce((sum, e) => sum + e.score, 0) / examHistory.filter(e => e.completed_at).length)
      : 0
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Exam History</h1>
          <p className="text-secondary-600">Your exam attempts and results</p>
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
          <h1 className="text-2xl font-bold text-secondary-900">Exam History</h1>
          <p className="text-secondary-600">Your exam attempts and results</p>
        </div>
        
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Error loading exam history</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with User Info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Exam History</h1>
          <div className="flex items-center space-x-2 text-secondary-600">
            <User className="h-4 w-4" />
            <span>
              <strong>{user?.user_metadata?.full_name || user?.email}</strong>
              {user?.user_metadata?.full_name && (
                <span className="text-sm ml-2">({user.email})</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-5">
              <p className="text-sm font-medium text-secondary-500">Total Exams</p>
              <p className="text-lg font-medium text-secondary-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-5">
              <p className="text-sm font-medium text-secondary-500">Completed</p>
              <p className="text-lg font-medium text-secondary-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <div className="ml-5">
              <p className="text-sm font-medium text-secondary-500">Passed</p>
              <p className="text-lg font-medium text-secondary-900">{stats.passed}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            <div className="ml-5">
              <p className="text-sm font-medium text-secondary-500">Avg. Score</p>
              <p className="text-lg font-medium text-secondary-900">
                {stats.averageScore > 0 ? `${stats.averageScore}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-primary-100 text-primary-900' 
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            All ({examHistory.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'completed' 
                ? 'bg-primary-100 text-primary-900' 
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            Completed ({stats.completed})
          </button>
          <button
            onClick={() => setFilter('passed')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'passed' 
                ? 'bg-primary-100 text-primary-900' 
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            Passed ({stats.passed})
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === 'failed' 
                ? 'bg-primary-100 text-primary-900' 
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            Failed ({stats.completed - stats.passed})
          </button>
        </div>
      </div>

      {/* Exam History List */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200">
          <h3 className="text-lg font-medium text-secondary-900">
            Exam Attempts ({filteredHistory.length})
          </h3>
        </div>

        {filteredHistory.length > 0 ? (
          <div className="divide-y divide-secondary-200">
            {filteredHistory.map((exam) => (
              <div key={exam.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(exam)}
                      <h4 className="text-lg font-medium text-secondary-900">
                        {exam.exam_title}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exam)}`}>
                        {getStatusText(exam)}
                      </span>
                    </div>
                    
                    {exam.exam_description && (
                      <p className="text-sm text-secondary-600 mb-2">{exam.exam_description}</p>
                    )}
                    
                    {/* Student Name Display */}
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="h-4 w-4 text-secondary-400" />
                      <span className="text-sm font-medium text-secondary-700">
                        {exam.user_name || exam.user_email}
                      </span>
                      {exam.user_name && (
                        <span className="text-xs text-secondary-500">({exam.user_email})</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-secondary-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Started: {new Date(exam.started_at).toLocaleDateString()}</span>
                      </div>
                      
                      {exam.completed_at && (
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span>Completed: {new Date(exam.completed_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {exam.time_spent && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{exam.time_spent} minutes</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {exam.completed_at && (
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(exam.score)}`}>
                          {exam.score}%
                        </div>
                        <div className="text-sm text-secondary-500">
                          {Math.round((exam.score / 100) * exam.total_points)} / {exam.total_points} points
                        </div>
                      </div>
                    )}
                    
                    {exam.completed_at && exam.show_results && (
                      <Link
                        to={`/exam/${exam.exam_id}/result`}
                        className="btn-outline px-3 py-1 text-sm flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Results</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <FileText className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              {filter === 'all' ? 'No exam history yet' : `No ${filter} exams`}
            </h3>
            <p className="text-secondary-500">
              {filter === 'all' 
                ? 'Your exam attempts will appear here'
                : `No exams match the ${filter} filter`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}