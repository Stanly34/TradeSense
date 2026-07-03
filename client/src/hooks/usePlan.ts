import { useAuth } from './useAuth'

export function usePlan() {
  const { user } = useAuth()

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
  }
}
