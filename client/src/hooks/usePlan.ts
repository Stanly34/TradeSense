import { useAuth } from './useAuth'

export function usePlan() {
  const { user, refreshUser } = useAuth()

  const sub = user?.subscription
  const plan = sub?.plan
  const isPro = plan?.name === 'PRO'
  const isBasic = plan?.name === 'BASIC' || !plan
  const isExpired = sub?.status === 'EXPIRED'
  const planName = plan?.name || 'BASIC'
  const isAtAccountLimit = !isPro
  const isAtImageLimit = !isPro
  const isAtChecklistLimit = !isPro
  const isAtTradeLimit = !isPro
  const hasWeeklyOutlook = !!plan?.weeklyOutlook

  console.log('[DIAG:usePlan] user?.subscription:', user?.subscription)
  console.log('[DIAG:usePlan] sub:', sub)
  console.log('[DIAG:usePlan] plan:', plan)
  console.log('[DIAG:usePlan] plan?.name:', plan?.name)
  console.log('[DIAG:usePlan] isPro:', isPro)
  console.log('[DIAG:usePlan] isBasic:', isBasic)

  return {
    isPro,
    isBasic,
    isExpired,
    plan,
    planName,
    isAtAccountLimit,
    isAtImageLimit,
    isAtChecklistLimit,
    isAtTradeLimit,
    hasWeeklyOutlook,
    refresh: refreshUser,
  }
}
