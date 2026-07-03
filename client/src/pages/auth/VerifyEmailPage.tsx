import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { verifyEmail, logout } from '../../services/auth'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  async function handleLogout() {
    setLoggingOut(true)
    try { await logout() } catch {}
    navigate('/login')
  }

  return (
    <AuthLayout
      title={
        status === 'loading' ? 'Verifying...' :
        status === 'success' ? 'Email verified!' :
        'Verification failed'
      }
      subtitle={
        status === 'loading' ? 'Please wait...' :
        status === 'success' ? 'Your email has been verified successfully.' :
        'This link is invalid or has expired.'
      }
    >
      {status === 'loading' && (
        <div className="flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      {status === 'success' && (
        <Link to="/login">
          <Button className="w-full">Sign in to your account</Button>
        </Link>
      )}
      {status === 'error' && (
        <div className="space-y-3">
          <Link to="/login" className="text-primary-light hover:text-primary font-medium text-sm block text-center">
            Back to login
          </Link>
          <Button type="button" variant="secondary" className="w-full" isLoading={loggingOut} onClick={handleLogout}>
            Logout
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}
