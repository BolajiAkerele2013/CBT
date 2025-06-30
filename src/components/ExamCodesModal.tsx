import { useState } from 'react'
import { X, Download, Trash2, Copy, Users, Mail, Eye, EyeOff, ExternalLink, Link as LinkIcon } from 'lucide-react'
import { useExamCodes } from '../hooks/useExamCodes'

interface ExamCodesModalProps {
  isOpen: boolean
  onClose: () => void
  examId: string
}

export function ExamCodesModal({ isOpen, onClose, examId }: ExamCodesModalProps) {
  const { codes, loading, generateCode, generateBulkCodes, deleteCode } = useExamCodes(examId)
  const [singleEmail, setSingleEmail] = useState('')
  const [bulkEmails, setBulkEmails] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showCodes, setShowCodes] = useState<Record<string, boolean>>({})

  const handleGenerateSingle = async () => {
    if (!singleEmail.trim()) {
      alert('Please enter an email address')
      return
    }

    try {
      setGenerating(true)
      await generateCode(singleEmail, expiresAt || undefined)
      setSingleEmail('')
      alert('Code generated and sent via email successfully!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to generate code')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateBulk = async () => {
    const emails = bulkEmails
      .split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'))

    if (emails.length === 0) {
      alert('Please enter valid email addresses (one per line)')
      return
    }

    try {
      setGenerating(true)
      await generateBulkCodes(emails, expiresAt || undefined)
      setBulkEmails('')
      alert(`${emails.length} codes generated and sent via email successfully!`)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to generate codes')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    alert('Code copied to clipboard!')
  }

  const handleCopyExamUrl = (code: string) => {
    const examUrl = `${window.location.origin}/exam/${examId}/take?code=${code}`
    navigator.clipboard.writeText(examUrl)
    alert('Exam URL copied to clipboard!')
  }

  const handleDeleteCode = async (codeId: string) => {
    if (confirm('Are you sure you want to delete this code?')) {
      try {
        await deleteCode(codeId)
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete code')
      }
    }
  }

  const toggleCodeVisibility = (codeId: string) => {
    setShowCodes(prev => ({
      ...prev,
      [codeId]: !prev[codeId]
    }))
  }

  const exportCodes = () => {
    const csvContent = [
      'Email,Code,Exam URL,Used,Expires At,Created At',
      ...codes.map(code => {
        const examUrl = `${window.location.origin}/exam/${examId}/take?code=${code.code}`
        return `${code.user_email},${code.code},${examUrl},${code.used ? 'Yes' : 'No'},${code.expires_at || 'Never'},${new Date(code.created_at).toLocaleString()}`
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `exam-codes-${examId}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-secondary-900">Exam Access Codes & URLs</h2>
          <button
            onClick={onClose}
            className="text-secondary-400 hover:text-secondary-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Generate Codes */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-secondary-900 mb-4">Generate New Codes</h3>
                
                {/* Single Code Generation */}
                <div className="card p-4 mb-4">
                  <h4 className="font-medium text-secondary-900 mb-3 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Single Code
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="email"
                      className="input w-full"
                      placeholder="Enter email address"
                      value={singleEmail}
                      onChange={(e) => setSingleEmail(e.target.value)}
                    />
                    <button
                      onClick={handleGenerateSingle}
                      disabled={generating}
                      className="btn-primary w-full py-2 flex items-center justify-center space-x-2"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Generate & Send Code</span>
                    </button>
                  </div>
                </div>

                {/* Bulk Code Generation */}
                <div className="card p-4">
                  <h4 className="font-medium text-secondary-900 mb-3 flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    Bulk Codes
                  </h4>
                  <div className="space-y-3">
                    <textarea
                      className="input w-full h-32 resize-none"
                      placeholder="Enter email addresses (one per line)"
                      value={bulkEmails}
                      onChange={(e) => setBulkEmails(e.target.value)}
                    />
                    <button
                      onClick={handleGenerateBulk}
                      disabled={generating}
                      className="btn-primary w-full py-2 flex items-center justify-center space-x-2"
                    >
                      <Users className="h-4 w-4" />
                      <span>Generate & Send Bulk Codes</span>
                    </button>
                  </div>
                </div>

                {/* Expiration Date */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    className="input w-full"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Existing Codes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-secondary-900">Generated Codes & URLs</h3>
                {codes.length > 0 && (
                  <button
                    onClick={exportCodes}
                    className="btn-outline px-3 py-1 text-sm flex items-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : codes.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {codes.map((code) => {
                    const examUrl = `${window.location.origin}/exam/${examId}/take?code=${code.code}`
                    return (
                      <div key={code.id} className="border border-secondary-200 rounded-lg p-4">
                        <div className="space-y-3">
                          {/* User Email */}
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-secondary-400" />
                            <span className="text-sm font-medium text-secondary-900">{code.user_email}</span>
                          </div>

                          {/* Access Code */}
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-secondary-500 w-16">Code:</span>
                            <span className="font-mono text-sm font-medium text-primary-600">
                              {showCodes[code.id] ? code.code : '••••••••'}
                            </span>
                            <button
                              onClick={() => toggleCodeVisibility(code.id)}
                              className="text-secondary-400 hover:text-secondary-600"
                              title={showCodes[code.id] ? 'Hide code' : 'Show code'}
                            >
                              {showCodes[code.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleCopyCode(code.code)}
                              className="text-secondary-400 hover:text-secondary-600"
                              title="Copy code"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Exam URL */}
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-secondary-500 w-16">URL:</span>
                            <span className="text-xs text-blue-600 truncate flex-1 font-mono">
                              {examUrl}
                            </span>
                            <button
                              onClick={() => handleCopyExamUrl(code.code)}
                              className="text-secondary-400 hover:text-secondary-600"
                              title="Copy exam URL"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </button>
                            <a
                              href={examUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-secondary-400 hover:text-secondary-600"
                              title="Open exam URL"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>

                          {/* Status and Actions */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-xs text-secondary-500">
                              <span className={`px-2 py-1 rounded-full ${
                                code.used ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {code.used ? 'Used' : 'Available'}
                              </span>
                              {code.expires_at && (
                                <span>
                                  Expires: {new Date(code.expires_at).toLocaleDateString()}
                                </span>
                              )}
                              <span>
                                Created: {new Date(code.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteCode(code.id)}
                              className="text-red-600 hover:text-red-700 p-1"
                              title="Delete code"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-secondary-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-secondary-300" />
                  <p>No codes generated yet</p>
                  <p className="text-sm">Generate codes to allow students to access this exam</p>
                </div>
              )}
            </div>
          </div>

          {/* Information Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Notice */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Email Delivery</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Exam codes and direct URLs are automatically sent to users via email. 
                    Each email contains the access code and a unique direct link to the exam.
                  </p>
                </div>
              </div>
            </div>

            {/* URL Information */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <LinkIcon className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-green-900">Direct Access URLs</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Each code has a unique URL that automatically fills in the access code. 
                    Users can click the link to go directly to their exam.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}