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

async function syncAccountBalance(userId: string, templateId: string | null) {
  if (!templateId) { console.log('[syncAccountBalance] no templateId'); return }
  const template = await prisma.template.findUnique({ where: { id: templateId } })
  if (!template || template.type !== 'PROP_FIRM') { console.log('[syncAccountBalance] not found or not PROP_FIRM'); return }

  const dv = (template.defaultValues || {}) as Record<string, unknown>
  const accountSize = (dv.accountSize as number) || 0
  if (!accountSize) { console.log('[syncAccountBalance] no accountSize'); return }

  const trades = await prisma.trade.findMany({
    where: { userId, templateId, isDeleted: false, status: 'COMPLETED' },
    select: { entryPrice: true, exitPrice: true, direction: true, fees: true, quantity: true, pipSize: true, pipValue: true },
  })

  let totalPnl = 0
  for (const t of trades) {
    if (!t.entryPrice || !t.exitPrice) continue
    const rawDiff = t.direction === 'LONG' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice
    const diff = (t.pipSize && t.pipSize !== 0) ? rawDiff / t.pipSize : rawDiff
    const tradePnl = diff * (t.pipValue || 1) * (t.quantity || 1) - (t.fees || 0)
    totalPnl += tradePnl
    console.log(`[syncAccountBalance] trade: rawDiff=${rawDiff} pipSize=${t.pipSize} diff=${diff} pipValue=${t.pipValue} qty=${t.quantity} fees=${t.fees} tradePnl=${tradePnl}`)
  }

  const baseBalance = (dv.startingBalance as number) || accountSize
  const newBalance = Math.round((baseBalance + totalPnl) * 100) / 100
  console.log(`[syncAccountBalance] totalPnl=${totalPnl} baseBalance=${baseBalance} newBalance=${newBalance} oldBalance=${dv.currentAccountSize}`)
  if (dv.currentAccountSize === newBalance) { console.log('[syncAccountBalance] no change'); return }

  dv.currentAccountSize = newBalance
  await prisma.template.update({
    where: { id: templateId },
    data: { defaultValues: dv as never },
  })
  console.log('[syncAccountBalance] updated!')
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

  const checklistData = data.checklistData as Record<string, string[]> | undefined
  if (checklistData) {
    const tagIds = Object.keys(checklistData)
    if (tagIds.length > 0) {
      const existing = await prisma.tradeTag.findMany({
        where: { tradeId: trade.id, tagId: { in: tagIds } },
      })
      const existingTagIds = new Set(existing.map((t) => t.tagId))
      const newTagIds = tagIds.filter((id) => !existingTagIds.has(id))
      if (newTagIds.length > 0) {
        await prisma.tradeTag.createMany({
          data: newTagIds.map((tagId) => ({ tradeId: trade.id, tagId })),
        })
      }
    }
  }

  sendTradeSummary(userId, trade).catch(() => {})
  await syncAccountBalance(userId, trade.templateId)

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

  const updated = await prisma.trade.update({
    where: { id: tradeId },
    data: stripPartialExitsForUpdate(data),
    include: tradeInclude,
  })

  const checklistData = data.checklistData as Record<string, string[]> | undefined
  if (checklistData) {
    const tagIds = Object.keys(checklistData)
    const existing = await prisma.tradeTag.findMany({
      where: { tradeId: trade.id },
      select: { tagId: true },
    })
    const existingTagIds = new Set(existing.map((t) => t.tagId))
    const toAdd = tagIds.filter((id) => !existingTagIds.has(id))
    const toRemove = [...existingTagIds].filter((id) => !tagIds.includes(id))
    if (toRemove.length > 0) {
      await prisma.tradeTag.deleteMany({
        where: { tradeId: trade.id, tagId: { in: toRemove } },
      })
    }
    if (toAdd.length > 0) {
      await prisma.tradeTag.createMany({
        data: toAdd.map((tagId) => ({ tradeId: trade.id, tagId })),
      })
    }
  }

  await syncAccountBalance(userId, updated.templateId)
  return updated
}

export async function deleteTrade(userId: string, tradeId: string) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId, isDeleted: false },
  })
  if (!trade) throw new Error('Trade not found')

  const deleted = await prisma.trade.update({
    where: { id: tradeId },
    data: { isDeleted: true, deletedAt: new Date() },
  })

  await syncAccountBalance(userId, deleted.templateId)
  return deleted
}

export async function batchDeleteTrades(userId: string, tradeIds: string[]) {
  const trades = await prisma.trade.findMany({
    where: { id: { in: tradeIds }, userId, isDeleted: false },
    select: { id: true, templateId: true },
  })
  if (trades.length !== tradeIds.length) throw new Error('Some trades not found')

  await prisma.trade.updateMany({
    where: { id: { in: tradeIds }, userId },
    data: { isDeleted: true, deletedAt: new Date() },
  })

  const affectedTemplates = new Set(trades.map(t => t.templateId).filter(Boolean))
  for (const templateId of affectedTemplates) {
    await syncAccountBalance(userId, templateId)
  }
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
