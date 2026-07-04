import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Sparkles, Check } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import * as subscriptionService from '../services/subscriptions'
import toast from 'react-hot-toast'

export function ChoosePlanPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  async function handleSelect(planName: string) {
    setIsLoading(planName)
    try {
      await subscriptionService.selectPlan(planName)
      await refreshUser()
      toast.success(`Started with ${planName} plan`)
      navigate('/dashboard')
    } catch (err) {
      toast.error('Failed to select plan')
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Choose your plan</h1>
          <p className="text-sm text-text-muted mt-2">Start with Basic or go Pro — you can change anytime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BASIC */}
          <div className="card p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-hover flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-6 h-6 text-text-muted" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">BASIC</h2>
            <p className="text-3xl font-bold text-text-primary mt-2">$0<span className="text-base font-normal text-text-muted">/mo</span></p>
            <ul className="mt-6 space-y-3 text-left">
              {[
                'Up to 2 accounts',
                '10 journaled trades / month',
                '1 image per trade',
                '1 checklist with items',
                'Basic journaling features',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full mt-6" onClick={() => handleSelect('BASIC')} isLoading={isLoading === 'BASIC'}>
              Start with Basic
            </Button>
          </div>

          {/* PRO */}
          <div className="card p-6 text-center ring-2 ring-primary relative">
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Recommended
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-text-primary">PRO</h2>
            <p className="text-3xl font-bold text-text-primary mt-2">$20<span className="text-base font-normal text-text-muted">/mo</span></p>
            <ul className="mt-6 space-y-3 text-left">
              {[
                'Unlimited accounts',
                'Unlimited trades',
                'Unlimited images per trade',
                'Unlimited checklists',
                'Weekly Outlook access',
                'AI-powered features',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full mt-6" onClick={() => toast.error('Payment system not available yet.')}>
              <Sparkles className="w-4 h-4 mr-2" />
              Go Pro
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
