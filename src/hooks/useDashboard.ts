import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../types/database'

type Exam = Database['public']['Tables']['exams']['Row']

interface DashboardStats {
  totalExams: number
  activeExams: number
  totalAttempts: number
  averageScore: number
}

interface RecentExam extends Exam {
  attempts_count: number
}

export function useDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalExams: 0,
    activeExams: 0,
    totalAttempts: 0,
    averageScore: 0
  })
  const [recentExams, setRecentExams] = useState<RecentExam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch exams with attempt counts
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select(`
          *,
          exam_attempts(count)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })

      if (examsError) throw examsError

      // Process exams data
      const exams = examsData || []
      const recentExamsWithCounts = exams.slice(0, 5).map(exam => ({
        ...exam,
        attempts_count: Array.isArray(exam.exam_attempts) ? exam.exam_attempts.length : 0
      }))

      setRecentExams(recentExamsWithCounts)

      // Calculate stats
      const totalExams = exams.length
      const activeExams = exams.filter(exam => exam.status === 'published').length

      // Fetch all attempts for this user's exams
      const examIds = exams.map(exam => exam.id)
      let totalAttempts = 0
      let averageScore = 0

      if (examIds.length > 0) {
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('exam_attempts')
          .select('score')
          .in('exam_id', examIds)
          .not('completed_at', 'is', null)

        if (attemptsError) throw attemptsError

        totalAttempts = attemptsData?.length || 0
        
        if (totalAttempts > 0) {
          const validScores = attemptsData?.filter(attempt => attempt.score !== null) || []
          if (validScores.length > 0) {
            const totalScore = validScores.reduce((sum, attempt) => sum + (attempt.score || 0), 0)
            averageScore = Math.round(totalScore / validScores.length)
          }
        }
      }

      setStats({
        totalExams,
        activeExams,
        totalAttempts,
        averageScore
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  return {
    stats,
    recentExams,
    loading,
    error,
    refetch: fetchDashboardData
  }
}