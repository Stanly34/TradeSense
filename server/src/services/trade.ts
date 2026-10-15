import { prisma } from '../lib/prisma.js'
import type { Prisma } from '@prisma/client'
import { getUserPlan } from './subscription.js'
import { sendTradeSummary } from './email.js'
import { reconcileAccount } from './accountEngine.js'
import { nykSessionStartUtc, nowNYKey } from '../utils/nykTime.js'

const tradeInclude = {
  images: true,
  partialExits: { orderBy: { createdAt: 'asc' as const } },
  timeline: { orderBy: { eventTime: 'desc' as const } },
  tags: { include: { tag: true } },
  journal: true,
  aiReviews: { orderBy: { createdAt: 'desc' as const }, take: 1 },
  tradeAccount: { select: { id: true, name: true, type: true, defaultValues: true } },
} satisfies Prisma.TradeInclude

function stripPartialExits(data: Record<string, unknown>) {
  const { _partialExits, ...rest } = data
  return rest as Prisma.TradeUncheckedCreateInput
}

function computeDayKey(entryTime: unknown): string | null {
  if (!entryTime || typeof entryTime !== 'string') return null
  const d = new Date(entryTime)
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function stripPartialExitsForUpdate(data: Record<string, unknown>) {
  const { _partialExits, ...rest } = data
  return rest as Prisma.TradeUncheckedUpdateInput
}

const PHASE_NAMES = ['PHASE1', 'PHASE2', 'PHASE3', 'FUNDED']

function computePhase(phaseIndex: number | undefined | null): string {
  if (phaseIndex == null || phaseIndex < 0) return 'PHASE1'
  return PHASE_NAMES[Math.min(phaseIndex, PHASE_NAMES.length - 1)]
}

export async function createTrade(userId: string, data: Record<string, unknown>) {
  const plan = await getUserPlan(userId)
  if (plan.plan.dailyTradeLimit !== null) {
    const startOfToday = nykSessionStartUtc(nowNYKey())
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

  // Block journaling for funded accounts that haven't chosen their payout path (e.g. Tradeify Select Flex vs Daily)
  const accountId = typeof data.accountId === 'string' ? data.accountId : null
  let tradePhase: string | null = null
  if (accountId) {
    const acct = await prisma.account.findFirst({ where: { id: accountId, userId } })
    if (acct) {
      const dv = (acct.defaultValues || {}) as Record<string, unknown>
      tradePhase = computePhase(Number(dv.phaseIndex) || 0)
      if (acct.status === 'FUNDED') {
        const planName = String(dv.planName || '')
        if (/select evaluation/i.test(planName) && !dv.fundedPath) {
          throw new Error(`Choose your funded path for "${acct.name}" first — open the account to pick Flex or Daily payouts.`)
        }
      }
    }
  }

  const partialExits = (data._partialExits as Array<{ quantity: number; exitPrice: number; exitTime?: string }> | undefined) || []

  const tradeData: Prisma.TradeUncheckedCreateInput = {
    ...stripPartialExits(data),
    dayKey: computeDayKey(data.entryTime),
    phase: tradePhase,
    userId,
    entryTime: data.entryTime ? new Date(data.entryTime as string) : new Date(),
    partialExits: partialExits.length > 0 ? {
      create: partialExits.map((pe) => ({
        quantity: pe.quantity,
        exitPrice: pe.exitPrice,
        exitTime: pe.exitTime ? new Date(pe.exitTime) : null,
      })),
    } : undefined,
  }

  if (tradeData.entryTime && tradeData.exitTime && new Date(tradeData.exitTime) <= new Date(tradeData.entryTime)) {
    throw new Error('Exit time must be later than entry time')
  }

  const qty = tradeData.quantity
  if (qty != null && tradeData.accountId) {
    const tpl = await prisma.account.findUnique({ where: { id: tradeData.accountId as string }, select: { defaultValues: true } })
    if (tpl?.defaultValues) {
      const dv = tpl.defaultValues as Record<string, unknown>
      const marketType = dv.marketType as string | undefined
      if (marketType === 'FUTURES') {
        if (!Number.isInteger(qty)) throw new Error('Futures quantity must be a whole number')
        if (qty < 1) throw new Error('Minimum quantity for Futures is 1')
      } else if (marketType === 'FOREX') {
        if (qty < 0.01) throw new Error('Minimum quantity for Forex is 0.01')
      }
    }
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
  if (trade.accountId) {
    await reconcileAccount(userId, trade.accountId)
  }

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
  accountId?: string
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
  if (query.accountId) where.accountId = query.accountId
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

  const entryTime = data.entryTime ? new Date(data.entryTime as string) : trade.entryTime
  const exitTime = data.exitTime ? new Date(data.exitTime as string) : trade.exitTime
  if (entryTime && exitTime && exitTime <= entryTime) {
    throw new Error('Exit time must be later than entry time')
  }

  const qty = data.quantity != null ? Number(data.quantity) : trade.quantity
  if (qty != null) {
    const qtyAccountId = trade.accountId
    if (qtyAccountId) {
      const qtyAcct = await prisma.account.findUnique({ where: { id: qtyAccountId }, select: { defaultValues: true } })
      if (qtyAcct?.defaultValues) {
        const qtyDv = qtyAcct.defaultValues as Record<string, unknown>
        const qtyMarketType = qtyDv.marketType as string | undefined
        if (qtyMarketType === 'FUTURES') {
          if (!Number.isInteger(qty)) throw new Error('Futures quantity must be a whole number')
          if (qty < 1) throw new Error('Minimum quantity for Futures is 1')
        } else if (qtyMarketType === 'FOREX') {
          if (qty < 0.01) throw new Error('Minimum quantity for Forex is 0.01')
        }
      }
    }
  }

  const updateData: Record<string, unknown> = {
    ...stripPartialExitsForUpdate(data),
    ...(data.entryTime !== undefined ? { dayKey: computeDayKey(data.entryTime) } : {}),
  }

  const updatedAccountId = typeof data.accountId === 'string' ? data.accountId : trade.accountId
  if (updatedAccountId && (data.accountId !== undefined || data.entryTime !== undefined)) {
    const acct = await prisma.account.findFirst({ where: { id: updatedAccountId, userId } })
    if (acct) {
      const dv = (acct.defaultValues || {}) as Record<string, unknown>
      updateData.phase = computePhase(Number(dv.phaseIndex) || 0)
    }
  }

  const updated = await prisma.trade.update({
    where: { id: tradeId },
    data: updateData,
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

  if (updated.accountId) {
    await reconcileAccount(userId, updated.accountId)
  }
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

  if (deleted.accountId) {
    await reconcileAccount(userId, deleted.accountId)
  }
  return deleted
}

export async function batchDeleteTrades(userId: string, tradeIds: string[]) {
  const trades = await prisma.trade.findMany({
    where: { id: { in: tradeIds }, userId, isDeleted: false },
    select: { id: true, accountId: true },
  })
  if (trades.length !== tradeIds.length) throw new Error('Some trades not found')

  await prisma.trade.updateMany({
    where: { id: { in: tradeIds }, userId },
    data: { isDeleted: true, deletedAt: new Date() },
  })

  const affectedAccounts = new Set(trades.map(t => t.accountId).filter((x): x is string => Boolean(x)))
  for (const accountId of affectedAccounts) {
    await reconcileAccount(userId, accountId)
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
