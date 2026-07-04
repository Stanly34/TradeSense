import { useState, useEffect, useRef } from 'react'
import { User, Bell, Shield, Save, Camera, Mail, Key, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import * as authService from '../services/auth'
import api from '../services/api'
import toast from 'react-hot-toast'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
]

export function SettingsPage() {
  const { user, updateUser } = useAuth()
  const { planName, isPro, isExpired } = usePlan()
  const [activeTab, setActiveTab] = useState('profile')
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [isSaving, setIsSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setUsername(user.username || '')
      setEmail(user.email || '')
    }
  }, [user])

  async function handleProfileSave() {
    setIsSaving(true)
    try {
      const { data } = await api.patch('/auth/profile', { fullName, username })
      if (data.data) updateUser(data.data as never)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setIsSaving(true)
    try {
      await authService.changePassword(currentPassword, newPassword, confirmPassword)
      toast.success('Password changed')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Failed to change password')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your account and preferences.</p>
      </div>

      <div className="flex gap-1 card p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-text-inverse'
                  : 'text-text-secondary hover:text-text-primary hover:bg-hover'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'profile' && (
        <div className="card p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-text-inverse text-2xl font-bold shadow-lg shadow-primary/30 overflow-hidden">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploadingAvatar(true)
                try {
                  const result = await authService.uploadAvatar(file)
                  updateUser(result as never)
                  toast.success('Avatar updated')
                } catch {
                  toast.error('Failed to upload avatar')
                } finally {
                  setUploadingAvatar(false)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }
              }} />
              <button disabled={uploadingAvatar} onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full text-text-inverse shadow-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-text-primary">{user?.fullName || user?.username}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPro && !isExpired ? 'bg-primary/15 text-primary-light' : 'bg-glass text-text-muted'}`}>
                  {isPro && !isExpired ? 'PRO' : 'BASIC'}
                </span>
              </div>
              <p className="text-sm text-text-muted flex items-center gap-1 mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.2)] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={user?.role !== 'ADMIN'}
                className={`w-full px-3 py-2 text-sm bg-input border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.2)] transition-all ${
                  user?.role !== 'ADMIN' ? 'text-text-muted cursor-not-allowed' : 'text-text-primary'
                }`}
              />
              {user?.role !== 'ADMIN' && <p className="text-xs text-text-muted mt-1">Username cannot be changed</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Email</label>
              <input
                value={email}
                disabled
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-text-muted cursor-not-allowed"
              />
              <p className="text-xs text-text-muted mt-1">Email cannot be changed</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleProfileSave} isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Notification Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div>
                <p className="text-sm font-medium text-text-primary">Email Notifications</p>
                <p className="text-xs text-text-muted">Receive trade summaries via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-9 h-5 bg-hover rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div>
                <p className="text-sm font-medium text-text-primary">Weekly Reports</p>
                <p className="text-xs text-text-muted">Get a weekly summary of your performance</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-9 h-5 bg-hover rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Trade Reminders</p>
                <p className="text-xs text-text-muted">Reminders to log your trades daily</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-9 h-5 bg-hover rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="card p-6 space-y-6">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Key className="w-5 h-5 text-primary-light" />
            Change Password
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.2)] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.2)] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.2)] transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handlePasswordChange} isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
              Update Password
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}