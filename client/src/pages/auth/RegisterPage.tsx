import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import * as authService from '../../services/auth'
import toast from 'react-hot-toast'

export function RegisterPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const usernameTimer = useRef<ReturnType<typeof setTimeout>>()
  const emailTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current)
    if (!form.username.trim()) { setErrors((p) => { const { username: _, ...rest } = p; return rest }); return }
    usernameTimer.current = setTimeout(async () => {
      try {
        const { available } = await authService.checkAvailability('username', form.username)
        setErrors((p) => available ? { ...p, username: '' } : { ...p, username: 'Username already exists' })
      } catch { setErrors((p) => { const { username: _, ...rest } = p; return rest }) }
    }, 400)
    return () => { if (usernameTimer.current) clearTimeout(usernameTimer.current) }
  }, [form.username])

  useEffect(() => {
    if (emailTimer.current) clearTimeout(emailTimer.current)
    if (!form.email.trim()) { setErrors((p) => { const { email: _, ...rest } = p; return rest }); return }
    emailTimer.current = setTimeout(async () => {
      try {
        const { available } = await authService.checkAvailability('email', form.email)
        setErrors((p) => available ? { ...p, email: '' } : { ...p, email: 'Email already registered' })
      } catch { setErrors((p) => { const { email: _, ...rest } = p; return rest }) }
    }, 400)
    return () => { if (emailTimer.current) clearTimeout(emailTimer.current) }
  }, [form.email])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    const newErrors: Record<string, string> = {}
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!form.username.trim()) newErrors.username = 'Username is required'
    if (!form.email.trim()) newErrors.email = 'Email is required'
    if (!form.password) newErrors.password = 'Password is required'
    if (!form.confirmPassword) newErrors.confirmPassword = 'Confirm your password'
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }
    setIsLoading(true)
    try {
      await authService.sendOtp(form)
      navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string; details?: Array<{ field: string; message: string }> } } } }
      const details = axiosErr.response?.data?.error?.details
      if (details && details.length > 0) {
        const fieldErrors: Record<string, string> = {}
        for (const d of details) {
          if (d.field === 'password') fieldErrors.password = 'Must have uppercase, lowercase, number, and special character'
          else if (d.field) fieldErrors[d.field] = d.message
        }
        setErrors(fieldErrors)
        toast.error(details.map((d) => d.message).join('. '))
      } else {
        toast.error(axiosErr.response?.data?.error?.message || 'Registration failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start your trading journal journey">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="fullName"
          label="Full Name"
          placeholder="John Doe"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          error={errors.fullName}
        />
        <Input
          id="username"
          label="Username"
          placeholder="johndoe"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          error={errors.username}
        />
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
        />
        <Input
          id="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Min. 8 chars, uppercase, lowercase, number, special"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          endAdornment={
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="text-text-muted hover:text-text-primary transition-colors p-0.5" tabIndex={-1}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        <Input
          id="confirmPassword"
          label="Confirm Password"
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
        />
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-light hover:text-primary font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
