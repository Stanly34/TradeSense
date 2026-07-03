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
}

export interface AdminPlan {
  id: string
  name: string
  price: number
  journalLimit: number | null
  imageLimit: number | null
  aiEnabled: boolean
  isActive: boolean
}

export interface AdminSubscription {
  id: string
  status: string
  startDate: string
  endDate: string | null
  user: { id: string; fullName: string; email: string }
  plan: { id: string; name: string }
}

export interface AdminStats {
  totalUsers: number
  totalTrades: number
  activeSubscriptions: number
  totalRevenue: number
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

export async function listPlans(): Promise<AdminPlan[]> {
  const { data } = await api.get('/admin/plans')
  return data.data
}

export async function createPlan(input: { name: string; price: number }): Promise<AdminPlan> {
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
