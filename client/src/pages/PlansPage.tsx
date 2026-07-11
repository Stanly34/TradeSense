import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, X, Sparkles, RotateCcw, Trophy, FileText, Image, Zap, Tags, Clock, CalendarCheck, Brain } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import * as subscriptionService from '../services/subscriptions'
import type { PublicPlan } from '../services/subscriptions'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

interface PlanField {
  key: keyof PublicPlan
  label: string
  icon: typeof FileText
  format: (v: number | null) => string
}

const PLAN_FIELDS: PlanField[] = [
  { key: 'journalLimit', label: 'Journals', icon: FileText, format: (v) => v === null ? 'Unlimited' : `${v}` },
  { key: 'imageLimit', label: 'Images', icon: Image, format: (v) => v === null ? 'Unlimited' : `${v} max` },
  { key: 'accountLimit', label: 'Accounts', icon: Zap, format: (v) => v === null ? 'Unlimited' : `${v} max` },
  { key: 'checklistLimit', label: 'Checklists', icon: Tags, format: (v) => v === null ? 'Unlimited' : `${v} max` },
  { key: 'monthlyTradeLimit', label: 'Monthly Trades', icon: Trophy, format: (v) => v === null ? 'Unlimited' : `${v} / month` },
  { key: 'dailyTradeLimit', label: 'Daily Trades', icon: Clock, format: (v) => v === null ? 'Unlimited' : `${v} / day` },
]

export function PlansPage() {
  const { refreshUser } = useAuth()
  const [searchParams] = useSearchParams()
  const [plans, setPlans] = useState<PublicPlan[]>([])
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
    Promise.all([
      subscriptionService.listPlans(),
      subscriptionService.getPlan(),
    ])
      .then(([p, pd]) => { setPlans(p); setPlanData(pd) })
      .catch(() => toast.error('Failed to load plan info'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleUpgrade(planName: string) {
    setActionLoading(planName)
    try {
      const result = await subscriptionService.createCheckout(planName)
      if (result.testMode || !result.url) {
        toast.error('Stripe not configured. Use dev upgrade instead.')
        return
      }
      window.location.href = result.url
    } catch {
      toast.error('Failed to start checkout')
    } finally {
      setActionLoading(null)
    }
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
    if (!currentPlanName) return
    await handleUpgrade(currentPlanName)
  }

  function formatExpiry(dateStr: string | null | undefined) {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  const usage = planData?.usage
  const currentPlan = planData?.plan
  const currentPlanName = currentPlan?.name ?? ''
  const subExpired = planData?.status === 'EXPIRED'
  const isCurrentPlan = (name: string) => name === currentPlanName && !subExpired
  const isProActive = !!currentPlan && currentPlan.price > 0 && !subExpired

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

      <div className="grid gap-6" style={{
        gridTemplateColumns: plans.length === 1 ? '1fr' : plans.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)'
      }}>
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.name)
          const isPaid = plan.price > 0
          return (
            <div key={plan.id} className={`bg-elevated rounded-2xl border-2 relative transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex flex-col overflow-hidden ${
              isCurrent ? 'border-primary' : 'border-border'
            }`}>
              {isCurrent && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-primary text-text-inverse text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Current Plan
                </div>
              )}
              {!isCurrent && isPaid && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-primary text-text-inverse text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Recommended
                </div>
              )}

              <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-text-primary">${plan.price}</span>
                      <span className="text-text-muted text-xs">/month</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </div>

              {isCurrent && isProActive && (
                <div className="mx-6 mt-2 bg-card rounded-xl p-4 space-y-2 border border-border/50">
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

                {subExpired && isCurrent && (
                <div className="mx-6 mt-2 bg-danger/10 rounded-xl p-4 space-y-2 border border-danger/20">
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

              <div className="px-6 pb-6 flex-1">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 mt-4">Limits</p>
                <div className="space-y-2.5">
                  {PLAN_FIELDS.map(({ key, label, icon: Icon, format }) => {
                    const val = plan[key] as number | null
                    return (
                      <div key={key} className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                        <span className="text-text-secondary">{label}</span>
                        <span className="ml-auto text-text-primary font-medium tabular-nums">
                          {val !== null ? format(val) : <span className="text-text-muted font-normal">Unlimited</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 space-y-2.5">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Features</p>
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center shrink-0">
                      <CalendarCheck className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                    <span className="text-text-secondary">Weekly Outlook</span>
                    <span className="ml-auto">{plan.weeklyOutlook ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-text-muted" />}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center shrink-0">
                      <Brain className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                    <span className="text-text-secondary">AI Analysis</span>
                    <span className="ml-auto">{plan.aiEnabled ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-text-muted" />}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-5 flex flex-col gap-2 border-t border-border/50 pt-4 mt-auto">
                {isCurrent && isPaid && !subExpired && (
                  <>
                    {planData?.autoRenew && (
                      <Button className="w-full" variant="secondary" onClick={handleCancelAutoRenew} isLoading={actionLoading === 'cancel'}>
                        Cancel auto-renew
                      </Button>
                    )}
                    {!planData?.autoRenew && (
                      <Button className="w-full" onClick={handleReactivate} isLoading={actionLoading === 'reactivate'}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Re-enable auto-renew
                      </Button>
                    )}
                  </>
                )}
                {!isCurrent && isPaid && (
                  <Button className="w-full" onClick={() => handleUpgrade(plan.name)} isLoading={actionLoading === plan.name}>
                    Upgrade
                  </Button>
                )}
                {subExpired && isCurrent && (
                  <Button className="w-full" onClick={handleResubscribe}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Resubscribe
                  </Button>
                )}
                {isCurrent && !isPaid && (
                  <Button className="w-full" variant="secondary" disabled>
                    Current Plan
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {isProActive && usage && currentPlan && (
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
