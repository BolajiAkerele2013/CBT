import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../types/database'

type Question = Database['public']['Tables']['questions']['Row']
type QuestionInsert = Database['public']['Tables']['questions']['Insert']
type QuestionUpdate = Database['public']['Tables']['questions']['Update']

export function useQuestions(subjectId?: string) {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuestions = async () => {
    if (!subjectId) {
      setQuestions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: true })

      if (error) throw error
      setQuestions(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch questions')
    } finally {
      setLoading(false)
    }
  }

  const createQuestion = async (questionData: Omit<QuestionInsert, 'subject_id' | 'order_index'>) => {
    if (!user || !subjectId) throw new Error('User not authenticated or subject not specified')

    try {
      // Get the next order index
      const { data: existingQuestions } = await supabase
        .from('questions')
        .select('order_index')
        .eq('subject_id', subjectId)
        .order('order_index', { ascending: false })
        .limit(1)

      const nextOrderIndex = existingQuestions && existingQuestions.length > 0 
        ? existingQuestions[0].order_index + 1 
        : 0

      const { data: question, error } = await supabase
        .from('questions')
        .insert({
          ...questionData,
          subject_id: subjectId,
          order_index: nextOrderIndex
        })
        .select()
        .single()

      if (error) throw error

      await fetchQuestions()
      return question
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create question')
    }
  }

  const updateQuestion = async (questionId: string, questionData: QuestionUpdate) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data: question, error } = await supabase
        .from('questions')
        .update(questionData)
        .eq('id', questionId)
        .select()
        .single()

      if (error) throw error

      await fetchQuestions()
      return question
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update question')
    }
  }

  const deleteQuestion = async (questionId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId)

      if (error) throw error

      await fetchQuestions()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete question')
    }
  }

  useEffect(() => {
    fetchQuestions()
  }, [subjectId])

  return {
    questions,
    loading,
    error,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    refetch: fetchQuestions
  }
}