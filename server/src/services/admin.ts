import { prisma } from '../lib/prisma.js'

export async function listUsers(page = 1, limit = 20) {
  const skip = (page - 1) * limit
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, fullName: true, username: true, email: true, role: true,
        isVerified: true, isActive: true, lastLogin: true, createdAt: true,
        _count: { select: { trades: true } },
      },
    }),
    prisma.user.count(),
  ])
  return { users, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function updateUser(userId: string, data: { role?: string; isActive?: boolean; isVerified?: boolean }) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')
  return prisma.user.update({ where: { id: userId }, data: data as never })
}

export async function deleteUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')
  await prisma.user.update({ where: { id: userId }, data: { isActive: false } })
}

export async function listPlans() {
  return prisma.plan.findMany({ orderBy: { price: 'asc' } })
}

export async function createPlan(data: { name: string; price: number; journalLimit?: number; imageLimit?: number; aiEnabled?: boolean }) {
  return prisma.plan.create({ data })
}

export async function updatePlan(planId: string, data: Record<string, unknown>) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan) throw new Error('Plan not found')
  return prisma.plan.update({ where: { id: planId }, data: data as never })
}

export async function deletePlan(planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan) throw new Error('Plan not found')
  await prisma.plan.update({ where: { id: planId }, data: { isActive: false } })
}

export async function listSubscriptions(page = 1, limit = 20) {
  const skip = (page - 1) * limit
  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        plan: { select: { id: true, name: true } },
      },
    }),
    prisma.subscription.count(),
  ])
  return { subscriptions, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getDashboardStats() {
  const [totalUsers, totalTrades, activeSubscriptions, totalRevenue] = await Promise.all([
    prisma.user.count(),
    prisma.trade.count({ where: { isDeleted: false } }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
  ])
  return {
    totalUsers,
    totalTrades,
    activeSubscriptions,
    totalRevenue: totalRevenue._sum.amount || 0,
  }
}
