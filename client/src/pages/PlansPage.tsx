import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, X, Sparkles, RotateCcw, CircleCheck, Zap, Trophy, Image, FileText, Tags, CalendarCheck, Brain } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { usePlan } from '../hooks/usePlan'
import * as subscriptionService from '../services/subscriptions'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

interface Feature {
  label: string
  icon: typeof Check
  basic: string | boolean
  pro: string | boolean
  usageKey?: 'tradesToday' | 'tradesThisMonth' | 'accountsUsed' | 'checklistsUsed'
  limitKey?: 'dailyTradeLimit' | 'monthlyTradeLimit' | 'accountLimit' | 'checklistLimit'
}

const ALL_FEATURES: Feature[] = [
  { label: 'Daily Journals', icon: FileText, basic: '2 / day', pro: 'Unlimited', usageKey: 'tradesToday', limitKey: 'dailyTradeLimit' },
  { label: 'Monthly Trades', icon: Trophy, basic: '10 / month', pro: 'Unlimited', usageKey: 'tradesThisMonth', limitKey: 'monthlyTradeLimit' },
  { label: 'Trading Accounts', icon: Zap, basic: '2 max', pro: 'Unlimited', usageKey: 'accountsUsed', limitKey: 'accountLimit' },
  { label: 'Images per Trade', icon: Image, basic: '1 max', pro: 'Unlimited' },
  { label: 'Checklists with Items', icon: Tags, basic: '1 max', pro: 'Unlimited', usageKey: 'checklistsUsed', limitKey: 'checklistLimit' },
  { label: 'Weekly Outlook', icon: CalendarCheck, basic: false, pro: true },
  { label: 'AI Analysis', icon: Brain, basic: false, pro: true },
]

export function PlansPage() {
  const { refreshUser } = useAuth()
  const { isPro, isExpired } = usePlan()
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
  const currentPlan = planData?.plan
  const isCurrentBasic = !isPro || isExpired
  const isProActive = isPro && !isExpired

  function getUsageValue(feature: Feature): { used: number; limit: number } | null {
    if (!feature.usageKey) return null
    const used = usage?.[feature.usageKey] ?? 0
    const planLimits: Record<string, number | null> = {
      dailyTradeLimit: currentPlan?.dailyTradeLimit ?? null,
      monthlyTradeLimit: currentPlan?.monthlyTradeLimit ?? null,
      accountLimit: currentPlan?.accountLimit ?? null,
      checklistLimit: currentPlan?.checklistLimit ?? null,
    }
    const limit = feature.limitKey ? (planLimits[feature.limitKey] ?? 0) : 0
    if (!limit) return null
    return { used, limit }
  }

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary">Choose Your Plan</h1>
        <p className="text-text-secondary mt-2 max-w-lg mx-auto">
          Everything you need to level up your trading journal. Start free and upgrade as you grow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* BASIC */}
        <div className={`bg-elevated rounded-2xl border-2 p-8 relative transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex flex-col ${
          isCurrentBasic && !isExpired ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'
        }`}>
          {isCurrentBasic && !isExpired && (
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-text-inverse text-xs font-bold px-4 py-1 rounded-full">
              Current Plan
            </div>
          )}

          <div className="mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <CircleCheck className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Basic</h2>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-text-primary">$0</span>
              <span className="text-text-muted text-sm">/month</span>
            </div>
            <p className="text-text-secondary text-sm mt-2">Perfect for getting started with trade journaling.</p>
          </div>

          <Button
            className="w-full mb-6"
            variant={isCurrentBasic && !isExpired ? 'secondary' : 'primary'}
            onClick={handleUpgrade}
            disabled={isCurrentBasic && !isExpired}
          >
            {isCurrentBasic && !isExpired ? 'Current Plan' : 'Get Started'}
          </Button>

          <div className="space-y-3 flex-1">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">What's included</p>
            {ALL_FEATURES.map((f) => {
              const usageVal = getUsageValue(f)
              const showBar = usageVal && isCurrentBasic && !isExpired
              const pct = showBar ? Math.min(100, (usageVal!.used / usageVal!.limit) * 100) : 0

              return (
                <div key={f.label} className="flex items-center gap-3 text-sm">
                  {typeof f.basic === 'boolean' ? (
                    f.basic ? <Check className="w-4 h-4 text-success shrink-0" /> : <X className="w-4 h-4 text-danger shrink-0" />
                  ) : (
                    <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                      <Check className="w-4 h-4 text-success" />
                    </div>
                  )}
                  <span className="text-text-secondary">{f.label}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {typeof f.basic === 'string' ? (
                      <span className="text-text-muted text-xs">{f.basic}</span>
                    ) : null}
                    {showBar && (
                      <div className="w-16 h-1.5 bg-card rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-danger' : 'bg-primary'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    {usageVal && (
                      <span className="text-text-muted text-xs tabular-nums">
                        {usageVal.used}/{usageVal.limit}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* PRO */}
        <div className={`bg-elevated rounded-2xl border-2 p-8 relative transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex flex-col ${
          isProActive ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'
        }`}>
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary-dark text-text-inverse text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            {isProActive ? 'Current Plan' : 'Recommended'}
          </div>

          <div className="mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Pro</h2>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-text-primary">$20</span>
              <span className="text-text-muted text-sm">/month</span>
            </div>
            <p className="text-text-secondary text-sm mt-2">Unlock everything. Unlimited journals, AI, and more.</p>
          </div>

          {isProActive && (
            <div className="bg-card rounded-xl p-4 mb-6 space-y-2 border border-border/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Status</span>
                <span className="flex items-center gap-1.5 text-success font-medium">
                  <span className="w-1.5 h-1.5 bg-success rounded-full" />
                  Active
                </span>
              </div>
              {planData?.endDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Renewal</span>
                  <span className="text-text-primary">{formatExpiry(planData.endDate)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Auto-renew</span>
                <span className="text-text-primary font-medium">{planData?.autoRenew ? 'On' : 'Off'}</span>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="bg-danger/10 rounded-xl p-4 mb-6 space-y-2 border border-danger/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Status</span>
                <span className="text-danger font-medium">Expired</span>
              </div>
              {planData?.endDate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Expired on</span>
                  <span className="text-text-primary">{formatExpiry(planData.endDate)}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 flex-1 mb-6">
            {!isProActive && (
              <Button className="w-full" onClick={isExpired ? handleResubscribe : handleUpgrade} isLoading={actionLoading !== null}>
                <Sparkles className="w-4 h-4 mr-2" />
                {isExpired ? 'Resubscribe' : 'Upgrade to Pro'}
              </Button>
            )}
            {isProActive && planData?.autoRenew && (
              <Button className="w-full" variant="secondary" onClick={handleCancelAutoRenew} isLoading={actionLoading === 'cancel'}>
                Cancel auto-renew
              </Button>
            )}
            {isProActive && !planData?.autoRenew && (
              <Button className="w-full" onClick={handleReactivate} isLoading={actionLoading === 'reactivate'}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Re-enable auto-renew
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Everything in Basic, plus</p>
            {ALL_FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3 text-sm">
                {typeof f.pro === 'boolean' ? (
                  f.pro ? <Check className="w-4 h-4 text-success shrink-0" /> : <X className="w-4 h-4 text-danger shrink-0" />
                ) : (
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-success" />
                  </div>
                )}
                <span className="text-text-secondary">{f.label}</span>
                <span className="ml-auto text-text-muted text-xs">
                  {typeof f.pro === 'string' ? f.pro : f.pro ? 'Included' : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isProActive && !isExpired && usage && currentPlan && (
        <div className="bg-elevated rounded-2xl border border-border p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Usage Overview
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Trades Today', used: usage.tradesToday, limit: currentPlan.dailyTradeLimit, color: 'bg-primary' },
              { label: 'Monthly Trades', used: usage.tradesThisMonth, limit: currentPlan.monthlyTradeLimit, color: 'bg-success' },
              { label: 'Accounts', used: usage.accountsUsed, limit: currentPlan.accountLimit, color: 'bg-warning' },
              { label: 'Checklists', used: usage.checklistsUsed, limit: currentPlan.checklistLimit, color: 'bg-info' },
            ].map((item) => {
              const max = item.limit ?? 100
              const pct = Math.min(100, (item.used / max) * 100)
              return (
                <div key={item.label} className="bg-card rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-text-muted">{item.label}</p>
                  <p className="text-lg font-bold text-text-primary mt-1">
                    {item.used}
                    {item.limit !== null && <span className="text-sm text-text-muted font-normal"> / {item.limit}</span>}
                  </p>
                  {item.limit !== null && (
                    <div className="mt-2 h-1.5 bg-hover rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 100 ? 'bg-danger' : item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
