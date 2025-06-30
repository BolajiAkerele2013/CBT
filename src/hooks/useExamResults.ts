import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../types/database'

type Exam = Database['public']['Tables']['exams']['Row']
type ExamAttempt = Database['public']['Tables']['exam_attempts']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface ExamAttemptWithProfile extends ExamAttempt {
  profiles: Profile
}

interface ExamResultsStats {
  averageScore: number
  highestScore: number
  lowestScore: number
  passRate: number
  averageTime: number
  totalAttempts: number
}

interface ScoreDistribution {
  excellent: number // 80-100%
  good: number      // 60-79%
  needsImprovement: number // <60%
}

export function useExamResults(examId: string) {
  const { user } = useAuth()
  const [exam, setExam] = useState<Exam | null>(null)
  const [attempts, setAttempts] = useState<ExamAttemptWithProfile[]>([])
  const [stats, setStats] = useState<ExamResultsStats>({
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    passRate: 0,
    averageTime: 0,
    totalAttempts: 0
  })
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution>({
    excellent: 0,
    good: 0,
    needsImprovement: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExamResults = async () => {
    if (!user || !examId) return

    try {
      setLoading(true)
      setError(null)

      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .eq('creator_id', user.id)
        .single()

      if (examError) throw examError
      setExam(examData)

      // Fetch attempts with user profiles
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          profiles (*)
        `)
        .eq('exam_id', examId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })

      if (attemptsError) throw attemptsError

      const attemptsWithProfiles = attemptsData || []
      setAttempts(attemptsWithProfiles)

      // Calculate statistics
      if (attemptsWithProfiles.length > 0) {
        const completedAttempts = attemptsWithProfiles.filter(attempt => 
          attempt.score !== null && attempt.completed_at
        )

        if (completedAttempts.length > 0) {
          const scores = completedAttempts.map(attempt => attempt.score || 0)
          const times = completedAttempts
            .filter(attempt => attempt.time_spent)
            .map(attempt => attempt.time_spent || 0)

          const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
          const highestScore = Math.max(...scores)
          const lowestScore = Math.min(...scores)
          const passRate = Math.round((scores.filter(score => score >= 60).length / scores.length) * 100)
          const averageTime = times.length > 0 
            ? Math.round(times.reduce((sum, time) => sum + time, 0) / times.length)
            : 0

          setStats({
            averageScore,
            highestScore,
            lowestScore,
            passRate,
            averageTime,
            totalAttempts: completedAttempts.length
          })

          // Calculate score distribution
          const excellent = scores.filter(score => score >= 80).length
          const good = scores.filter(score => score >= 60 && score < 80).length
          const needsImprovement = scores.filter(score => score < 60).length

          setScoreDistribution({
            excellent,
            good,
            needsImprovement
          })
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch exam results')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExamResults()
  }, [user, examId])

  return {
    exam,
    attempts,
    stats,
    scoreDistribution,
    loading,
    error,
    refetch: fetchExamResults
  }
}