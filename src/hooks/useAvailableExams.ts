import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface AvailableExam {
  id: string
  exam_id: string
  exam_title: string
  exam_description: string | null
  code: string
  expires_at: string | null
  used: boolean
  created_at: string
  exam_start_date: string | null
  exam_end_date: string | null
  exam_status: string
  attempt_completed: boolean
  attempt_score: number | null
  status: 'available' | 'completed' | 'expired' | 'not_started'
}

export function useAvailableExams() {
  const { user } = useAuth()
  const [availableExams, setAvailableExams] = useState<AvailableExam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAvailableExams = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Get exam codes assigned to this user
      const { data: examCodes, error: codesError } = await supabase
        .from('exam_codes')
        .select(`
          *,
          exams (
            id,
            title,
            description,
            start_date,
            end_date,
            status
          )
        `)
        .eq('user_email', user.email)
        .order('created_at', { ascending: false })

      if (codesError) throw codesError

      if (!examCodes || examCodes.length === 0) {
        setAvailableExams([])
        return
      }

      // Get exam attempts for these exams
      const examIds = examCodes.map(code => code.exam_id)
      const { data: attempts, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select('exam_id, completed_at, score')
        .eq('user_id', user.id)
        .in('exam_id', examIds)
        .not('completed_at', 'is', null)

      if (attemptsError) throw attemptsError

      // Process the data to determine status
      const processedExams: AvailableExam[] = examCodes.map(code => {
        const exam = code.exams
        const attempt = attempts?.find(a => a.exam_id === code.exam_id)
        const now = new Date()
        
        let status: 'available' | 'completed' | 'expired' | 'not_started' = 'available'
        
        // Check if exam is completed
        if (attempt && attempt.completed_at) {
          status = 'completed'
        }
        // Check if code is expired
        else if (code.expires_at && new Date(code.expires_at) < now) {
          status = 'expired'
        }
        // Check if exam hasn't started yet
        else if (exam.start_date && new Date(exam.start_date) > now) {
          status = 'not_started'
        }
        // Check if exam has ended
        else if (exam.end_date && new Date(exam.end_date) < now) {
          status = 'expired'
        }
        // Check if exam is not published
        else if (exam.status !== 'published') {
          status = 'not_started'
        }

        return {
          id: code.id,
          exam_id: code.exam_id,
          exam_title: exam.title,
          exam_description: exam.description,
          code: code.code,
          expires_at: code.expires_at,
          used: code.used,
          created_at: code.created_at,
          exam_start_date: exam.start_date,
          exam_end_date: exam.end_date,
          exam_status: exam.status,
          attempt_completed: !!attempt?.completed_at,
          attempt_score: attempt?.score || null,
          status
        }
      })

      setAvailableExams(processedExams)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch available exams')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAvailableExams()
  }, [user])

  return {
    availableExams,
    loading,
    error,
    refetch: fetchAvailableExams
  }
}