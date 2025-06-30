import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../types/database'

type Exam = Database['public']['Tables']['exams']['Row']
type ExamInsert = Database['public']['Tables']['exams']['Insert']
type ExamUpdate = Database['public']['Tables']['exams']['Update']
type Subject = Database['public']['Tables']['subjects']['Row']
type SubjectInsert = Database['public']['Tables']['subjects']['Insert']

export interface ExamWithSubjects extends Exam {
  subjects?: Subject[]
}

export function useExams() {
  const { user } = useAuth()
  const [exams, setExams] = useState<ExamWithSubjects[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExams = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('exams')
        .select(`
          *,
          subjects (*)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setExams(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch exams')
    } finally {
      setLoading(false)
    }
  }

  const createExam = async (examData: Omit<ExamInsert, 'creator_id'>, subjects: Omit<SubjectInsert, 'exam_id'>[]) => {
    if (!user) throw new Error('User not authenticated')

    try {
      // Create the exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          ...examData,
          creator_id: user.id
        })
        .select()
        .single()

      if (examError) throw examError

      // Create subjects if any
      if (subjects.length > 0) {
        const subjectsToInsert = subjects.map((subject, index) => ({
          ...subject,
          exam_id: exam.id,
          order_index: index
        }))

        const { error: subjectsError } = await supabase
          .from('subjects')
          .insert(subjectsToInsert)

        if (subjectsError) throw subjectsError
      }

      await fetchExams()
      return exam
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create exam')
    }
  }

  const updateExam = async (examId: string, examData: ExamUpdate, subjects: Omit<SubjectInsert, 'exam_id'>[]) => {
    if (!user) throw new Error('User not authenticated')

    try {
      // Update the exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .update(examData)
        .eq('id', examId)
        .eq('creator_id', user.id)
        .select()
        .single()

      if (examError) throw examError

      // Get existing subjects to preserve questions
      const { data: existingSubjects, error: fetchError } = await supabase
        .from('subjects')
        .select('*')
        .eq('exam_id', examId)

      if (fetchError) throw fetchError

      // Update or create subjects while preserving existing ones with questions
      for (let i = 0; i < subjects.length; i++) {
        const subject = subjects[i]
        const existingSubject = existingSubjects?.[i]

        if (existingSubject) {
          // Update existing subject
          const { error: updateError } = await supabase
            .from('subjects')
            .update({
              name: subject.name,
              time_limit: subject.time_limit,
              pass_mark: subject.pass_mark,
              order_index: i
            })
            .eq('id', existingSubject.id)

          if (updateError) throw updateError
        } else {
          // Create new subject
          const { error: insertError } = await supabase
            .from('subjects')
            .insert({
              ...subject,
              exam_id: examId,
              order_index: i
            })

          if (insertError) throw insertError
        }
      }

      // Remove extra subjects if the new list is shorter
      if (existingSubjects && existingSubjects.length > subjects.length) {
        const subjectsToDelete = existingSubjects.slice(subjects.length)
        for (const subject of subjectsToDelete) {
          const { error: deleteError } = await supabase
            .from('subjects')
            .delete()
            .eq('id', subject.id)

          if (deleteError) throw deleteError
        }
      }

      await fetchExams()
      return exam
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update exam')
    }
  }

  const publishExam = async (examId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data: exam, error } = await supabase
        .from('exams')
        .update({ status: 'published' })
        .eq('id', examId)
        .eq('creator_id', user.id)
        .select()
        .single()

      if (error) throw error

      await fetchExams()
      return exam
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to publish exam')
    }
  }

  const deleteExam = async (examId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      // Check if exam is published
      const { data: exam, error: fetchError } = await supabase
        .from('exams')
        .select('status')
        .eq('id', examId)
        .eq('creator_id', user.id)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (!exam) {
        throw new Error('Exam not found or you do not have permission to delete it.')
      }

      if (exam.status === 'published') {
        throw new Error('Cannot delete published exams. You can only delete draft exams.')
      }

      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId)
        .eq('creator_id', user.id)

      if (error) throw error

      await fetchExams()
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete exam')
    }
  }

  useEffect(() => {
    fetchExams()
  }, [user])

  return {
    exams,
    loading,
    error,
    createExam,
    updateExam,
    publishExam,
    deleteExam,
    refetch: fetchExams
  }
}