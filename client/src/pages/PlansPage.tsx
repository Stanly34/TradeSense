import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard, Check, X, Sparkles, ArrowRight, RotateCcw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import * as subscriptionService from '../services/subscriptions'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export function PlansPage() {
  const { refreshUser } = useAuth()
  const { isPro, isExpired, plan: currentPlan } = usePlan()
  const [searchParams] = useSearchParams()
  const [planData, setPlanData] = useState<subscriptionService.UserPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('upgrade') === 'success') {
      toast.success('Welcome to Pro!')
      refreshUser()
    }
  }, [searchParams, refreshUser])

  useEffect(() => {
    subscriptionService.getPlan()
      .then(setPlanData)
      .catch(() => toast.error('Failed to load plan info'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleUpgrade() {
    toast.error('Payment system not available yet.')
  }

  async function handleCancelAutoRenew() {
    setActionLoading('cancel')
    try {
      await subscriptionService.cancelAutoRenew()
      toast.success('Auto-renew cancelled')
      const updated = await subscriptionService.getPlan()
      setPlanData(updated)
    } catch {
      toast.error('Failed to cancel auto-renew')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReactivate() {
    setActionLoading('reactivate')
    try {
      await subscriptionService.reactivateAutoRenew()
      toast.success('Auto-renew reactivated')
      const updated = await subscriptionService.getPlan()
      setPlanData(updated)
    } catch {
      toast.error('Failed to reactivate auto-renew')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleResubscribe() {
    toast.error('Payment system not available yet.')
  }

  function formatExpiry(dateStr: string | null | undefined) {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  const usage = planData?.usage
  const isCurrentBasic = !isPro || isExpired

  const basicFeatures = [
    { label: 'Daily Journals', basic: '2 / day', pro: 'Unlimited', limit: 2, used: usage?.tradesToday ?? 0 },
    { label: 'Journaled Trades', basic: '10 / month', pro: 'Unlimited', limit: 10, used: usage?.tradesThisMonth ?? 0 },
    { label: 'Accounts', basic: '2 max', pro: 'Unlimited', limit: 2, used: usage?.accountsUsed ?? 0 },
    { label: 'Images per Trade', basic: '1 max', pro: 'Unlimited', limit: 1, used: undefined },
    { label: 'Checklists with Items', basic: '1 max', pro: 'Unlimited', limit: 1, used: usage?.checklistsUsed ?? 0 },
    { label: 'Weekly Outlook', basic: '—', pro: 'Included' },
    { label: 'AI Features', basic: '—', pro: 'Included' },
  ]

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Plans</h1>
        <p className="text-sm text-text-muted mt-1">Manage your subscription and plan limits.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* BASIC Card */}
        <div className={`card p-6 relative ${isCurrentBasic ? 'ring-2 ring-primary' : ''}`}>
          {isCurrentBasic && (
            <div className="absolute -top-2.5 left-4 bg-primary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Current Plan
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-text-primary">BASIC</h2>
              <p className="text-2xl font-bold text-text-primary mt-1">$0<span className="text-sm font-normal text-text-muted"> / month</span></p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-hover flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-text-muted" />
            </div>
          </div>

          <div className="space-y-3 mt-6">
            {basicFeatures.map((f) => (
              <div key={f.label} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{f.label}</span>
                {f.label === 'Weekly Outlook' || f.label === 'AI Features' ? (
                  <X className="w-4 h-4 text-danger" />
                ) : (
                  <div className="flex items-center gap-2">
                    {f.used !== undefined && isCurrentBasic && (
                      <div className="w-20 h-1.5 bg-hover rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${f.used >= f.limit! ? 'bg-danger' : 'bg-primary'}`}
                          style={{ width: `${Math.min(100, (f.used / f.limit!) * 100)}%` }}
                        />
                      </div>
                    )}
                    <span className="text-text-muted text-xs">
                      {f.used !== undefined && isCurrentBasic ? `${f.used}/${f.limit}` : f.basic}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* PRO Card */}
        <div className={`card p-6 relative ${isPro && !isExpired ? 'ring-2 ring-primary' : ''}`}>
          {isPro && !isExpired && (
            <div className="absolute -top-2.5 left-4 bg-primary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Current Plan
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-text-primary">PRO</h2>
              <p className="text-2xl font-bold text-text-primary mt-1">$20<span className="text-sm font-normal text-text-muted"> / month</span></p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
          </div>

          {isPro && !isExpired && (
            <div className="bg-hover rounded-xl px-4 py-2.5 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Status</span>
                <span className="text-success font-medium">Active</span>
              </div>
              {planData?.endDate && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-text-secondary">Renewal</span>
                  <span className="text-text-primary">{formatExpiry(planData.endDate)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-text-secondary">Auto-renew</span>
                <span className="text-text-primary">{planData?.autoRenew ? 'On' : 'Off'}</span>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="bg-danger/10 rounded-xl px-4 py-2.5 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Status</span>
                <span className="text-danger font-medium">Expired</span>
              </div>
              {planData?.endDate && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-text-secondary">Expired on</span>
                  <span className="text-text-primary">{formatExpiry(planData.endDate)}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 mt-4">
            {basicFeatures.map((f) => (
              <div key={f.label} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{f.label}</span>
                {f.pro === 'Included' ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <span className="text-text-muted text-xs">{f.pro}</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            {isCurrentBasic && !isExpired && (
              <Button className="w-full" onClick={handleUpgrade} isLoading={actionLoading === 'upgrade'}>
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade to Pro — $20/mo
              </Button>
            )}
            {isPro && !isExpired && planData?.autoRenew && (
              <Button className="w-full" variant="secondary" onClick={handleCancelAutoRenew} isLoading={actionLoading === 'cancel'}>
                Cancel auto-renew
              </Button>
            )}
            {isPro && !isExpired && !planData?.autoRenew && (
              <Button className="w-full" onClick={handleReactivate} isLoading={actionLoading === 'reactivate'}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Re-enable auto-renew
              </Button>
            )}
            {isExpired && (
              <Button className="w-full" onClick={handleResubscribe} isLoading={actionLoading === 'resubscribe'}>
                <Sparkles className="w-4 h-4 mr-2" />
                Re-subscribe — $20/mo
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
