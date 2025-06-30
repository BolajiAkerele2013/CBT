import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../types/database'

type Question = Database['public']['Tables']['questions']['Row']
type Subject = Database['public']['Tables']['subjects']['Row']
type Exam = Database['public']['Tables']['exams']['Row']

interface QuestionWithDetails extends Question {
  subjects: Subject & {
    exams: Exam
  }
}

export function useQuestionBank() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<QuestionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuestions = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          subjects!inner (
            *,
            exams!inner (*)
          )
        `)
        .eq('subjects.exams.creator_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuestions(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch questions')
    } finally {
      setLoading(false)
    }
  }

  const copyQuestionToSubject = async (questionId: string, targetSubjectId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      // Get the original question
      const { data: originalQuestion, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single()

      if (fetchError) throw fetchError

      // Get the next order index for the target subject
      const { data: existingQuestions } = await supabase
        .from('questions')
        .select('order_index')
        .eq('subject_id', targetSubjectId)
        .order('order_index', { ascending: false })
        .limit(1)

      const nextOrderIndex = existingQuestions && existingQuestions.length > 0 
        ? existingQuestions[0].order_index + 1 
        : 0

      // Create a copy of the question
      const { data: newQuestion, error: insertError } = await supabase
        .from('questions')
        .insert({
          subject_id: targetSubjectId,
          type: originalQuestion.type,
          question_text: originalQuestion.question_text,
          options: originalQuestion.options,
          correct_answers: originalQuestion.correct_answers,
          points: originalQuestion.points,
          order_index: nextOrderIndex
        })
        .select()
        .single()

      if (insertError) throw insertError

      await fetchQuestions()
      return newQuestion
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to copy question')
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [user])

  return {
    questions,
    loading,
    error,
    copyQuestionToSubject,
    refetch: fetchQuestions
  }
}