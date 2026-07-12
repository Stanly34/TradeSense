import api from './api'

export interface PublicPlan {
  id: string
  name: string
  price: number
  currency: string
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
    currency: string
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

export interface CouponValidation {
  valid: boolean
  couponId: string
  discountPercent: number
  originalAmount: number
  finalAmount: number
}

export interface RazorpayOrder {
  keyId: string
  subscriptionId: string
  amount: number
  currency: string
  couponId?: string
}

export interface Payment {
  id: string
  amount: number
  couponId: string | null
  razorpayPaymentId: string | null
  razorpayOrderId: string | null
  status: string
  createdAt: string
  subscription: { plan: { name: string } }
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

export async function validateCoupon(couponCode: string, planName: string): Promise<CouponValidation> {
  const { data } = await api.post('/subscriptions/validate-coupon', { couponCode, planName })
  return data.data
}

export async function redeemCoupon(couponCode: string, planName: string) {
  const { data } = await api.post('/subscriptions/redeem-coupon', { couponCode, planName })
  return data
}

export async function createRazorpayOrder(planName: string, couponCode?: string): Promise<RazorpayOrder> {
  const { data } = await api.post('/subscriptions/create-order', { planName, couponCode })
  return data.data
}

export async function verifyRazorpayPayment(payload: {
  razorpayPaymentId: string
  razorpaySubscriptionId?: string
  planName: string
  couponId?: string
  amount?: number
}) {
  const { data } = await api.post('/subscriptions/verify-payment', payload)
  return data
}

export async function getRazorpayKey(): Promise<string> {
  const { data } = await api.get('/subscriptions/razorpay-key')
  return data.keyId
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
