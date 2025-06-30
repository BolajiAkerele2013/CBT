import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../types/database'

type ExamCode = Database['public']['Tables']['exam_codes']['Row']

export function useExamCodes(examId?: string) {
  const { user } = useAuth()
  const [codes, setCodes] = useState<ExamCode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCodes = async () => {
    if (!examId || !user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('exam_codes')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCodes(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch exam codes')
    } finally {
      setLoading(false)
    }
  }

  const generateCode = async (userEmail: string, expiresAt?: string) => {
    if (!examId || !user) throw new Error('Exam ID and user required')

    try {
      // Generate a unique 8-character code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()

      const { data, error } = await supabase
        .from('exam_codes')
        .insert({
          exam_id: examId,
          code,
          user_email: userEmail,
          expires_at: expiresAt || null
        })
        .select()
        .single()

      if (error) throw error

      await fetchCodes()
      return data
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to generate exam code')
    }
  }

  const generateBulkCodes = async (emails: string[], expiresAt?: string) => {
    if (!examId || !user) throw new Error('Exam ID and user required')

    try {
      const codesToInsert = emails.map(email => ({
        exam_id: examId,
        code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        user_email: email,
        expires_at: expiresAt || null
      }))

      const { data, error } = await supabase
        .from('exam_codes')
        .insert(codesToInsert)
        .select()

      if (error) throw error

      await fetchCodes()
      return data
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to generate bulk codes')
    }
  }

  const deleteCode = async (codeId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { error } = await supabase
        .from('exam_codes')
        .delete()
        .eq('id', codeId)

      if (error) throw error

      await fetchCodes()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete code')
    }
  }

  useEffect(() => {
    if (examId) {
      fetchCodes()
    }
  }, [examId, user])

  return {
    codes,
    loading,
    error,
    generateCode,
    generateBulkCodes,
    deleteCode,
    refetch: fetchCodes
  }
}