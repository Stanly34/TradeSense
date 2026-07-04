import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../services/auth'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { error: { message: string } } } }).response?.data?.error?.message
        : 'Failed to send reset email'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Reset link sent" subtitle="We've sent a password reset link to your email.">
        <div className="text-center">

          <Link to="/login" className="text-primary-light hover:text-primary font-medium text-sm">
            Back to login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a reset link">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError('') }}
          error={error}
          required
        />
        <Button type="submit" className="w-full" isLoading={isLoading}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-muted">
        Remember your password?{' '}
        <Link to="/login" className="text-primary-light hover:text-primary font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
