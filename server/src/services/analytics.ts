import { prisma } from '../lib/prisma.js'

function computePnl(trade: {
  entryPrice: number | null
  exitPrice: number | null
  direction: string
  quantity: number | null
  pipSize: number | null
  pipValue: number | null
  fees: number | null
  partialExits: Array<{ quantity: number; exitPrice: number }>
}): number {
  if (!trade.entryPrice || !trade.exitPrice) return 0
  const dir = trade.direction === 'LONG' ? 1 : -1
  const pipScale = trade.pipSize && trade.pipSize !== 0 ? 1 / trade.pipSize : 1
  const pipVal = trade.pipValue || 1
  const legPnl = (exitPx: number, qty: number) => (exitPx - trade.entryPrice!) * dir * pipScale * pipVal * qty
  const partialQty = trade.partialExits.reduce((s, pe) => s + pe.quantity, 0)
  const mainQty = (trade.quantity || 1) - partialQty
  let pnl = legPnl(trade.exitPrice, mainQty)
  for (const pe of trade.partialExits) pnl += legPnl(pe.exitPrice, pe.quantity)
  return pnl - (trade.fees || 0)
}

export async function getMonthSummary(userId: string, year: number, month: number, accountId?: string) {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59)

  const where: Record<string, unknown> = {
    userId,
    isDeleted: false,
    status: 'COMPLETED',
    entryTime: { gte: monthStart, lte: monthEnd },
  }
  if (accountId) where.accountId = accountId

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { entryTime: 'asc' },
    select: {
      id: true,
      result: true,
      entryPrice: true,
      exitPrice: true,
      stopLoss: true,
      direction: true,
      quantity: true,
      pipSize: true,
      pipValue: true,
      fees: true,
      entryTime: true,
      dayKey: true,
      setup: true,
      instrument: true,
      partialExits: { select: { quantity: true, exitPrice: true } },
    },
  })

  const dayMap = new Map<string, {
    date: string
    pnl: number
    trades: number
    wins: number
    losses: number
    breakEvens: number
    tradeIds: Array<{ id: string; instrument: string; result: string | null; pnl: number }>
    setups: Map<string, number>
  }>()

  for (const t of trades) {
    const pnl = computePnl(t)
    const dateKey = t.dayKey || 'unknown'
    let day = dayMap.get(dateKey)
    if (!day) {
      day = { date: dateKey, pnl: 0, trades: 0, wins: 0, losses: 0, breakEvens: 0, tradeIds: [], setups: new Map() }
      dayMap.set(dateKey, day)
    }
    day.trades++
    if (t.result === 'WIN') day.wins++
    else if (t.result === 'LOSS') day.losses++
    else if (t.result === 'BREAK_EVEN') day.breakEvens++
    day.pnl += pnl
    day.tradeIds.push({ id: t.id, instrument: t.instrument, result: t.result ?? null, pnl: Math.round(pnl * 100) / 100 })
    if (t.setup) day.setups.set(t.setup, (day.setups.get(t.setup) || 0) + 1)
  }

  const days = [...dayMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => {
      let bestSetup: string | null = null
      let bestCount = 0
      for (const [name, count] of d.setups) {
        if (count > bestCount) { bestCount = count; bestSetup = name }
      }
      return {
        date: d.date,
        pnl: Math.round(d.pnl * 100) / 100,
        trades: d.trades,
        wins: d.wins,
        losses: d.losses,
        breakEvens: d.breakEvens,
        bestSetup,
        tradeIds: d.tradeIds,
      }
    })

  const weekMap = new Map<string, { start: string; pnl: number; trades: number }>()
  for (const day of days) {
    const dt = new Date(day.date + 'T12:00:00')
    const dow = (dt.getDay() + 6) % 7
    const wkStart = new Date(dt)
    wkStart.setDate(dt.getDate() - dow)
    const key = `${wkStart.getFullYear()}-${String(wkStart.getMonth() + 1).padStart(2, '0')}-${String(wkStart.getDate()).padStart(2, '0')}`
    const w = weekMap.get(key) ?? { start: key, pnl: 0, trades: 0 }
    w.pnl += day.pnl
    w.trades += day.trades
    weekMap.set(key, w)
  }
  const weeks = [...weekMap.values()]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((w, i) => ({ ...w, label: `Week ${i + 1}`, pnl: Math.round(w.pnl * 100) / 100 }))

  const bestWeek = weeks.length > 0 ? [...weeks].sort((a, b) => b.pnl - a.pnl)[0] : null
  const worstWeek = weeks.length > 0 ? [...weeks].sort((a, b) => a.pnl - b.pnl)[0] : null

  const results = trades.map((t) => t.result).filter((r) => r === 'WIN' || r === 'LOSS')
  let streakType: 'win' | 'loss' | null = null
  let streakCount = 0
  for (let i = results.length - 1; i >= 0; i--) {
    const r = results[i]
    if (i === results.length - 1) {
      streakType = r === 'WIN' ? 'win' : 'loss'
      streakCount = 1
      continue
    }
    if ((r === 'WIN' ? 'win' : 'loss') !== streakType) break
    streakCount++
  }

  let rrSum = 0
  let rrCount = 0
  for (const t of trades) {
    if (!t.entryPrice || !t.stopLoss) continue
    const pipScale = t.pipSize && t.pipSize !== 0 ? 1 / t.pipSize : 1
    const risk = Math.abs(t.entryPrice - t.stopLoss) * pipScale * (t.pipValue || 1) * (t.quantity || 1)
    if (risk <= 0) continue
    const pnl = computePnl(t)
    rrSum += pnl / risk
    rrCount++
  }

  const totalPnl = Math.round(days.reduce((s, d) => s + d.pnl, 0) * 100) / 100
  const tradingDays = days.filter((d) => d.trades > 0).length

  return {
    month: {
      year,
      month,
      pnl: totalPnl,
      tradingDays,
      totalTrades: trades.length,
      wins: trades.filter((t) => t.result === 'WIN').length,
      losses: trades.filter((t) => t.result === 'LOSS').length,
      avgDailyPnl: tradingDays > 0 ? Math.round((totalPnl / tradingDays) * 100) / 100 : null,
      avgRR: rrCount > 0 ? Math.round((rrSum / rrCount) * 100) / 100 : null,
      currentStreak: { type: streakType, count: streakCount },
    },
    days,
    weeks,
    bestWeek,
    worstWeek,
  }
}

type CompletedTrade = {
  result: string | null
  entryPrice: number | null
  exitPrice: number | null
  stopLoss: number | null
  direction: string
  quantity: number | null
  pipSize: number | null
  pipValue: number | null
  fees: number | null
  entryTime: Date | null
  partialExits: Array<{ quantity: number; exitPrice: number }>
}

async function getCompletedTrades(userId: string, accountId?: string, extraSelect: Record<string, unknown> = {}): Promise<any[]> {
  const where: Record<string, unknown> = { userId, isDeleted: false, status: 'COMPLETED' }
  if (accountId) where.accountId = accountId
  return prisma.trade.findMany({
    where,
    orderBy: { entryTime: 'asc' },
    select: {
      id: true,
      result: true,
      entryPrice: true,
      exitPrice: true,
      stopLoss: true,
      direction: true,
      quantity: true,
      pipSize: true,
      pipValue: true,
      fees: true,
      entryTime: true,
      dayKey: true,
      instrument: true,
      setup: true,
      ...extraSelect,
      partialExits: { select: { quantity: true, exitPrice: true } },
    },
  })
}

function riskOf(t: CompletedTrade): number {
  if (!t.entryPrice || !t.stopLoss) return 0
  const pipScale = t.pipSize && t.pipSize !== 0 ? 1 / t.pipSize : 1
  const risk = Math.abs(t.entryPrice - t.stopLoss) * pipScale * (t.pipValue || 1) * (t.quantity || 1)
  return risk > 0 ? risk : 0
}

function mondayKey(date: Date): string {
  const d = new Date(date)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function getTimeline(userId: string, interval: string, accountId?: string) {
  const trades = await getCompletedTrades(userId, accountId)

  const buckets = new Map<string, { label: string; trades: number; wins: number; pnl: number }>()
  for (const t of trades) {
    if (!t.entryTime) continue
    const date = new Date(t.entryTime)
    let key: string
    if (interval === 'monthly') key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    else if (interval === 'weekly') key = mondayKey(date)
    else key = t.dayKey || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const b = buckets.get(key) ?? { label: key, trades: 0, wins: 0, pnl: 0 }
    b.trades++
    if (t.result === 'WIN') b.wins++
    b.pnl += computePnl(t)
    buckets.set(key, b)
  }

  const sorted = [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label))
  let equity = 0
  let peak = 0
  const points = sorted.map((b) => {
    equity = Math.round((equity + b.pnl) * 100) / 100
    peak = Math.max(peak, equity)
    return {
      date: b.label,
      trades: b.trades,
      wins: b.wins,
      pnl: Math.round(b.pnl * 100) / 100,
      equity,
      drawdown: Math.round((equity - peak) * 100) / 100,
    }
  })

  const maxDrawdown = points.length > 0 ? Math.min(...points.map((p) => p.drawdown)) : 0
  return { points, totalPnl: points.length > 0 ? points[points.length - 1].equity : 0, maxDrawdown }
}

export async function getDistributions(userId: string, accountId?: string) {
  const trades = await getCompletedTrades(userId, accountId)

  const rrBuckets = ['≤ -2', '-2 .. -1', '-1 .. -0.5', '-0.5 .. 0', '0 .. 1', '1 .. 2', '2 .. 3', '≥ 3']
  const profitBuckets = ['≤ -$250', '-$250 .. -$100', '-$100 .. $0', '$0 .. $100', '$100 .. $250', '≥ $250']
  const sizeBuckets = ['≤ 0.5', '0.5 .. 1', '1 .. 2', '2 .. 5', '≥ 5']

  const rrCounts = new Map(rrBuckets.map((b) => [b, 0]))
  const profitCounts = new Map(profitBuckets.map((b) => [b, 0]))
  const sizeCounts = new Map(sizeBuckets.map((b) => [b, 0]))
  let long = 0, short = 0, longWins = 0, shortWins = 0, longPnl = 0, shortPnl = 0

  for (const t of trades) {
    const pnl = computePnl(t)
    const risk = riskOf(t)
    if (risk > 0) {
      const rr = pnl / risk
      const key = rr <= -2 ? '≤ -2' : rr <= -1 ? '-2 .. -1' : rr <= -0.5 ? '-1 .. -0.5' : rr < 0 ? '-0.5 .. 0' : rr < 1 ? '0 .. 1' : rr < 2 ? '1 .. 2' : rr < 3 ? '2 .. 3' : '≥ 3'
      rrCounts.set(key, (rrCounts.get(key) || 0) + 1)
    }
    const pkey = pnl <= -250 ? '≤ -$250' : pnl <= -100 ? '-$250 .. -$100' : pnl < 0 ? '-$100 .. $0' : pnl < 100 ? '$0 .. $100' : pnl < 250 ? '$100 .. $250' : '≥ $250'
    profitCounts.set(pkey, (profitCounts.get(pkey) || 0) + 1)

    if (t.quantity != null) {
      const q = t.quantity
      const skey = q <= 0.5 ? '≤ 0.5' : q <= 1 ? '0.5 .. 1' : q <= 2 ? '1 .. 2' : q <= 5 ? '2 .. 5' : '≥ 5'
      sizeCounts.set(skey, (sizeCounts.get(skey) || 0) + 1)
    }

    if (t.direction === 'LONG') {
      long++
      if (t.result === 'WIN') longWins++
      longPnl += pnl
    } else {
      short++
      if (t.result === 'WIN') shortWins++
      shortPnl += pnl
    }
  }

  return {
    rr: rrBuckets.map((bucket) => ({ bucket, count: rrCounts.get(bucket) || 0 })),
    profits: profitBuckets.map((bucket) => ({ bucket, count: profitCounts.get(bucket) || 0 })),
    sizes: sizeBuckets.map((bucket) => ({ bucket, count: sizeCounts.get(bucket) || 0 })),
    longShort: {
      long,
      short,
      longWins,
      shortWins,
      longPnl: Math.round(longPnl * 100) / 100,
      shortPnl: Math.round(shortPnl * 100) / 100,
    },
  }
}

export async function getTiming(userId: string, accountId?: string) {
  const trades = await getCompletedTrades(userId, accountId)

  const hours = new Map<number, { trades: number; wins: number; pnl: number }>()
  const sessions = new Map<string, { trades: number; wins: number; pnl: number }>()
  const weekdays = Array.from({ length: 7 }, (_, i) => ({ day: i, trades: 0, wins: 0, pnl: 0 }))

  for (const t of trades) {
    const pnl = computePnl(t)
    if (t.entryTime) {
      const date = new Date(t.entryTime)
      const h = date.getHours()
      const hb = hours.get(h) ?? { trades: 0, wins: 0, pnl: 0 }
      hb.trades++
      if (t.result === 'WIN') hb.wins++
      hb.pnl += pnl
      hours.set(h, hb)

      const day = date.getDay()
      weekdays[day].trades++
      if (t.result === 'WIN') weekdays[day].wins++
      weekdays[day].pnl += pnl
    }
    const s = (t as any).session ?? 'UNSET'
    const sb = sessions.get(s) ?? { trades: 0, wins: 0, pnl: 0 }
    sb.trades++
    if (t.result === 'WIN') sb.wins++
    sb.pnl += pnl
    sessions.set(s, sb)
  }

  const hourList = [...hours.entries()]
    .map(([hour, v]) => ({ hour, trades: v.trades, wins: v.wins, pnl: Math.round(v.pnl * 100) / 100 }))
    .sort((a, b) => a.hour - b.hour)

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekdayList = weekdays.map((w, i) => ({
    day: i,
    label: weekdayLabels[i],
    trades: w.trades,
    wins: w.wins,
    pnl: Math.round(w.pnl * 100) / 100,
    winRate: w.trades > 0 ? Math.round((w.wins / w.trades) * 100) : 0,
  }))

  const sessionList = [...sessions.entries()]
    .map(([session, v]) => ({ session, trades: v.trades, wins: v.wins, pnl: Math.round(v.pnl * 100) / 100 }))
    .sort((a, b) => b.trades - a.trades)

  return { hours: hourList, sessions: sessionList, weekdays: weekdayList }
}

const MISTAKE_KEYWORDS = [
  'revenge', 'fomo', 'early', 'late', 'chase', 'overtrade', 'overtrading', 'no plan', 'rushed',
  'slippage', 'hesitated', 'averaged', 'ignored', 'moved stop', 'over leverage', 'over-leverage',
  'impulse', 'news', 'scaled in', 'didn\'t wait',
]

function parseChecklist(data: unknown): Array<{ name: string; done: boolean }> | null {
  if (!Array.isArray(data)) return null
  const items: Array<{ name: string; done: boolean }> = []
  for (const raw of data) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const o = raw as Record<string, unknown>
    const name = String(o.text ?? o.name ?? o.label ?? '').trim()
    if (!name) continue
    items.push({ name, done: Boolean(o.done ?? o.checked ?? o.completed) })
  }
  return items.length > 0 ? items : null
}

export async function getBehavior(userId: string, accountId?: string) {
  const trades = await getCompletedTrades(userId, accountId, {
    mistakes: true,
    lesson: true,
    emotion: true,
    confidence: true,
    executionRating: true,
    patienceRating: true,
    disciplineRating: true,
    checklistData: true,
    session: true,
    _count: { select: { images: true } },
  })

  const streaks: Array<{ type: 'win' | 'loss'; count: number; start: string; end: string }> = []
  const resolved = trades.filter((t) => t.result === 'WIN' || t.result === 'LOSS')
  if (resolved.length > 0) {
    let cur: 'win' | 'loss' = resolved[0].result === 'WIN' ? 'win' : 'loss'
    let count = 0
    let start = resolved[0].dayKey || ''
    let lastDate = start
    for (let i = 0; i < resolved.length; i++) {
      const t = resolved[i]
      const date = t.dayKey || lastDate
      const type = t.result === 'WIN' ? 'win' : 'loss'
      if (type === cur) {
        count++
      } else {
        if (count > 0) streaks.push({ type: cur, count, start, end: lastDate })
        cur = type
        count = 1
        start = date
      }
      lastDate = date
    }
    if (count > 0) streaks.push({ type: cur, count, start, end: lastDate })
  }

  const winners = trades.filter((t) => t.result === 'WIN' && t.entryPrice && t.exitPrice)
  const losers = trades.filter((t) => t.result === 'LOSS' && t.entryPrice && t.exitPrice)
  const winPnl = winners.map((t) => computePnl(t))
  const lossPnl = losers.map((t) => computePnl(t))
  const avgWin = winPnl.length > 0 ? Math.round((winPnl.reduce((a, b) => a + b, 0) / winPnl.length) * 100) / 100 : null
  const avgLoss = lossPnl.length > 0 ? Math.round((lossPnl.reduce((a, b) => a + b, 0) / lossPnl.length) * 100) / 100 : null

  const screenshotsByWeek = new Map<string, number>()
  let screenshots = 0
  let withScreenshots = 0
  for (const t of trades) {
    const n = (t as any)._count?.images ?? 0
    screenshots += n
    if (n > 0) withScreenshots++
    if (t.entryTime) {
      const key = mondayKey(new Date(t.entryTime))
      screenshotsByWeek.set(key, (screenshotsByWeek.get(key) || 0) + n)
    }
  }
  const screenshotWeeks = [...screenshotsByWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, count]) => ({ week, count }))

  const keywordCounts = new Map<string, number>()
  for (const t of trades) {
    if (!t.mistakes) continue
    const text = t.mistakes.toLowerCase()
    for (const kw of MISTAKE_KEYWORDS) {
      const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const matches = text.match(re)
      if (matches) keywordCounts.set(kw, (keywordCounts.get(kw) || 0) + matches.length)
    }
  }
  const mistakeKeywords = [...keywordCounts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)

  const checklistItems = new Map<string, { done: number; missed: number }>()
  let checklistTotal = 0
  let checklistDone = 0
  for (const t of trades) {
    const items = parseChecklist(t.checklistData)
    if (!items) continue
    for (const it of items) {
      const agg = checklistItems.get(it.name) ?? { done: 0, missed: 0 }
      if (it.done) agg.done++
      else agg.missed++
      checklistItems.set(it.name, agg)
      checklistTotal++
      if (it.done) checklistDone++
    }
  }
  const checklistPerformance = [...checklistItems.entries()]
    .map(([name, agg]) => ({ name, done: agg.done, missed: agg.missed, rate: Math.round((agg.done / (agg.done + agg.missed)) * 100) }))
    .sort((a, b) => b.missed - a.missed)

  const setupMap = new Map<string, { trades: number; wins: number; pnl: number }>()
  for (const t of trades) {
    if (!t.setup) continue
    const s = setupMap.get(t.setup) ?? { trades: 0, wins: 0, pnl: 0 }
    s.trades++
    if (t.result === 'WIN') s.wins++
    s.pnl += computePnl(t)
    setupMap.set(t.setup, s)
  }
  const setupPerformance = [...setupMap.entries()]
    .map(([setup, v]) => ({ setup, trades: v.trades, wins: v.wins, winRate: Math.round((v.wins / v.trades) * 100), pnl: Math.round(v.pnl * 100) / 100 }))
    .sort((a, b) => b.pnl - a.pnl)

  const emotions = new Map<string, number>()
  const confs: number[] = [], execs: number[] = [], pats: number[] = [], discs: number[] = []
  const psychPoints: Array<{ date: string; score: number }> = []
  const qualityPoints: Array<{ date: string; score: number; result: string | null }> = []

  const avg = (arr: number[]) => (arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null)
  const score = (...vals: Array<number | null | undefined>) => {
    const present = vals.filter((v): v is number => v != null)
    if (present.length === 0) return null
    return present.reduce((a, b) => a + b, 0) / present.length
  }

  for (const t of trades) {
    if (t.emotion) emotions.set(t.emotion, (emotions.get(t.emotion) || 0) + 1)
    if (t.confidence != null) confs.push(t.confidence)
    if (t.executionRating != null) execs.push(t.executionRating)
    if (t.patienceRating != null) pats.push(t.patienceRating)
    if (t.disciplineRating != null) discs.push(t.disciplineRating)

    const hasPsych = t.executionRating != null || t.patienceRating != null || t.disciplineRating != null || t.confidence != null
    const d = score(t.executionRating, t.patienceRating, t.disciplineRating)
    const c = t.confidence != null ? t.confidence / 10 : null
    const resultWeight = t.result === 'WIN' ? 30 : t.result === 'BREAK_EVEN' ? 15 : 0

    if (t.dayKey) {
      const date = t.dayKey
      if (hasPsych) {
        const psychScore = Math.round((d != null ? 40 * (d / 5) : 0) + (c != null ? 20 * c : 0))
        psychPoints.push({ date, score: Math.min(100, Math.max(0, psychScore)) })
      }
      const q = (d != null ? 40 * (d / 5) : 0) + (c != null ? 20 * c : 0) + resultWeight
      qualityPoints.push({ date, score: Math.min(100, Math.max(0, Math.round(q))), result: t.result })
    }
  }

  const qualityAvg = qualityPoints.length > 0
    ? Math.round((qualityPoints.reduce((a, b) => a + b.score, 0) / qualityPoints.length) * 10) / 10
    : null

  return {
    streaks,
    avgWinVsLoss: { avgWin, avgLoss, winCount: winPnl.length, lossCount: lossPnl.length },
    screenshots: { total: screenshots, tradesWithScreenshots: withScreenshots, weeks: screenshotWeeks },
    mistakes: { total: mistakeKeywords.reduce((a, b) => a + b.count, 0), keywords: mistakeKeywords },
    checklists: { completionRate: checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : null, items: checklistPerformance },
    setups: setupPerformance,
    psychology: {
      emotions: [...emotions.entries()].map(([emotion, count]) => ({ emotion, count })).sort((a, b) => b.count - a.count),
      averages: { confidence: avg(confs), execution: avg(execs), patience: avg(pats), discipline: avg(discs) },
      points: psychPoints,
    },
    quality: { avg: qualityAvg, points: qualityPoints },
  }
}

export async function getTrends(userId: string, accountId?: string) {
  const trades = await getCompletedTrades(userId, accountId)

  const weekMap = new Map<string, { start: string; trades: number; wins: number }>()
  const monthMap = new Map<string, { pnl: number; trades: number; wins: number }>()
  for (const t of trades) {
    if (!t.dayKey) continue
    const date = new Date(t.dayKey + 'T12:00:00')
    const wk = mondayKey(date)
    const w = weekMap.get(wk) ?? { start: wk, trades: 0, wins: 0 }
    w.trades++
    if (t.result === 'WIN') w.wins++
    weekMap.set(wk, w)

    const mk = t.dayKey.slice(0, 7)
    const m = monthMap.get(mk) ?? { pnl: 0, trades: 0, wins: 0 }
    m.trades++
    if (t.result === 'WIN') m.wins++
    m.pnl += computePnl(t)
    monthMap.set(mk, m)
  }

  const weekly = [...weekMap.values()]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((w) => ({ start: w.start, trades: w.trades, wins: w.wins, winRate: Math.round((w.wins / w.trades) * 100) }))

  const monthly = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, pnl: Math.round(v.pnl * 100) / 100, trades: v.trades, wins: v.wins }))

  return { weekly, monthly }
}