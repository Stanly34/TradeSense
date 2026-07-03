import api from './api'

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

export async function createCheckout(): Promise<{ testMode: boolean; url: string | null }> {
  const { data } = await api.post('/subscriptions/create-checkout')
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
