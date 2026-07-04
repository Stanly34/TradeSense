import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { resetPassword } from '../../services/auth'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' })
      return
    }
    if (!token) {
      toast.error('Invalid reset link')
      return
    }
    setIsLoading(true)
    try {
      await resetPassword(token, form.password, form.confirmPassword)
      setResetSuccess(true)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { error: { message: string } } } }).response?.data?.error?.message
          : 'Password reset failed'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (resetSuccess) {
    return (
      <AuthLayout title="Password changed">
        <div className="flex flex-col items-center text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <p className="text-text-muted text-sm">Your password has been changed successfully.</p>
        </div>
      </AuthLayout>
    )
  }

  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="This password reset link is invalid or expired.">
        <Link to="/forgot-password" className="text-primary-light hover:text-primary font-medium text-sm">
          Request a new reset link
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Set new password" subtitle="Enter your new password below">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="password"
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Min. 8 characters"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          endAdornment={
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="text-text-muted hover:text-text-primary transition-colors p-0.5" tabIndex={-1}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          required
        />
        <Input
          id="confirmPassword"
          label="Confirm New Password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          error={errors.confirmPassword}
          endAdornment={
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-text-muted hover:text-text-primary transition-colors p-0.5" tabIndex={-1}>
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          required
        />
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Reset password
        </Button>
      </form>
    </AuthLayout>
  )
}
