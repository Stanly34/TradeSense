import { prisma } from '../lib/prisma.js'
import type { Prisma } from '@prisma/client'
import { getUserPlan } from './subscription.js'
import { sendTradeSummary } from './email.js'

const tradeInclude = {
  images: true,
  partialExits: { orderBy: { createdAt: 'asc' as const } },
  timeline: { orderBy: { eventTime: 'desc' as const } },
  tags: { include: { tag: true } },
  journal: true,
  aiReviews: { orderBy: { createdAt: 'desc' as const }, take: 1 },
  template: { select: { id: true, name: true, type: true, defaultValues: true } },
} satisfies Prisma.TradeInclude

function stripPartialExits(data: Record<string, unknown>) {
  const { _partialExits, ...rest } = data
  return rest as Prisma.TradeUncheckedCreateInput
}

function stripPartialExitsForUpdate(data: Record<string, unknown>) {
  const { _partialExits, ...rest } = data
  return rest as Prisma.TradeUncheckedUpdateInput
}

export async function createTrade(userId: string, data: Record<string, unknown>) {
  const plan = await getUserPlan(userId)
  if (plan.plan.dailyTradeLimit !== null) {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const dailyCount = await prisma.trade.count({
      where: {
        userId,
        isDeleted: false,
        status: 'COMPLETED',
        entryTime: { gte: startOfToday },
      },
    })
    if (dailyCount >= plan.plan.dailyTradeLimit) {
      throw new Error(`You've used ${dailyCount}/${plan.plan.dailyTradeLimit} trades today. Upgrade to Pro for unlimited daily trades.`)
    }
  }

  if (plan.plan.monthlyTradeLimit !== null) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const count = await prisma.trade.count({
      where: {
        userId,
        isDeleted: false,
        status: 'COMPLETED',
        entryTime: { gte: startOfMonth },
      },
    })
    if (count >= plan.plan.monthlyTradeLimit) {
      throw new Error(`You've used ${count}/${plan.plan.monthlyTradeLimit} trades this month. Upgrade to Pro for unlimited.`)
    }
  }

  const partialExits = (data._partialExits as Array<{ quantity: number; exitPrice: number; exitTime?: string }> | undefined) || []

  const tradeData: Prisma.TradeUncheckedCreateInput = {
    ...stripPartialExits(data),
    userId,
    partialExits: partialExits.length > 0 ? {
      create: partialExits.map((pe) => ({
        quantity: pe.quantity,
        exitPrice: pe.exitPrice,
        exitTime: pe.exitTime ? new Date(pe.exitTime) : null,
      })),
    } : undefined,
  }

  const trade = await prisma.trade.create({
    data: tradeData,
    include: tradeInclude,
  })

  sendTradeSummary(userId, trade).catch(() => {})

  return trade
}

export async function getTradeById(userId: string, tradeId: string) {
  return prisma.trade.findFirst({
    where: { id: tradeId, userId, isDeleted: false },
    include: tradeInclude,
  })
}

export async function listTrades(userId: string, query: {
  page?: number
  limit?: number
  status?: string
  result?: string
  direction?: string
  instrument?: string
  date?: string
  templateId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) {
  const page = query.page || 1
  const limit = query.limit || 20
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { userId, isDeleted: false }
  if (query.status) where.status = query.status
  if (query.result) where.result = query.result
  if (query.direction) where.direction = query.direction
  if (query.instrument) where.instrument = { contains: query.instrument, mode: 'insensitive' }
  if (query.templateId) where.templateId = query.templateId
  if (query.date) {
    const start = new Date(query.date)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    where.entryTime = { gte: start, lt: end }
  }

  const orderBy: Record<string, string> = {}
  orderBy[query.sortBy || 'entryTime'] = query.sortOrder || 'desc'

  const [trades, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      include: tradeInclude,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.trade.count({ where }),
  ])

  return { trades, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function updateTrade(userId: string, tradeId: string, data: Record<string, unknown>) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId, isDeleted: false },
  })
  if (!trade) throw new Error('Trade not found')

  const partialExits = (data._partialExits as Array<{ quantity: number; exitPrice: number; exitTime?: string }> | undefined)

  if (partialExits !== undefined) {
    await prisma.partialExit.deleteMany({ where: { tradeId } })
    if (partialExits.length > 0) {
      await prisma.partialExit.createMany({
        data: partialExits.map((pe) => ({
          tradeId,
          quantity: pe.quantity,
          exitPrice: pe.exitPrice,
          exitTime: pe.exitTime ? new Date(pe.exitTime) : null,
        })),
      })
    }
  }

  return prisma.trade.update({
    where: { id: tradeId },
    data: stripPartialExitsForUpdate(data),
    include: tradeInclude,
  })
}

export async function deleteTrade(userId: string, tradeId: string) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId, isDeleted: false },
  })
  if (!trade) throw new Error('Trade not found')

  return prisma.trade.update({
    where: { id: tradeId },
    data: { isDeleted: true, deletedAt: new Date() },
  })
}

export async function batchDeleteTrades(userId: string, tradeIds: string[]) {
  const trades = await prisma.trade.findMany({
    where: { id: { in: tradeIds }, userId, isDeleted: false },
    select: { id: true },
  })
  if (trades.length !== tradeIds.length) throw new Error('Some trades not found')

  await prisma.trade.updateMany({
    where: { id: { in: tradeIds }, userId },
    data: { isDeleted: true, deletedAt: new Date() },
  })
}

export async function addTagsToTrade(userId: string, tradeId: string, tagIds: string[]) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId, isDeleted: false },
  })
  if (!trade) throw new Error('Trade not found')

  const existing = await prisma.tradeTag.findMany({
    where: { tradeId, tagId: { in: tagIds } },
  })
  const existingTagIds = new Set(existing.map((t) => t.tagId))
  const newTagIds = tagIds.filter((id) => !existingTagIds.has(id))

  if (newTagIds.length > 0) {
    await prisma.tradeTag.createMany({
      data: newTagIds.map((tagId) => ({ tradeId, tagId })),
    })
  }

  return prisma.trade.findUnique({
    where: { id: tradeId },
    include: tradeInclude,
  })
}

export async function removeTagFromTrade(userId: string, tradeId: string, tagId: string) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId, isDeleted: false },
  })
  if (!trade) throw new Error('Trade not found')

  await prisma.tradeTag.deleteMany({ where: { tradeId, tagId } })

  return prisma.trade.findUnique({
    where: { id: tradeId },
    include: tradeInclude,
  })
}
