import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!form.email.trim()) newErrors.email = 'Email or username is required'
    if (!form.password) newErrors.password = 'Password is required'
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }

    setIsLoading(true)
    try {
      await login(form)
      navigate('/dashboard')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { error: { message: string } } } }).response?.data?.error?.message
          : 'Login failed'
      setErrors({ password: message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your TradeSense account">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="email"
          label="Email or Username"
          type="text"
          placeholder="email or username"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          startAdornment={<Mail className="w-4 h-4" />}
        />
        <Input
          id="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          startAdornment={<Lock className="w-4 h-4" />}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-text-muted hover:text-text-primary transition-colors p-0.5"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        <div className="flex items-center justify-end">
          <Link to="/forgot-password" className="text-xs text-primary-light hover:text-primary transition-colors">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow duration-300" isLoading={isLoading}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-muted">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary-light hover:text-primary font-medium transition-colors">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  )
}
