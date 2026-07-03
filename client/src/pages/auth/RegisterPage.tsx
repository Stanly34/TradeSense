import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' })
      return
    }
    setIsLoading(true)
    try {
      await register(form)
      toast.success('Account created! Please check your email to verify.')
      navigate('/choose-plan')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response: { data: { error: { message: string } } } }).response?.data?.error?.message
          : 'Registration failed'
      toast.error(message)
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
          required
        />
        <Input
          id="username"
          label="Username"
          placeholder="johndoe"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          error={errors.username}
          required
        />
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          required
        />
        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="Min. 8 chars, uppercase, lowercase, number, special"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          required
        />
        <Input
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          error={errors.confirmPassword}
          required
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
