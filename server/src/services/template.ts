import { prisma } from '../lib/prisma.js'
import { getUserPlan } from './subscription.js'

export async function createTemplate(userId: string, data: {
  name: string
  description?: string
  type?: string
  defaultValues?: Record<string, unknown>
}) {
  const plan = await getUserPlan(userId)
  if (plan.plan.accountLimit !== null) {
    const count = await prisma.template.count({ where: { userId } })
    if (count >= plan.plan.accountLimit) {
      throw new Error(`Free plan allows ${plan.plan.accountLimit} accounts. Delete an account or upgrade to Pro.`)
    }
  }

  return prisma.template.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      type: (data.type || 'JOURNAL') as never,
      defaultValues: (data.defaultValues || {}) as never,
    },
  })
}

export async function listTemplates(userId: string) {
  return prisma.template.findMany({
    where: { userId },
    orderBy: [{ isFavorite: 'desc' }, { name: 'asc' }],
  })
}

export async function getTemplate(userId: string, templateId: string) {
  const template = await prisma.template.findFirst({ where: { id: templateId, userId } })
  if (!template) throw new Error('Template not found')
  return template
}

export async function updateTemplate(userId: string, templateId: string, data: Record<string, unknown>) {
  const template = await prisma.template.findFirst({ where: { id: templateId, userId } })
  if (!template) throw new Error('Template not found')
  return prisma.template.update({ where: { id: templateId }, data: data as never })
}

export async function deleteTemplate(userId: string, templateId: string) {
  const template = await prisma.template.findFirst({ where: { id: templateId, userId } })
  if (!template) throw new Error('Template not found')
  await prisma.template.delete({ where: { id: templateId } })
}

export async function batchDeleteTemplates(userId: string, templateIds: string[]) {
  const templates = await prisma.template.findMany({
    where: { id: { in: templateIds }, userId },
    select: { id: true },
  })
  if (templates.length !== templateIds.length) throw new Error('Some accounts not found')
  await prisma.template.deleteMany({ where: { id: { in: templateIds }, userId } })
}

export async function toggleFavorite(userId: string, templateId: string) {
  const template = await prisma.template.findFirst({ where: { id: templateId, userId } })
  if (!template) throw new Error('Template not found')
  return prisma.template.update({
    where: { id: templateId },
    data: { isFavorite: !template.isFavorite },
  })
}

export async function getAllProgressStatuses(userId: string) {
  const templates = await prisma.template.findMany({
    where: { userId, type: 'PROP_FIRM' },
    select: { id: true, defaultValues: true },
  })

  const statusMap: Record<string, 'ACTIVE' | 'PASSED' | 'FAILED'> = {}

  for (const tpl of templates) {
    const dv = (tpl.defaultValues || {}) as Record<string, unknown>
    const manualStatus = dv.manualStatus as string | undefined
    if (manualStatus === 'PASSED' || manualStatus === 'FAILED') {
      statusMap[tpl.id] = manualStatus as 'PASSED' | 'FAILED'
      continue
    }

    const trades = await prisma.trade.findMany({
      where: { userId, templateId: tpl.id, isDeleted: false, status: 'COMPLETED' },
      select: { entryPrice: true, exitPrice: true, direction: true, fees: true, result: true, createdAt: true, quantity: true, pipSize: true, pipValue: true },
      orderBy: { createdAt: 'asc' },
    })

    const targetProfit = (dv.targetProfit as number) || 0
    const maxTotalDrawdown = (dv.maxTotalDrawdown as number) || 0
    const maxDailyDrawdown = (dv.maxDailyDrawdown as number) || 0
    const marketType = (dv.marketType as string) || 'FOREX'
    const startBalance = (dv.currentAccountSize as number) || (dv.accountSize as number) || 0

    let totalPnl = 0
    let peakPnl = 0
    let lowestPnl = 0
    let maxDrawdown = 0
    let status: 'ACTIVE' | 'PASSED' | 'FAILED' = 'ACTIVE'

    const tradesByDate: Record<string, typeof trades> = {}
    for (const t of trades) {
      const dateKey = t.createdAt.toISOString().split('T')[0]
      if (!tradesByDate[dateKey]) tradesByDate[dateKey] = []
      tradesByDate[dateKey].push(t)
    }

    for (const date of Object.keys(tradesByDate).sort()) {
      const dayTrades = tradesByDate[date]
      const startOfDayTotalPnl = totalPnl
      let dailyPnL = 0

      for (const t of dayTrades) {
        let tradePnl = 0
        if (t.entryPrice && t.exitPrice) {
          const diff = t.direction === 'LONG' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice
          const pips = (t.pipSize && t.pipSize !== 0 ? diff / t.pipSize : diff)
          const feeMultiplier = t.fees ? 1 - t.fees / 100 : 1
          tradePnl = pips * (t.pipValue || 1) * (t.quantity || 1) * feeMultiplier
        }
        dailyPnL += tradePnl
        totalPnl = startOfDayTotalPnl + dailyPnL
        if (totalPnl > peakPnl) peakPnl = totalPnl
        if (totalPnl < lowestPnl) lowestPnl = totalPnl
        if (marketType === 'FUTURES') {
          const trailingDrawdown = peakPnl - totalPnl
          if (trailingDrawdown > maxDrawdown) maxDrawdown = trailingDrawdown
        } else {
          if (Math.abs(lowestPnl) > maxDrawdown) maxDrawdown = Math.abs(lowestPnl)
        }
        if (maxDailyDrawdown > 0 && startBalance + startOfDayTotalPnl + dailyPnL < startBalance + startOfDayTotalPnl - maxDailyDrawdown) {
          status = 'FAILED'
        }
      }
    }

    if (status !== 'FAILED' && maxTotalDrawdown > 0 && maxDrawdown >= maxTotalDrawdown) {
      status = 'FAILED'
    }
    if (status === 'ACTIVE' && targetProfit > 0 && totalPnl >= targetProfit) {
      status = 'PASSED'
    }

    statusMap[tpl.id] = status
  }

  return statusMap
}

export async function getChallengeProgress(userId: string, templateId: string) {
  const template = await prisma.template.findFirst({ where: { id: templateId, userId } })
  if (!template) throw new Error('Template not found')

  const dv = (template.defaultValues || {}) as Record<string, unknown>
  const manualStatus = dv.manualStatus as string | undefined
  if (manualStatus === 'PASSED' || manualStatus === 'FAILED') {
    return {
      tradesCount: 0,
      totalPnl: 0,
      peakPnl: 0,
      maxDrawdown: 0,
      winningTrades: 0,
      losingTrades: 0,
      status: manualStatus as 'PASSED' | 'FAILED',
      dailyData: [],
      manualOverride: true,
    }
  }

  const marketType = (dv.marketType as string) || 'FOREX'
  const startBalance = (dv.currentAccountSize as number) || (dv.accountSize as number) || 0
  const targetProfit = (dv.targetProfit as number) || 0
  const maxDailyDrawdown = (dv.maxDailyDrawdown as number) || 0
  const maxTotalDrawdown = (dv.maxTotalDrawdown as number) || 0

  const trades = await prisma.trade.findMany({
    where: { userId, templateId, isDeleted: false, status: 'COMPLETED' },
    select: { entryPrice: true, exitPrice: true, direction: true, fees: true, result: true, createdAt: true, quantity: true, pipSize: true, pipValue: true },
    orderBy: { createdAt: 'asc' },
  })

  let totalPnl = 0
  let peakPnl = 0
  let lowestPnl = 0
  let maxDrawdown = 0
  let winningTrades = 0
  let losingTrades = 0
  let status: 'ACTIVE' | 'PASSED' | 'FAILED' = 'ACTIVE'
  const dailyData: Array<{
    date: string
    startBalance: number
    dailyPnL: number
    endBalance: number
    dailyDrawdownBreached: boolean
  }> = []

  const tradesByDate: Record<string, typeof trades> = {}
  for (const t of trades) {
    const dateKey = t.createdAt.toISOString().split('T')[0]
    if (!tradesByDate[dateKey]) tradesByDate[dateKey] = []
    tradesByDate[dateKey].push(t)
  }

  for (const date of Object.keys(tradesByDate).sort()) {
    const dayTrades = tradesByDate[date]
    const startOfDayBalance = startBalance + totalPnl
    const startOfDayTotalPnl = totalPnl
    let dailyPnL = 0
    let dailyDrawdownBreached = false

    for (const t of dayTrades) {
      let tradePnl = 0
      if (t.entryPrice && t.exitPrice) {
          const diff = t.direction === 'LONG' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice
          const pips = (t.pipSize && t.pipSize !== 0 ? diff / t.pipSize : diff)
          const feeMultiplier = t.fees ? 1 - t.fees / 100 : 1
          tradePnl = pips * (t.pipValue || 1) * (t.quantity || 1) * feeMultiplier
      }
      if (t.result === 'WIN') winningTrades++
      if (t.result === 'LOSS') losingTrades++

      dailyPnL += tradePnl
      const currentTotalPnl = startOfDayTotalPnl + dailyPnL
      totalPnl = currentTotalPnl

      if (currentTotalPnl > peakPnl) peakPnl = currentTotalPnl
      if (currentTotalPnl < lowestPnl) lowestPnl = currentTotalPnl

      if (marketType === 'FUTURES') {
        const trailingDrawdown = peakPnl - currentTotalPnl
        if (trailingDrawdown > maxDrawdown) maxDrawdown = trailingDrawdown
      } else {
        const drawdownFromInitial = Math.abs(lowestPnl)
        if (drawdownFromInitial > maxDrawdown) maxDrawdown = drawdownFromInitial
      }

      const cumulativeDailyPnl = dailyPnL
      if (maxDailyDrawdown > 0 && startOfDayBalance + cumulativeDailyPnl < startOfDayBalance - maxDailyDrawdown) {
        dailyDrawdownBreached = true
      }
    }

    dailyData.push({
      date,
      startBalance: Math.round(startOfDayBalance * 100) / 100,
      dailyPnL: Math.round(dailyPnL * 100) / 100,
      endBalance: Math.round((startOfDayBalance + dailyPnL) * 100) / 100,
      dailyDrawdownBreached,
    })

    if (dailyDrawdownBreached) status = 'FAILED'
  }

  if (status !== 'FAILED' && maxTotalDrawdown > 0 && maxDrawdown >= maxTotalDrawdown) {
    status = 'FAILED'
  }
  if (status === 'ACTIVE' && targetProfit > 0 && totalPnl >= targetProfit) {
    status = 'PASSED'
  }

  return {
    tradesCount: trades.length,
    totalPnl: Math.round(totalPnl * 100) / 100,
    peakPnl: Math.round(peakPnl * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    winningTrades,
    losingTrades,
    status,
    dailyData,
  }
}

export async function overrideStatus(userId: string, templateId: string, status: string | null) {
  const template = await prisma.template.findFirst({ where: { id: templateId, userId } })
  if (!template) throw new Error('Template not found')

  const defaultValues = (template.defaultValues || {}) as Record<string, unknown>
  if (status) {
    defaultValues.manualStatus = status
  } else {
    delete defaultValues.manualStatus
  }

  return prisma.template.update({
    where: { id: templateId },
    data: { defaultValues: defaultValues as never },
  })
}
