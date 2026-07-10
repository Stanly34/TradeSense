import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { verifyOtpAndLogin } from '../../services/auth'
import { useAuth } from '../../hooks/useAuth'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'

export function OtpVerificationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const email = searchParams.get('email') || ''

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((p) => p - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  function handleDigit(index: number, value: string) {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    setError('')
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = Array(6).fill('')
    for (let i = 0; i < text.length; i++) next[i] = text[i]
    setDigits(next)
    setError('')
    const focusIdx = Math.min(text.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const otp = digits.join('')
    if (otp.length !== 6) { setError('Enter the full 6-digit code'); return }
    if (!email) { toast.error('No email found. Please register again.'); navigate('/register'); return }
    setIsLoading(true)
    try {
      await verifyOtpAndLogin(email, otp)
      await refreshUser()
      navigate('/dashboard')
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { error: { message: string } } } }).response?.data?.error?.message
        : 'Verification failed'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setCooldown(30)
    setError('')
    setDigits(Array(6).fill(''))
    try {
      const api = (await import('../../services/api')).default
      await api.post('/auth/resend-otp', { email })
      toast.success('Code resent')
    } catch {
      toast.error('Failed to resend code')
    }
  }

  if (!email) {
    return (
      <AuthLayout title="Invalid link" subtitle="No email address provided.">
        <Link to="/register" className="text-primary-light hover:text-primary font-medium text-sm">
          Back to registration
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Verify your email" subtitle={`Enter the 6-digit code sent to ${email}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input key={i} ref={(el) => { inputRefs.current[i] = el }}
              type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-11 h-12 text-center text-lg font-semibold rounded-xl border bg-input text-text-primary transition-all focus:outline-none focus:shadow-[0_0_0_2px_rgba(124,58,237,0.12)] ${
                error ? 'border-danger focus:border-danger' : 'border-border focus:border-primary'
              }`} />
          ))}
        </div>

        {error && <p className="text-xs text-danger text-center">{error}</p>}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Verify OTP
        </Button>

        <p className="text-center text-sm text-text-muted">
          Didn't receive the code?{' '}
          <button type="button" onClick={handleResend} disabled={cooldown > 0}
            className="text-primary-light hover:text-primary font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </p>
      </form>
    </AuthLayout>
  )
}
