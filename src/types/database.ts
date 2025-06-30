export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'creator' | 'editor' | 'admin' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'creator' | 'editor' | 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'creator' | 'editor' | 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
      }
      exams: {
        Row: {
          id: string
          title: string
          description: string | null
          creator_id: string
          status: 'draft' | 'published' | 'archived'
          start_date: string | null
          end_date: string | null
          time_limit: number | null
          shuffle_questions: boolean
          show_results: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          creator_id: string
          status?: 'draft' | 'published' | 'archived'
          start_date?: string | null
          end_date?: string | null
          time_limit?: number | null
          shuffle_questions?: boolean
          show_results?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          creator_id?: string
          status?: 'draft' | 'published' | 'archived'
          start_date?: string | null
          end_date?: string | null
          time_limit?: number | null
          shuffle_questions?: boolean
          show_results?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          exam_id: string
          name: string
          time_limit: number | null
          pass_mark: number
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          name: string
          time_limit?: number | null
          pass_mark?: number
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          name?: string
          time_limit?: number | null
          pass_mark?: number
          order_index?: number
          created_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          subject_id: string
          type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer'
          question_text: string
          options: string[] | null
          correct_answers: string[]
          points: number
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer'
          question_text: string
          options?: string[] | null
          correct_answers: string[]
          points?: number
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          type?: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer'
          question_text?: string
          options?: string[] | null
          correct_answers?: string[]
          points?: number
          order_index?: number
          created_at?: string
        }
      }
      exam_codes: {
        Row: {
          id: string
          exam_id: string
          code: string
          user_email: string
          used: boolean
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          exam_id: string
          code: string
          user_email: string
          used?: boolean
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          exam_id?: string
          code?: string
          user_email?: string
          used?: boolean
          expires_at?: string | null
          created_at?: string
        }
      }
      exam_attempts: {
        Row: {
          id: string
          exam_id: string
          user_id: string
          code_id: string
          answers: Record<string, any>
          score: number | null
          total_points: number
          started_at: string
          completed_at: string | null
          time_spent: number | null
        }
        Insert: {
          id?: string
          exam_id: string
          user_id: string
          code_id: string
          answers?: Record<string, any>
          score?: number | null
          total_points: number
          started_at?: string
          completed_at?: string | null
          time_spent?: number | null
        }
        Update: {
          id?: string
          exam_id?: string
          user_id?: string
          code_id?: string
          answers?: Record<string, any>
          score?: number | null
          total_points?: number
          started_at?: string
          completed_at?: string | null
          time_spent?: number | null
        }
      }
    }
    Views: {
      exam_results_view: {
        Row: {
          id: string
          exam_id: string
          user_id: string
          code_id: string
          score: number | null
          total_points: number
          started_at: string
          completed_at: string | null
          time_spent: number | null
          exam_title: string
          exam_description: string | null
          show_results: boolean
          user_email: string
          user_name: string | null
          passed: boolean | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}