import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Check, X, FileText, Image, Zap, Tags, Trophy, Clock, CalendarCheck, Brain } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import * as subscriptionService from '../services/subscriptions'
import type { PublicPlan } from '../services/subscriptions'
import { loadRazorpayScript } from '../lib/razorpay'
import { getCurrencySymbol } from '../lib/currency'
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

export function ChoosePlanPage() {
  const navigate = useNavigate()
  const { refreshUser, user: authUser } = useAuth()
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    subscriptionService.listPlans()
      .then(setPlans)
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSelect(planName: string) {
    setActionLoading(planName)
    try {
      await subscriptionService.selectPlan(planName)
      await refreshUser()
      toast.success(`Started with ${planName} plan`)
      navigate('/dashboard')
    } catch {
      toast.error('Failed to select plan')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleUpgrade(planName: string) {
    setActionLoading(planName)
    try {
      const order = await subscriptionService.createRazorpayOrder(planName)

      await loadRazorpayScript()

      const rzp = new window.Razorpay({
        key: order.keyId,
        name: 'TradeSense',
        description: `${planName} Plan`,
        subscription_id: order.subscriptionId,
        prefill: { name: authUser?.fullName || '', email: authUser?.email || '', contact: '9999999999' },
        handler: async (response) => {
          try {
            await subscriptionService.verifyRazorpayPayment({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySubscriptionId: response.razorpay_subscription_id,
              planName,
              couponId: order.couponId,
            })
            toast.success('Welcome to Pro!')
            setActionLoading(null)
            await refreshUser()
            navigate('/dashboard')
          } catch {
            toast.error('Payment verification failed. Please contact support.')
            setActionLoading(null)
          }
        },
        modal: {
          ondismiss: () => setActionLoading(null),
        },
      })

      rzp.open()
    } catch {
      toast.error('Failed to start checkout')
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Choose your plan</h1>
          <p className="text-sm text-text-muted mt-2">Pick the plan that fits your trading journey.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isPaid = plan.price > 0
            return (
              <div key={plan.id} className="bg-elevated rounded-2xl border-2 border-border relative transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex flex-col overflow-hidden">
                {isPaid && (
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
                        <span className="text-3xl font-bold text-text-primary">{getCurrencySymbol(plan.currency)}{plan.price}</span>
                        <span className="text-text-muted text-xs">/month</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 flex-1">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 mt-2">Limits</p>
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
                  <Button
                    className="w-full"
                    onClick={() => isPaid ? handleUpgrade(plan.name) : handleSelect(plan.name)}
                    isLoading={actionLoading === plan.name}
                  >
                    {isPaid ? (
                      <><Sparkles className="w-4 h-4 mr-2" /> Go {plan.name}</>
                    ) : (
                      `Start with ${plan.name}`
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
