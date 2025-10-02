import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BookOpen, ArrowLeft } from 'lucide-react'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const result = await resetPassword(email)

      if (result.error) {
        setError(result.error.message || 'Failed to send password reset email')
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <BookOpen className="h-12 w-12 text-primary-600" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold text-secondary-900">
              Check your email
            </h2>
            <p className="mt-2 text-center text-sm text-secondary-600">
              Computer-Based Testing System
            </p>
          </div>

          <div className="rounded-lg bg-green-50 border border-green-200 p-6">
            <p className="text-sm text-green-800 text-center">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-green-700 text-center mt-2">
              Please check your email and click the link to reset your password.
            </p>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <BookOpen className="h-12 w-12 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-secondary-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-secondary-600">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-secondary-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input mt-1"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2 px-4 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending reset link...
                </div>
              ) : (
                'Send reset link'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
