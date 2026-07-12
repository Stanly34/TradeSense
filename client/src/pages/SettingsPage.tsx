import { useState, useEffect, useRef, useCallback } from 'react'
import { User, Bell, Save, Camera, Mail, Loader2, Shield } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import * as authService from '../services/auth'
import * as notificationService from '../services/notifications'
import * as adminService from '../services/admin'
import api from '../services/api'
import toast from 'react-hot-toast'

function useTabs() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  return [
    { id: 'profile', label: 'Profile', icon: User },
    ...(isAdmin ? [] : [{ id: 'notifications', label: 'Notifications', icon: Bell }]),
    ...(isAdmin ? [{ id: 'platform', label: 'Platform', icon: Shield }] : []),
  ]
}

export function SettingsPage() {
  const { user, updateUser } = useAuth()
  const { isPro, isExpired } = usePlan()
  const tabs = useTabs()
  const [activeTab, setActiveTab] = useState('profile')
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preferences, setPreferences] = useState<notificationService.NotificationPreferences | null>(null)
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [savingPref, setSavingPref] = useState<string | null>(null)
  const [platformSettings, setPlatformSettings] = useState<adminService.AdminSetting[]>([])
  const [loadingPlatform, setLoadingPlatform] = useState(true)
  const [usernameError, setUsernameError] = useState('')
  const USERNAME_PATTERN = /^(?=.*[0-9_])[a-zA-Z0-9_]+$/

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '')
      setUsername(user.username || '')
      setEmail(user.email || '')
    }
  }, [user])

  useEffect(() => {
    notificationService.getPreferences().then(setPreferences).catch(() => {})
    .finally(() => setLoadingPrefs(false))
  }, [])

  useEffect(() => {
    if (!username.trim() || user?.role !== 'ADMIN') { setUsernameError(''); return }
    if (!USERNAME_PATTERN.test(username)) {
      setUsernameError('Must include at least one number or underscore')
    } else {
      setUsernameError('')
    }
  }, [username, user?.role])

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      adminService.listSettings().then(setPlatformSettings).catch(() => {})
      .finally(() => setLoadingPlatform(false))
    }
  }, [user?.role])

  const handleToggle = useCallback(async (key: 'emailNotifications' | 'weeklyReports' | 'tradeReminders') => {
    if (!preferences) return
    const newValue = !preferences[key]
    setPreferences((prev) => prev ? { ...prev, [key]: newValue } : prev)
    setSavingPref(key)
    try {
      const updated = await notificationService.updatePreferences({ [key]: newValue })
      setPreferences(updated)
    } catch {
      setPreferences((prev) => prev ? { ...prev, [key]: !newValue } : prev)
      toast.error('Failed to update preference')
    } finally {
      setSavingPref(null)
    }
  }, [preferences])

  async function handleProfileSave() {
    if (usernameError) { toast.error(usernameError); return }
    setIsSaving(true)
    try {
      const { data } = await api.patch('/auth/profile', { fullName, username })
      if (data.data) updateUser(data.data as never)
      toast.success('Profile updated')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { error: { message: string } } } }).response?.data?.error?.message
        : 'Failed to update profile'
      toast.error(msg)
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

      <div className={activeTab === 'profile' ? '' : 'hidden'}>
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
                className={`w-full px-3 py-2 text-sm bg-input border rounded-lg placeholder:text-text-muted focus:outline-none transition-all ${
                  user?.role !== 'ADMIN' ? 'text-text-muted cursor-not-allowed border-border' : usernameError ? 'text-text-primary border-danger' : 'text-text-primary border-border focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.2)]'
                }`}
              />
              {user?.role !== 'ADMIN' && <p className="text-xs text-text-muted mt-1">Username cannot be changed</p>}
              {usernameError && <p className="text-xs text-danger mt-1">{usernameError}</p>}
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
      </div>

      <div className={activeTab === 'platform' ? '' : 'hidden'}>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary-light" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Platform Settings</h2>
              <p className="text-sm text-text-muted">Manage global platform features</p>
            </div>
          </div>
          {loadingPlatform ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { key: 'allow_registration', label: 'Allow Registration', desc: 'Allow new users to sign up' },
                { key: 'maintenance_mode', label: 'Maintenance Mode', desc: 'Non-admin users see a maintenance page' },
                { key: 'email_enabled', label: 'Email Delivery', desc: 'Send emails (password reset, OTP, etc.)' },
                { key: 'free_plan_available', label: 'Free Plan Available', desc: 'Show and allow selection of the free plan' },
              ].map(({ key, label, desc }, i) => {
                const setting = platformSettings.find((s) => s.key === key)
                const value = setting?.value === 'true'
                return (
                  <div key={key} className={`flex items-center justify-between py-3 ${i < 3 ? 'border-b border-border/50' : ''}`}>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{label}</p>
                      <p className="text-xs text-text-muted">{desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={value}
                        onChange={async () => {
                          const newValue = value ? 'false' : 'true'
                          await adminService.updateSetting(key, newValue)
                          setPlatformSettings((prev) =>
                            prev.map((s) => s.key === key ? { ...s, value: newValue } : s)
                          )
                        }}
                      />
                      <div className="w-9 h-5 bg-hover rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                    </label>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className={activeTab === 'notifications' ? '' : 'hidden'}>
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Notification Preferences</h2>
          {loadingPrefs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {([
                { key: 'emailNotifications' as const, label: 'Email Notifications', desc: 'Receive trade summaries via email' },
                { key: 'weeklyReports' as const, label: 'Weekly Reports', desc: 'Get a weekly summary of your performance' },
                { key: 'tradeReminders' as const, label: 'Journal Reminders', desc: 'Reminders to journal your trades daily' },
              ] as const).map(({ key, label, desc }, i) => (
                <div key={key} className={`flex items-center justify-between py-3 ${i < 2 ? 'border-b border-border/50' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{label}</p>
                    <p className="text-xs text-text-muted">{desc}</p>
                  </div>
                  <div className="relative">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={preferences?.[key] ?? false}
                        onChange={() => handleToggle(key)}
                        disabled={savingPref !== null}
                      />
                      <div className="w-9 h-5 bg-hover rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                    </label>
                    {savingPref === key && (
                      <Loader2 className="w-3.5 h-3.5 text-text-muted animate-spin absolute -right-5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}