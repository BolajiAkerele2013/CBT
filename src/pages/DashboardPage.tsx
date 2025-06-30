import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { useExams } from '../hooks/useExams'
import { 
  Plus, 
  FileText, 
  Users, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit,
  BarChart3,
  LogOut
} from 'lucide-react'

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const { stats, recentExams, loading, error } = useDashboard()
  const { deleteExam } = useExams()

  const statsDisplay = [
    { 
      name: 'Total Exams', 
      value: stats.totalExams.toString(), 
      icon: FileText, 
      color: 'text-blue-600' 
    },
    { 
      name: 'Active Exams', 
      value: stats.activeExams.toString(), 
      icon: CheckCircle, 
      color: 'text-green-600' 
    },
    { 
      name: 'Total Attempts', 
      value: stats.totalAttempts.toString(), 
      icon: Users, 
      color: 'text-purple-600' 
    },
    { 
      name: 'Avg. Score', 
      value: stats.averageScore > 0 ? `${stats.averageScore}%` : 'N/A', 
      icon: TrendingUp, 
      color: 'text-orange-600' 
    },
  ]

  const handleDeleteExam = async (examId: string, examTitle: string) => {
    if (confirm(`Are you sure you want to delete "${examTitle}"? This action cannot be undone.`)) {
      try {
        await deleteExam(examId)
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete exam')
      }
    }
  }

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        await signOut()
      } catch (error) {
        console.error('Error signing out:', error)
        alert('Failed to sign out. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
            <p className="text-secondary-600">Welcome back, {user?.email}</p>
          </div>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
            <p className="text-secondary-600">Welcome back, {user?.email}</p>
          </div>
        </div>
        
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">Error loading dashboard</p>
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
          <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
          <p className="text-secondary-600">Welcome back, {user?.email}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/exams/create"
            className="btn-primary px-4 py-2 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Exam</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="btn-outline px-4 py-2 flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
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

      {/* Recent Exams */}
      <div className="card">
        <div className="px-6 py-4 border-b border-secondary-200">
          <h3 className="text-lg font-medium text-secondary-900">Recent Exams</h3>
        </div>
        {recentExams.length > 0 ? (
          <div className="divide-y divide-secondary-200">
            {recentExams.map((exam) => (
              <div key={exam.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <FileText className="h-5 w-5 text-secondary-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-secondary-900">
                      {exam.title}
                    </h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        exam.status === 'published' 
                          ? 'bg-green-100 text-green-800'
                          : exam.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {exam.status === 'published' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {exam.status}
                      </span>
                      <span className="text-xs text-secondary-500">
                        {exam.attempts_count} attempts
                      </span>
                      <span className="text-xs text-secondary-500">
                        Created {new Date(exam.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/exams/${exam.id}/edit`}
                    className="btn-outline px-3 py-1 text-xs flex items-center space-x-1"
                  >
                    <Edit className="h-3 w-3" />
                    <span>Edit</span>
                  </Link>
                  {exam.status === 'published' && (
                    <Link
                      to={`/exams/${exam.id}/results`}
                      className="btn-secondary px-3 py-1 text-xs flex items-center space-x-1"
                    >
                      <BarChart3 className="h-3 w-3" />
                      <span>Results</span>
                    </Link>
                  )}
                  {exam.status === 'draft' && (
                    <button
                      onClick={() => handleDeleteExam(exam.id, exam.title)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Delete exam"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <FileText className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No exams yet</h3>
            <p className="text-secondary-500 mb-4">Get started by creating your first exam</p>
            <Link
              to="/exams/create"
              className="btn-primary px-4 py-2 inline-flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Exam</span>
            </Link>
          </div>
        )}
        {recentExams.length > 0 && (
          <div className="px-6 py-3 bg-secondary-50 border-t border-secondary-200">
            <Link
              to="/exams"
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              View all exams →
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/exams/create"
          className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center">
            <Plus className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-secondary-900">Create New Exam</h3>
              <p className="text-sm text-secondary-500">Start building your next assessment</p>
            </div>
          </div>
        </Link>

        <Link
          to="/questions"
          className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-secondary-900">Question Bank</h3>
              <p className="text-sm text-secondary-500">Manage your question library</p>
            </div>
          </div>
        </Link>

        <Link
          to="/users"
          className="card p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-secondary-900">Manage Users</h3>
              <p className="text-sm text-secondary-500">Handle user access and codes</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}