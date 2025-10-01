import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { AvailableExamsPage } from './pages/AvailableExamsPage'
import { ExamCreationPage } from './pages/ExamCreationPage'
import { ExamTakingPage } from './pages/ExamTakingPage'
import { ExamResultPage } from './pages/ExamResultPage'
import { ExamHistoryPage } from './pages/ExamHistoryPage'
import { ResultsPage } from './pages/ResultsPage'
import { QuestionBankPage } from './pages/QuestionBankPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-secondary-50">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/exam/:examId/take" element={<ExamTakingPage />} />
          <Route path="/exam/:examId/result" element={<ExamResultPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/available-exams" element={<AvailableExamsPage />} />
                    <Route path="/exam-history" element={<ExamHistoryPage />} />
                    <Route path="/exams/create" element={<ExamCreationPage />} />
                    <Route path="/exams/:examId/edit" element={<ExamCreationPage />} />
                    <Route path="/exams/:examId/results" element={<ResultsPage />} />
                    <Route path="/questions" element={<QuestionBankPage />} />
                    <Route path="/users" element={
                      <ProtectedRoute requireRole={['admin', 'creator']}>
                        <UsersPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App