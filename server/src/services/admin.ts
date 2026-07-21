import { prisma } from '../lib/prisma.js'
import * as auditLogService from './auditLog.js'
import { authUserInclude } from './auth.js'

export async function listUsers(page = 1, limit = 50) {
  const skip = (page - 1) * limit
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true, fullName: true, username: true, email: true, role: true,
        isVerified: true, isActive: true, lastLogin: true, createdAt: true,
        _count: { select: { trades: true } },
        subscription: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            plan: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.user.count(),
  ])
  return { users, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function updateUser(userId: string, data: { role?: string; isActive?: boolean; isVerified?: boolean }, actingUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const updated = await prisma.user.update({ where: { id: userId }, data: data as never, include: authUserInclude })

  if (data.role !== undefined && data.role !== user.role) {
    await auditLogService.logAction(actingUserId, 'USER_ROLE_CHANGED', 'USER', userId, {
      oldRole: user.role,
      newRole: data.role,
    })
  }
  if (data.isActive !== undefined && data.isActive !== user.isActive) {
    await auditLogService.logAction(actingUserId, data.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'USER', userId)
  }

  return updated
}

export async function deleteUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')
  await prisma.user.update({ where: { id: userId }, data: { isActive: false } })
}

export async function listPlans() {
  const [plans, currencySetting] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    }),
    prisma.setting.findUnique({ where: { key: 'default_currency' } }),
  ])
  const defaultCurrency = currencySetting?.value || 'INR'
  return plans.map((p) => ({ ...p, currency: defaultCurrency }))
}

export async function createPlan(data: Record<string, unknown>, actingUserId: string) {
  const plan = await prisma.plan.create({ data: data as never })
  await auditLogService.logAction(actingUserId, 'PLAN_CREATED', 'PLAN', plan.id, { name: plan.name })
  return plan
}

export async function updatePlan(planId: string, data: Record<string, unknown>, actingUserId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan) throw new Error('Plan not found')
  const updated = await prisma.plan.update({ where: { id: planId }, data: data as never })
  await auditLogService.logAction(actingUserId, 'PLAN_EDITED', 'PLAN', planId, { name: updated.name })
  return updated
}

export async function deletePlan(planId: string, actingUserId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan) throw new Error('Plan not found')
  await prisma.plan.update({ where: { id: planId }, data: { isActive: false } })
  await auditLogService.logAction(actingUserId, 'PLAN_DEACTIVATED', 'PLAN', planId, { name: plan.name })
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

export async function changeUserPlan(userId: string, planId: string, actingUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan) throw new Error('Plan not found')

  const existing = await prisma.subscription.findUnique({ where: { userId } })
  let result
  if (existing) {
    result = await prisma.subscription.update({
      where: { id: existing.id },
      data: { planId, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        plan: { select: { id: true, name: true } },
      },
    })
  } else {
    result = await prisma.subscription.create({
      data: { userId, planId, status: 'ACTIVE' },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        plan: { select: { id: true, name: true } },
      },
    })
  }

  await auditLogService.logAction(actingUserId, 'USER_PLAN_CHANGED', 'USER', userId, {
    planName: plan.name,
    previousPlanName: existing?.planId ? (await prisma.plan.findUnique({ where: { id: existing.planId } }))?.name : null,
  })

  return result
}

export async function createSubscription(userId: string, planId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')
  const plan = await prisma.plan.findUnique({ where: { id: planId } })
  if (!plan) throw new Error('Plan not found')

  const existing = await prisma.subscription.findUnique({ where: { userId } })
  if (existing) throw new Error('User already has a subscription')

  return prisma.subscription.create({
    data: { userId, planId, status: 'ACTIVE' },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      plan: { select: { id: true, name: true } },
    },
  })
}

export async function updateSubscription(subscriptionId: string, data: { status?: string }) {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } })
  if (!sub) throw new Error('Subscription not found')
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: data as never,
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      plan: { select: { id: true, name: true } },
    },
  })
}

export async function listSettings() {
  const keys = ['allow_registration', 'maintenance_mode', 'email_enabled', 'free_plan_available', 'default_currency']
  const settings = await prisma.setting.findMany({ where: { key: { in: keys } } })
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  return keys.map((key) => ({ key, value: map[key] ?? (key === 'default_currency' ? 'INR' : 'true') }))
}

export async function updateSetting(key: string, value: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value, category: 'feature' },
  })
}

export async function listAllTrades(page = 1, limit = 20, query: Record<string, string> = {}) {
  const skip = (page - 1) * limit
  const where: Record<string, unknown> = { isDeleted: false }

  if (query.userId) where.userId = query.userId
  if (query.status) where.status = query.status
  if (query.result) where.result = query.result
  if (query.search) {
    where.user = {
      OR: [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
      ],
    }
  }

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: { entryTime: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        images: true,
        tags: { include: { tag: true } },
      },
    }),
    prisma.trade.count({ where }),
  ])

  return { trades, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function listAllJournals(page = 1, limit = 20, query: Record<string, string> = {}) {
  const skip = (page - 1) * limit
  const where: Record<string, unknown> = {}

  if (query.userId) where.userId = query.userId

  const [journals, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        trade: { select: { id: true, instrument: true, direction: true } },
      },
    }),
    prisma.journalEntry.count({ where }),
  ])

  return { journals, total, page, limit, totalPages: Math.ceil(total / limit) }
}
