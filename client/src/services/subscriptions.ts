import api from './api'

export interface PublicPlan {
  id: string
  name: string
  price: number
  journalLimit: number | null
  imageLimit: number | null
  accountLimit: number | null
  checklistLimit: number | null
  monthlyTradeLimit: number | null
  dailyTradeLimit: number | null
  weeklyOutlook: boolean
  aiEnabled: boolean
  isActive: boolean
}

export interface UserPlan {
  plan: {
    id: string
    name: string
    price: number
    accountLimit: number | null
    imageLimit: number | null
    checklistLimit: number | null
    monthlyTradeLimit: number | null
    dailyTradeLimit: number | null
    weeklyOutlook: boolean
  }
  status: string
  endDate: string | null
  autoRenew: boolean
  usage: {
    tradesThisMonth: number
    tradesToday: number
    accountsUsed: number
    checklistsUsed: number
  }
}

export async function listPlans(): Promise<PublicPlan[]> {
  const { data } = await api.get('/subscriptions/plans')
  return data.data
}

export async function getPlan(): Promise<UserPlan> {
  const { data } = await api.get('/subscriptions/plan')
  return data.data
}

export async function selectPlan(planName: string) {
  const { data } = await api.post('/subscriptions/select-plan', { planName })
  return data
}

export async function upgradeToPro() {
  const { data } = await api.post('/subscriptions/upgrade')
  return data
}

export async function createCheckout(planName: string): Promise<{ testMode: boolean; url: string | null }> {
  const { data } = await api.post('/subscriptions/create-checkout', { planName })
  return data.data
}

export interface Payment {
  id: string
  amount: number
  couponId: string | null
  provider: string | null
  transactionId: string | null
  status: string
  createdAt: string
  subscription: { plan: { name: string } }
}

export async function listPayments(): Promise<Payment[]> {
  const { data } = await api.get('/subscriptions/payments')
  return data.data
}

export async function cancelAutoRenew() {
  const { data } = await api.post('/subscriptions/cancel')
  return data
}

export async function reactivateAutoRenew() {
  const { data } = await api.post('/subscriptions/reactivate')
  return data
}
