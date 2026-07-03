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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch {
      toast.error('Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="If that email is registered, we've sent a reset link.">
        <div className="text-center">
          <p className="text-sm text-text-muted mb-4">
            Didn't receive the email? Check your spam folder or try again.
          </p>
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
          onChange={(e) => setEmail(e.target.value)}
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
