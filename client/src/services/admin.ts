import api from './api'

export interface AdminUser {
  id: string
  fullName: string
  username: string
  email: string
  role: string
  isVerified: boolean
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  _count: { trades: number }
  subscription?: {
    id: string
    status: string
    startDate: string
    endDate: string | null
    plan: { id: string; name: string }
  } | null
}

export interface AdminPlan {
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
  razorpayPlanId: string | null
  isActive: boolean
}

export interface AdminSubscription {
  id: string
  status: string
  startDate: string
  endDate: string | null
  autoRenew: boolean
  user: { id: string; fullName: string; email: string }
  plan: { id: string; name: string }
}

export interface AdminSetting {
  key: string
  value: string
}

export interface AdminStats {
  totalUsers: number
  totalTrades: number
  activeSubscriptions: number
  totalRevenue: number
}

export interface AdminTrade {
  id: string
  instrument: string
  direction: string
  entryPrice: number | null
  exitPrice: number | null
  stopLoss: number | null
  takeProfit: number | null
  quantity: number | null
  pipSize: number | null
  pipValue: number | null
  fees: number | null
  broker: string | null
  account: string | null
  session: string | null
  marketBias: string | null
  result: string | null
  riskReward: number | null
  notes: string | null
  reason: string | null
  mistakes: string | null
  entryTime: string
  exitTime: string | null
  status: string
  user: { id: string; fullName: string; email: string }
  images: { id: string; imageUrl: string; category: string }[]
  tags: { tag: { id: string; name: string } }[]
}

export interface AdminJournal {
  id: string
  content: string
  createdAt: string
  user: { id: string; fullName: string; email: string }
  trade: { id: string; instrument: string; direction: string }
}

export interface AdminPlatform {
  id: string
  name: string
  marketType: string
  isActive: boolean
  createdAt: string
}

export interface AdminCoupon {
  id: string
  code: string
  description: string | null
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  maxUsage: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  action: string
  targetType: string
  targetId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: { id: string; fullName: string; email: string; role: string }
}

export async function getStats(): Promise<AdminStats> {
  const { data } = await api.get('/admin/stats')
  return data.data
}

export async function listUsers(page = 1, limit = 20): Promise<{ users: AdminUser[]; total: number; totalPages: number }> {
  const { data } = await api.get('/admin/users', { params: { page, limit } })
  return data.data
}

export async function updateUser(id: string, input: { role?: string; isActive?: boolean }): Promise<void> {
  await api.patch(`/admin/users/${id}`, input)
}

export async function deactivateUser(id: string): Promise<void> {
  await api.delete(`/admin/users/${id}`)
}

export async function changeUserPlan(id: string, planId: string): Promise<void> {
  await api.patch(`/admin/users/${id}/plan`, { planId })
}

export async function listPlans(): Promise<AdminPlan[]> {
  const { data } = await api.get('/admin/plans')
  return data.data
}

export async function createPlan(input: Record<string, unknown>): Promise<AdminPlan> {
  const { data } = await api.post('/admin/plans', input)
  return data.data
}

export async function updatePlan(id: string, input: Partial<AdminPlan>): Promise<void> {
  await api.patch(`/admin/plans/${id}`, input)
}

export async function deactivatePlan(id: string): Promise<void> {
  await api.delete(`/admin/plans/${id}`)
}

export async function listSubscriptions(page = 1, limit = 20): Promise<{ subscriptions: AdminSubscription[]; total: number; totalPages: number }> {
  const { data } = await api.get('/admin/subscriptions', { params: { page, limit } })
  return data.data
}

export async function createSubscription(userId: string, planId: string): Promise<AdminSubscription> {
  const { data } = await api.post('/admin/subscriptions', { userId, planId })
  return data.data
}

export async function updateSubscription(id: string, input: { status?: string }): Promise<void> {
  await api.patch(`/admin/subscriptions/${id}`, input)
}

export async function listSettings(): Promise<AdminSetting[]> {
  const { data } = await api.get('/admin/settings')
  return data.data
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await api.patch('/admin/settings', { key, value })
}

export async function listAllTrades(page = 1, limit = 20, params?: Record<string, string>): Promise<{ trades: AdminTrade[]; total: number; totalPages: number }> {
  const { data } = await api.get('/admin/trades', { params: { page, limit, ...params } })
  return data.data
}

export async function listAllJournals(page = 1, limit = 20, params?: Record<string, string>): Promise<{ journals: AdminJournal[]; total: number; totalPages: number }> {
  const { data } = await api.get('/admin/journals', { params: { page, limit, ...params } })
  return data.data
}

export async function listCoupons(): Promise<AdminCoupon[]> {
  const { data } = await api.get('/admin/coupons')
  return data.data
}

export async function createCoupon(input: {
  code: string
  description?: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  maxUsage?: number | null
  expiresAt?: string | null
}): Promise<AdminCoupon> {
  const { data } = await api.post('/admin/coupons', input)
  return data.data
}

export async function updateCoupon(id: string, input: Partial<{
  description: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  maxUsage: number | null
  expiresAt: string | null
  isActive: boolean
}>): Promise<void> {
  await api.patch(`/admin/coupons/${id}`, input)
}

export async function deactivateCoupon(id: string): Promise<void> {
  await api.delete(`/admin/coupons/${id}`)
}

export async function listPlatforms(): Promise<AdminPlatform[]> {
  const { data } = await api.get('/admin/platforms')
  return data.data
}

export async function createPlatform(input: { name: string; marketType: string }): Promise<AdminPlatform> {
  const { data } = await api.post('/admin/platforms', input)
  return data.data
}

export async function updatePlatform(id: string, input: Partial<{ name: string; marketType: string; isActive: boolean }>): Promise<void> {
  await api.patch(`/admin/platforms/${id}`, input)
}

export async function deletePlatform(id: string): Promise<void> {
  await api.delete(`/admin/platforms/${id}`)
}

export async function listAuditLogs(page = 1, limit = 50, params?: { action?: string; userId?: string }): Promise<{ logs: AuditLogEntry[]; total: number; totalPages: number }> {
  const { data } = await api.get('/admin/audit-logs', { params: { page, limit, ...params } })
  return data.data
}
