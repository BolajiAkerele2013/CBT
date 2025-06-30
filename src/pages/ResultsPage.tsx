import React from 'react'
import { useParams } from 'react-router-dom'
import { useExamResults } from '../hooks/useExamResults'
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Award,
  Download,
  Eye,
  AlertCircle,
  User
} from 'lucide-react'

export function ResultsPage() {
  const { examId } = useParams()
  const { exam, attempts, stats, scoreDistribution, loading, error } = useExamResults(examId!)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Exam Results</h1>
            <p className="text-secondary-600">Loading exam data...</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Exam Results</h1>
            <p className="text-secondary-600">Error loading exam data</p>
          </div>
        </div>
        
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Error loading exam results</p>
              <p className="text-sm text-red-700 mt-1">{error || 'Exam not found'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const statsDisplay = [
    { 
      name: 'Average Score', 
      value: stats.averageScore > 0 ? `${stats.averageScore}%` : 'N/A', 
      icon: TrendingUp, 
      color: 'text-blue-600' 
    },
    { 
      name: 'Total Attempts', 
      value: stats.totalAttempts.toString(), 
      icon: Users, 
      color: 'text-green-600' 
    },
    { 
      name: 'Average Time', 
      value: stats.averageTime > 0 ? `${stats.averageTime} min` : 'N/A', 
      icon: Clock, 
      color: 'text-purple-600' 
    },
    { 
      name: 'Pass Rate', 
      value: `${stats.passRate}%`, 
      icon: Award, 
      color: 'text-orange-600' 
    },
  ]

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            {exam.title} - Results
          </h1>
          <p className="text-secondary-600">
            {exam.description || 'Exam results and analytics'}
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-outline px-4 py-2 flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button className="btn-secondary px-4 py-2 flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsDisplay.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-secondary-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-secondary-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Score Distribution */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-secondary-900 mb-4">Score Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{scoreDistribution.excellent}</div>
            <div className="text-sm text-green-700">Excellent (80-100%)</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{scoreDistribution.good}</div>
            <div className="text-sm text-yellow-700">Good (60-79%)</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{scoreDistribution.needsImprovement}</div>
            <div className="text-sm text-red-700">Needs Improvement (&lt;60%)</div>
          </div>
        </div>
      </div>

      {/* Individual Results */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200">
          <h3 className="text-lg font-medium text-secondary-900">Individual Results</h3>
        </div>
        {attempts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Time Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Completed At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-secondary-400 mr-3" />
                        <div>
                          <div className="text-sm font-bold text-secondary-900">
                            {attempt.profiles.full_name || 'Name Not Available'}
                          </div>
                          <div className="text-sm text-secondary-500">
                            {attempt.profiles.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-lg font-medium ${getScoreColor(attempt.score || 0)}`}>
                          {attempt.score || 0}%
                        </span>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBadge(attempt.score || 0)}`}>
                          {attempt.score || 0}/{attempt.total_points}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                      {attempt.time_spent ? `${attempt.time_spent} minutes` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                      {attempt.completed_at ? new Date(attempt.completed_at).toLocaleString() : 'In Progress'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-primary-600 hover:text-primary-900 flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <Users className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No attempts yet</h3>
            <p className="text-secondary-500">Students haven't taken this exam yet</p>
          </div>
        )}
      </div>
    </div>
  )
}