import { prisma } from '../lib/prisma.js'

function withTemplate(where: Record<string, unknown>, templateId?: string) {
  if (templateId) where.templateId = templateId
  return where
}

function withDateRange(where: Record<string, unknown>, startDate?: Date, endDate?: Date) {
  if (startDate || endDate) {
    where.entryTime = {}
    if (startDate) (where.entryTime as Record<string, unknown>).gte = startDate
    if (endDate) (where.entryTime as Record<string, unknown>).lte = endDate
  }
  return where
}

export async function getStats(userId: string, templateId?: string, startDate?: Date, endDate?: Date) {
  const trades = await prisma.trade.findMany({
    where: withDateRange(withTemplate({ userId, isDeleted: false, status: 'COMPLETED' }, templateId), startDate, endDate),
    select: { result: true, entryPrice: true, exitPrice: true, direction: true, fees: true, entryTime: true, quantity: true, pipSize: true, pipValue: true },
  })

  const total = trades.length
  const wins = trades.filter((t) => t.result === 'WIN').length
  const losses = trades.filter((t) => t.result === 'LOSS').length
  const breakEvens = trades.filter((t) => t.result === 'BREAK_EVEN').length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  let pnl = 0
  let grossProfit = 0
  let grossLoss = 0
  trades.forEach((t) => {
    if (t.entryPrice && t.exitPrice) {
      const diff = t.direction === 'LONG' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice
      const pips = (t.pipSize && t.pipSize !== 0 ? diff / t.pipSize : diff)
      const tradePnl = pips * (t.pipValue || 1) * (t.quantity || 1) * (t.fees ? 1 - t.fees / 100 : 1)
      pnl += tradePnl
      if (tradePnl > 0) grossProfit += tradePnl
      else if (tradePnl < 0) grossLoss += Math.abs(tradePnl)
    }
  })

  const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : null

  const avgReturn = total > 0 ? pnl / total : 0

  const dailyPnL: Record<string, number> = {}
  trades.forEach((t) => {
    if (t.entryPrice && t.exitPrice) {
      const dateKey = t.entryTime ? t.entryTime.toISOString().slice(0, 10) : 'unknown'
      const diff = t.direction === 'LONG' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice
      const pips = (t.pipSize && t.pipSize !== 0 ? diff / t.pipSize : diff)
      dailyPnL[dateKey] = (dailyPnL[dateKey] || 0) + pips * (t.pipValue || 1) * (t.quantity || 1) * (t.fees ? 1 - t.fees / 100 : 1)
    }
  })
  let bestDate: string | null = null, worstDate: string | null = null
  for (const date of Object.keys(dailyPnL)) {
    const val = dailyPnL[date]
    if (val > 0 && (!bestDate || val > dailyPnL[bestDate])) bestDate = date
    if (val < 0 && (!worstDate || val < dailyPnL[worstDate])) worstDate = date
  }
  const bestDay = bestDate ? { date: bestDate, pnl: Math.round(dailyPnL[bestDate] * 100) / 100 } : null
  const worstDay = worstDate ? { date: worstDate, pnl: Math.round(dailyPnL[worstDate] * 100) / 100 } : null

  return { total, wins, losses, breakEvens, winRate, pnl: Math.round(pnl * 100) / 100, avgReturn: Math.round(avgReturn * 100) / 100, bestDay, worstDay, profitFactor }
}

export async function getMonthlyPerformance(userId: string, templateId?: string, startDate?: Date, endDate?: Date) {
  const trades = await prisma.trade.findMany({
    where: withDateRange(withTemplate({ userId, isDeleted: false, status: 'COMPLETED' }, templateId), startDate, endDate),
    select: { entryPrice: true, exitPrice: true, direction: true, entryTime: true, quantity: true, pipSize: true, pipValue: true },
  })

  const monthly: Record<string, { pnl: number; trades: number; wins: number }> = {}

  trades.forEach((t) => {
    const monthKey = t.entryTime ? t.entryTime.toISOString().slice(0, 7) : 'unknown'
    if (!monthly[monthKey]) monthly[monthKey] = { pnl: 0, trades: 0, wins: 0 }
    monthly[monthKey].trades++

    if (t.entryPrice && t.exitPrice) {
      const diff = t.direction === 'LONG' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice
      const pips = (t.pipSize && t.pipSize !== 0 ? diff / t.pipSize : diff)
      monthly[monthKey].pnl += pips * (t.pipValue || 1) * (t.quantity || 1)
    }
  })

  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      pnl: Math.round(data.pnl * 100) / 100,
      trades: data.trades,
    }))
}

export async function getResultDistribution(userId: string, templateId?: string, startDate?: Date, endDate?: Date) {
  const base: Record<string, unknown> = { userId, isDeleted: false }
  if (templateId) base.templateId = templateId
  if (startDate || endDate) {
    base.entryTime = {}
    if (startDate) (base.entryTime as Record<string, unknown>).gte = startDate
    if (endDate) (base.entryTime as Record<string, unknown>).lte = endDate
  }
  const [wins, losses, breakEvens, drafts] = await Promise.all([
    prisma.trade.count({ where: { ...base, result: 'WIN' } }),
    prisma.trade.count({ where: { ...base, result: 'LOSS' } }),
    prisma.trade.count({ where: { ...base, result: 'BREAK_EVEN' } }),
    prisma.trade.count({ where: { ...base, status: 'DRAFT' } }),
  ])
  return { wins, losses, breakEvens, drafts }
}

export async function getRecentTrades(userId: string, templateId?: string, limit = 10, startDate?: Date, endDate?: Date) {
  return prisma.trade.findMany({
    where: withDateRange(withTemplate({ userId, isDeleted: false }, templateId), startDate, endDate),
    orderBy: { entryTime: 'desc' },
    take: limit,
    include: {
      tags: { include: { tag: true } },
      images: { take: 1 },
    },
  })
}

export async function getCalendarData(userId: string, year: number, month: number, templateId?: string, startDate?: Date, endDate?: Date) {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59)

  const effectiveStart = startDate && startDate > monthStart ? startDate : monthStart
  const effectiveEnd = endDate && endDate < monthEnd ? endDate : monthEnd

  const where: Record<string, unknown> = {
    userId,
    isDeleted: false,
    status: 'COMPLETED',
    entryTime: { gte: effectiveStart, lte: effectiveEnd },
  }
  if (templateId) where.templateId = templateId

  const trades = await prisma.trade.findMany({
    where,
    select: { result: true, entryPrice: true, exitPrice: true, direction: true, entryTime: true, fees: true, quantity: true, pipSize: true, pipValue: true, partialExits: { select: { quantity: true, exitPrice: true } } },
  })

  const daily: Record<string, { pnl: number; trades: number; wins: number; losses: number }> = {}

  trades.forEach((t) => {
    const dateKey = t.entryTime ? t.entryTime.toISOString().slice(0, 10) : 'unknown'
    if (!daily[dateKey]) daily[dateKey] = { pnl: 0, trades: 0, wins: 0, losses: 0 }
    daily[dateKey].trades++

    if (t.result === 'WIN') daily[dateKey].wins++
    if (t.result === 'LOSS') daily[dateKey].losses++

    if (t.entryPrice && t.exitPrice) {
      const dir = t.direction === 'LONG' ? 1 : -1
      const pipScale = t.pipSize && t.pipSize !== 0 ? 1 / t.pipSize : 1
      const pipVal = t.pipValue || 1
      const feeMult = t.fees ? 1 - t.fees / 100 : 1

      const legPnl = (exitPx: number, qty: number) =>
        (exitPx - t.entryPrice!) * dir * pipScale * pipVal * qty * feeMult

      const partialQty = t.partialExits.reduce((s, pe) => s + pe.quantity, 0)
      const mainQty = (t.quantity || 1) - partialQty

      daily[dateKey].pnl += legPnl(t.exitPrice, mainQty)
      for (const pe of t.partialExits) {
        daily[dateKey].pnl += legPnl(pe.exitPrice, pe.quantity)
      }
    }
  })

  const result = Object.entries(daily).map(([date, data]) => ({
    date,
    pnl: Math.round(data.pnl * 100) / 100,
    trades: data.trades,
    wins: data.wins,
    losses: data.losses,
  }))

  return result.sort((a, b) => a.date.localeCompare(b.date))
}

export async function getInstrumentPerformance(userId: string, templateId?: string, startDate?: Date, endDate?: Date) {
  const trades = await prisma.trade.findMany({
    where: withDateRange(withTemplate({ userId, isDeleted: false, status: 'COMPLETED' }, templateId), startDate, endDate),
    select: { instrument: true, result: true, entryPrice: true, exitPrice: true, direction: true },
  })

  const byInstrument: Record<string, { total: number; wins: number; losses: number }> = {}

  trades.forEach((t) => {
    if (!byInstrument[t.instrument]) byInstrument[t.instrument] = { total: 0, wins: 0, losses: 0 }
    byInstrument[t.instrument].total++
    if (t.result === 'WIN') byInstrument[t.instrument].wins++
    if (t.result === 'LOSS') byInstrument[t.instrument].losses++
  })

  return Object.entries(byInstrument)
    .map(([instrument, data]) => ({
      instrument,
      total: data.total,
      wins: data.wins,
      losses: data.losses,
      winRate: data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
}
