import api from './api'

export interface RuleRow {
  label: string
  value: string
}

export interface PropFirmPrice {
  size: string
  price: number
  discounted: number
  evalRules?: RuleRow[]
  fundedRules?: RuleRow[]
}

export interface PropFirmPlan {
  plan: string
  planDesc?: string
  sizes: PropFirmPrice[]
  planSteps?: number
}

export type CodeStatus = 'OK' | 'STALE' | 'MANUAL'

export interface PropFirm {
  id: string
  name: string
  slug: string
  websiteUrl: string
  description: string | null
  rating: number
  country: string
  instruments: string
  profitSplit: number
  payoutSpeed: string
  logoColor: string
  accountPrices: PropFirmPlan[] | null
  discountPercent: number
  promoCode: string | null
  promoSourceUrl: string | null
  lastCodeCheckAt: string | null
  codeStatus: CodeStatus
  dealEndsAt: string | null
  rulesSourceUrl: string | null
  lastRulesCheckAt: string | null
  rulesStatus: CodeStatus
  dailyPayouts: boolean
  noActivationFee: boolean
  oneTimeFee: boolean
  instantFunding: boolean
  isFeatured: boolean
  isActive: boolean
  createdAt: string
}

export function firstPrice(firm: PropFirm): PropFirmPrice | null {
  const plans = firm.accountPrices
  if (!plans?.length) return null
  const sizes = plans[0]!.sizes
  return sizes.length ? sizes[0]! : null
}

export function findPlan(firm: PropFirm, planName?: string): PropFirmPlan | null {
  const plans = firm.accountPrices
  if (!plans?.length) return null
  if (!planName) return plans[0]!
  return plans.find((p) => p.plan === planName) ?? plans[0]!
}

export async function listPropFirms(): Promise<PropFirm[]> {
  const { data } = await api.get('/prop-firms')
  return data.data
}

export async function createPropFirm(input: { name: string; market: 'FOREX' | 'FUTURES'; websiteUrl?: string }): Promise<PropFirm> {
  const { data } = await api.post('/prop-firms', input)
  return data.data
}

export async function getPropFirm(slug: string): Promise<PropFirm> {
  const { data } = await api.get(`/prop-firms/${slug}`)
  return data.data
}