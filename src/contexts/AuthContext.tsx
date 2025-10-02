import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  profile: any | null
  authError: string | null
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  updatePassword: (newPassword: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const checkUserApproval = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        setAuthError('Failed to load user profile. Please try again.')
        setLoading(false)
        return
      }

      setProfile(profileData)

      if (!profileData?.approved) {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setProfile(null)
      }

      setLoading(false)
    } catch (err) {
      console.error('Error checking approval:', err)
      setAuthError('An unexpected error occurred. Please refresh the page.')
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.error('Authentication initialization timeout')
        setAuthError('Failed to initialize authentication. Please check your connection and refresh the page.')
        setLoading(false)
      }
    }, 10000) // 10 second timeout

    // Get initial session
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (!mounted) return

        if (error) {
          console.error('Error getting session:', error)
          setAuthError('Failed to connect to authentication service. Please check your connection.')
          setLoading(false)
          clearTimeout(loadingTimeout)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await checkUserApproval(session.user.id)
        } else {
          setLoading(false)
        }

        clearTimeout(loadingTimeout)
      })
      .catch((err) => {
        if (!mounted) return
        console.error('Unexpected error during session initialization:', err)
        setAuthError('Failed to initialize authentication. Please refresh the page.')
        setLoading(false)
        clearTimeout(loadingTimeout)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)
      setAuthError(null)

      if (session?.user) {
        await checkUserApproval(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error }
    }

    if (data.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('approved')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError) {
        return { error: profileError }
      }

      if (!profileData?.approved) {
        await supabase.auth.signOut()
        return {
          error: {
            message: 'Your account is pending approval. Please wait for an administrator to approve your account before you can log in.',
            name: 'ApprovalPending'
          } as any
        }
      }
    }

    return { error: null }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { error }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    authError,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}