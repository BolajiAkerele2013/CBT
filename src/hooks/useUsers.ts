import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Database } from '../types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export function useUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, role: 'creator' | 'editor' | 'admin' | 'user') => {
    if (!user) throw new Error('User not authenticated')

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      await fetchUsers()
      return data
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update user role')
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [user])

  return {
    users,
    loading,
    error,
    updateUserRole,
    refetch: fetchUsers
  }
}