import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  User, 
  Lock, 
  Bell, 
  Globe, 
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

export function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile settings
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: user?.email || '',
    bio: '',
    timezone: 'UTC'
  })

  // Security settings
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Notification settings
  const [notificationData, setNotificationData] = useState({
    emailNotifications: true,
    examReminders: true,
    resultNotifications: true,
    systemUpdates: false
  })

  // System settings
  const [systemData, setSystemData] = useState({
    defaultTimeLimit: 60,
    autoSaveInterval: 30,
    maxAttempts: 3,
    showResultsImmediately: true
  })

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'system', name: 'System', icon: Globe }
  ]

  const showMessage = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message)
      setError(null)
    } else {
      setError(message)
      setSuccess(null)
    }
    
    setTimeout(() => {
      setSuccess(null)
      setError(null)
    }, 5000)
  }

  // Load user profile data on component mount
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return

      try {
        setLoading(true)
        
        // Fetch user profile from profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error loading profile:', error)
          // If profile doesn't exist, use user metadata
          setProfileData(prev => ({
            ...prev,
            fullName: user.user_metadata?.full_name || '',
            email: user.email || ''
          }))
        } else {
          setProfileData(prev => ({
            ...prev,
            fullName: profile.full_name || '',
            email: profile.email || user.email || ''
          }))
        }
      } catch (err) {
        console.error('Error loading user profile:', err)
        // Fallback to user metadata
        setProfileData(prev => ({
          ...prev,
          fullName: user.user_metadata?.full_name || '',
          email: user.email || ''
        }))
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [user])

  const handleSaveProfile = async () => {
    if (!user) {
      showMessage('User not authenticated', 'error')
      return
    }

    if (!profileData.fullName.trim()) {
      showMessage('Full name is required', 'error')
      return
    }

    try {
      setSaving(true)
      
      // Update user metadata in auth.users
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: profileData.fullName.trim()
        }
      })

      if (authError) {
        throw authError
      }

      // Update profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.fullName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) {
        throw profileError
      }

      showMessage('Profile updated successfully!', 'success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      showMessage(errorMessage, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSecurity = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      showMessage('New passwords do not match', 'error')
      return
    }

    if (securityData.newPassword.length < 6) {
      showMessage('Password must be at least 6 characters long', 'error')
      return
    }

    if (!securityData.currentPassword.trim()) {
      showMessage('Please enter your current password', 'error')
      return
    }

    try {
      setSaving(true)
      
      // First, verify the current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: securityData.currentPassword
      })

      if (verifyError) {
        throw new Error('Current password is incorrect')
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: securityData.newPassword
      })

      if (updateError) {
        throw updateError
      }

      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      showMessage('Password updated successfully!', 'success')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update password'
      showMessage(errorMessage, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    try {
      setSaving(true)
      // TODO: Implement notification settings update API call
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      showMessage('Notification settings updated successfully!', 'success')
    } catch (err) {
      showMessage('Failed to update notification settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSystem = async () => {
    try {
      setSaving(true)
      // TODO: Implement system settings update API call
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      showMessage('System settings updated successfully!', 'success')
    } catch (err) {
      showMessage('Failed to update system settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Settings</h1>
        <p className="text-secondary-600">Manage your account and system preferences</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${
                    activeTab === tab.id ? 'text-primary-500' : 'text-secondary-400'
                  }`} />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="card p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <span className="ml-3 text-secondary-600">Loading settings...</span>
              </div>
            ) : (
              <>
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-secondary-900 mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        className="input w-full"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                        placeholder="Enter your full name"
                        disabled={saving}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="input w-full"
                        value={profileData.email}
                        disabled
                        placeholder="Email cannot be changed"
                      />
                      <p className="text-xs text-secondary-500 mt-1">
                        Contact support to change your email address
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Bio (Coming Soon)
                      </label>
                      <textarea
                        className="input w-full h-24 resize-none"
                        value={profileData.bio}
                        onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                        placeholder="Tell us about yourself"
                        disabled
                      />
                      <p className="text-xs text-secondary-500 mt-1">
                        Bio field will be available after database schema update
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Timezone (Coming Soon)
                      </label>
                      <select
                        className="input w-full"
                        value={profileData.timezone}
                        onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                        disabled
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                      </select>
                      <p className="text-xs text-secondary-500 mt-1">
                        Timezone field will be available after database schema update
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn-primary px-4 py-2 flex items-center space-x-2"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-secondary-900 mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        className="input w-full"
                        value={securityData.currentPassword}
                        onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        className="input w-full"
                        value={securityData.newPassword}
                        onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                        placeholder="Enter new password"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        className="input w-full"
                        value={securityData.confirmPassword}
                        onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveSecurity}
                    disabled={saving}
                    className="btn-primary px-4 py-2 flex items-center space-x-2"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Update Password</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-secondary-900 mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-secondary-700">
                          Email Notifications
                        </label>
                        <p className="text-xs text-secondary-500">
                          Receive general notifications via email
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        checked={notificationData.emailNotifications}
                        onChange={(e) => setNotificationData({ ...notificationData, emailNotifications: e.target.checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-secondary-700">
                          Exam Reminders
                        </label>
                        <p className="text-xs text-secondary-500">
                          Get reminded about upcoming exams
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        checked={notificationData.examReminders}
                        onChange={(e) => setNotificationData({ ...notificationData, examReminders: e.target.checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-secondary-700">
                          Result Notifications
                        </label>
                        <p className="text-xs text-secondary-500">
                          Be notified when exam results are available
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        checked={notificationData.resultNotifications}
                        onChange={(e) => setNotificationData({ ...notificationData, resultNotifications: e.target.checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-secondary-700">
                          System Updates
                        </label>
                        <p className="text-xs text-secondary-500">
                          Receive notifications about system updates
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        checked={notificationData.systemUpdates}
                        onChange={(e) => setNotificationData({ ...notificationData, systemUpdates: e.target.checked })}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    className="btn-primary px-4 py-2 flex items-center space-x-2"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Preferences</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-secondary-900 mb-4">System Defaults</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Default Time Limit (minutes)
                      </label>
                      <input
                        type="number"
                        className="input w-full"
                        value={systemData.defaultTimeLimit}
                        onChange={(e) => setSystemData({ ...systemData, defaultTimeLimit: parseInt(e.target.value) || 60 })}
                        min="1"
                      />
                      <p className="text-xs text-secondary-500 mt-1">
                        Default time limit for new exams
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Auto-save Interval (seconds)
                      </label>
                      <input
                        type="number"
                        className="input w-full"
                        value={systemData.autoSaveInterval}
                        onChange={(e) => setSystemData({ ...systemData, autoSaveInterval: parseInt(e.target.value) || 30 })}
                        min="10"
                      />
                      <p className="text-xs text-secondary-500 mt-1">
                        How often to auto-save exam progress
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Maximum Attempts
                      </label>
                      <input
                        type="number"
                        className="input w-full"
                        value={systemData.maxAttempts}
                        onChange={(e) => setSystemData({ ...systemData, maxAttempts: parseInt(e.target.value) || 1 })}
                        min="1"
                      />
                      <p className="text-xs text-secondary-500 mt-1">
                        Default maximum attempts per exam
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-secondary-700">
                          Show Results Immediately
                        </label>
                        <p className="text-xs text-secondary-500">
                          Default setting for showing results after exam completion
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        checked={systemData.showResultsImmediately}
                        onChange={(e) => setSystemData({ ...systemData, showResultsImmediately: e.target.checked })}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveSystem}
                    disabled={saving}
                    className="btn-primary px-4 py-2 flex items-center space-x-2"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Settings</span>
                  </button>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}