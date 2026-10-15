import { prisma } from '../lib/prisma.js'
import { nykSessionKey, nykSessionEndUtc, nowNYKey } from '../utils/nykTime.js'

export type DrawdownType = 'STATIC' | 'TRAILING' | 'EOD_TRAILING'
export type DllBreach = 'PAUSE' | 'FAIL'
export type TrailingLock = 'START' | 'START_PLUS_100' | 'NONE'

export interface ManualEvent {
  type: string
  title: string
  message?: string
  balance?: number
  createdAt: string
}

export interface EngineTrade {
  id: string
  entryPrice: number | null
  exitPrice: number | null
  direction: string
  fees: number | null
  result: string | null
  createdAt: Date
  quantity: number | null
  pipSize: number | null
  pipValue: number | null
}

export interface EngineSession {
  day: string
  phase: string
  startBalance: number
  endBalance: number
  pnl: number
  peakBalance: number
  floor: number | null
  breached: boolean
}

export interface EngineEvent {
  type: string
  phase: string | null
  title: string
  message?: string
  balance?: number
  createdAt: Date
}

export interface EngineResult {
  status: string
  phase: string
  phaseIndex: number
  balance: number
  pausedUntil: Date | null
  floor: number | null
  peak: number
  phaseStartBalance: number
  peakPnl: number
  maxDrawdown: number
  winningTrades: number
  losingTrades: number
  tradesCount: number
  totalPnl: number
  sessions: EngineSession[]
  events: EngineEvent[]
}

export function phaseName(index: number, planSteps: number): string {
  return index >= planSteps ? 'FUNDED' : `PHASE${Math.min(index + 1, Math.max(1, planSteps))}`
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function calcTradePnl(t: EngineTrade): number {
  if (!t.entryPrice || !t.exitPrice) return 0
  const rawDiff = t.direction === 'LONG' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice
  const diff = t.pipSize && t.pipSize !== 0 ? rawDiff / t.pipSize : rawDiff
  return diff * (t.pipValue || 1) * (t.quantity || 1) - (t.fees || 0)
}

export interface EngineConfigInput {
  accountSize: number
  phaseTargets: number[]
  planSteps: number
  drawdownType: DrawdownType
  maxTotalDrawdown: number
  maxDailyDrawdown: number
  dllBreach: DllBreach
  trailingLock: TrailingLock
  phaseIndex: number
  manualStatus?: string | null
  payouts: Array<{ amount: number; date?: string }>
  manualEvents: ManualEvent[]
  startingBalance: number
}

export function runAccountEngine(cfg: EngineConfigInput, trades: EngineTrade[], accountCreatedAt: Date): EngineResult {
  const planSteps = Math.max(1, cfg.planSteps || 1)
  const fundIdx = planSteps
  let phaseIndex = Math.min(Math.max(0, Math.floor(Number(cfg.phaseIndex) || 0)), fundIdx)
  let balance = cfg.accountSize
  let phaseStartBalance = balance
  let peak = balance
  let min = balance
  let peakEod = balance
  let worstDip = 0
  let status = 'ACTIVE'
  let pausedUntil: Date | null = null
  let winningTrades = 0
  let losingTrades = 0
  let tradesCount = 0
  let totalPnl = 0

  const sessions: EngineSession[] = []
  const events: EngineEvent[] = [
    { type: 'ACCOUNT_CREATED', phase: phaseName(phaseIndex, fundIdx), title: 'Account created', balance: round2(balance), createdAt: accountCreatedAt },
  ]

  const trailingLockAmount = cfg.trailingLock === 'START_PLUS_100'
    ? cfg.accountSize + 100
    : cfg.trailingLock === 'START'
      ? cfg.accountSize
      : Infinity

  function computeFloor(p: number, eodBase: number): number {
    if (cfg.maxTotalDrawdown <= 0) return Number.NEGATIVE_INFINITY
    if (cfg.drawdownType === 'STATIC') return phaseStartBalance - cfg.maxTotalDrawdown
    const high = cfg.drawdownType === 'EOD_TRAILING' ? eodBase : p
    return Math.min(high - cfg.maxTotalDrawdown, trailingLockAmount)
  }

  let floor = computeFloor(peak, peakEod)

  const tradesByDay: Record<string, EngineTrade[]> = {}
  for (const t of trades) {
    const key = nykSessionKey(t.createdAt)
    if (!tradesByDay[key]) tradesByDay[key] = []
    tradesByDay[key].push(t)
  }
  const days = Object.keys(tradesByDay).sort()

  for (const day of days) {
    const dayTrades = tradesByDay[day]
    if (tradesCount === 0 && status === 'FAILED') break
    const dayStartBalance = balance
    let dayPnl = 0
    let breached = false
    let pauseLogged = false
    let phaseStartedThisDay: string | null = null

    if (status === 'DAILY_PAUSED') {
      status = 'ACTIVE'
      pausedUntil = null
      events.push({
        type: 'PAUSE_RELEASED',
        phase: phaseName(phaseIndex, fundIdx),
        title: 'Daily pause lifted',
        message: `Trading can resume for the ${day} session`,
        balance: round2(balance),
        createdAt: nykSessionEndUtc(day),
      })
    }

    for (const t of dayTrades) {
      if (status === 'FAILED') break
      if (status === 'DAILY_PAUSED') {
        if (!pauseLogged) {
          pauseLogged = true
          events.push({
            type: 'TRADE_DURING_PAUSE',
            phase: phaseName(phaseIndex, fundIdx),
            title: 'Trade logged during pause',
            message: `Journaled ${dayTrades.length} trade(s) while the account was paused — excluded from state`,
            createdAt: t.createdAt,
          })
        }
        continue
      }

      const pnl = calcTradePnl(t)
      balance = round2(balance + pnl)
      dayPnl = round2(dayPnl + pnl)
      totalPnl = round2(totalPnl + pnl)
      tradesCount++
      if (t.result === 'WIN') winningTrades++
      if (t.result === 'LOSS') losingTrades++

      if (balance <= floor && cfg.maxTotalDrawdown > 0) {
        status = 'FAILED'
        breached = true
        events.push({
          type: 'HARD_BREACH',
          phase: phaseName(phaseIndex, fundIdx),
          title: 'Max loss reached',
          message: `Balance touched the ${cfg.drawdownType === 'STATIC' ? 'static' : 'trailing'} floor of $${floor.toLocaleString()}`,
          balance: round2(balance),
          createdAt: t.createdAt,
        })
        break
      }

      if (cfg.maxDailyDrawdown > 0 && dayPnl <= -cfg.maxDailyDrawdown) {
        if (cfg.dllBreach === 'PAUSE') {
          status = 'DAILY_PAUSED'
          pausedUntil = nykSessionEndUtc(day)
          breached = true
          events.push({
            type: 'DAILY_PAUSED',
            phase: phaseName(phaseIndex, fundIdx),
            title: 'Daily loss limit hit',
            message: `Lost $${Math.abs(dayPnl).toLocaleString()} today — trading paused until rollover, account is not failed`,
            balance: round2(balance),
            createdAt: t.createdAt,
          })
        } else {
          status = 'FAILED'
          breached = true
          events.push({
            type: 'HARD_BREACH',
            phase: phaseName(phaseIndex, fundIdx),
            title: 'Daily loss limit exceeded',
            message: `Lost $${Math.abs(dayPnl).toLocaleString()} in a single session`,
            balance: round2(balance),
            createdAt: t.createdAt,
          })
          break
        }
      }

      if (balance > peak) {
        peak = balance
        if (cfg.drawdownType === 'TRAILING') floor = computeFloor(peak, peakEod)
      }
      if (balance < min) min = balance
      if (peak - min > worstDip) worstDip = peak - min
    }

    if (status !== 'FAILED' && status !== 'DAILY_PAUSED' && cfg.drawdownType === 'EOD_TRAILING' && balance > peakEod) {
      peakEod = balance
      floor = computeFloor(peak, peakEod)
    }

    sessions.push({
      day,
      phase: phaseName(phaseIndex, fundIdx),
      startBalance: round2(dayStartBalance),
      endBalance: round2(balance),
      pnl: round2(dayPnl),
      peakBalance: round2(peak),
      floor: Number.isFinite(floor) ? round2(floor) : null,
      breached,
    })

    if (status === 'FAILED') break

    if (phaseIndex < planSteps) {
      const target = Number(cfg.phaseTargets[phaseIndex]) || 0
      const targetBalance = phaseStartBalance + target
      if (target > 0 && balance >= targetBalance) {
        const completedPhase = phaseName(phaseIndex, fundIdx)
        if (phaseIndex + 1 >= planSteps) {
          phaseIndex = fundIdx
          events.push({
            type: 'FUNDED',
            phase: 'FUNDED',
            title: 'Account funded',
            message: `${completedPhase} completed — account is now funded with a fresh $${cfg.accountSize.toLocaleString()} balance`,
            balance: round2(cfg.accountSize),
            createdAt: nykSessionEndUtc(day),
          })
        } else {
          phaseIndex = phaseIndex + 1
          events.push({
            type: 'PHASE_COMPLETED',
            phase: phaseName(phaseIndex, fundIdx),
            title: `${completedPhase} completed`,
            message: `Moving to ${phaseName(phaseIndex, fundIdx)} with a fresh $${cfg.accountSize.toLocaleString()} balance`,
            balance: round2(cfg.accountSize),
            createdAt: nykSessionEndUtc(day),
          })
        }
        phaseStartBalance = cfg.accountSize
        balance = cfg.accountSize
        peak = cfg.accountSize
        min = cfg.accountSize
        peakEod = cfg.accountSize
        floor = computeFloor(peak, peakEod)
        if (status === 'ACTIVE') {
          events.push({
            type: 'PHASE_STARTED',
            phase: phaseName(phaseIndex, fundIdx),
            title: `${phaseName(phaseIndex, fundIdx)} started`,
            balance: round2(balance),
            createdAt: nykSessionEndUtc(day),
          })
        }
      }
    }
  }

  const finalPhase = phaseName(phaseIndex, fundIdx)
  const totalPayouts = cfg.payouts.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const balanceAfterPayouts = round2(Math.max(0, balance - totalPayouts))

  return {
    status,
    phase: finalPhase,
    phaseIndex,
    balance: balanceAfterPayouts,
    pausedUntil,
    floor: Number.isFinite(floor) ? round2(floor) : null,
    peak: round2(Math.max(peak, phaseStartBalance)),
    phaseStartBalance,
    peakPnl: round2(Math.max(0, peak - phaseStartBalance)),
    maxDrawdown: round2(Math.min(worstDip, phaseStartBalance)),
    winningTrades,
    losingTrades,
    tradesCount,
    totalPnl: round2(totalPnl),
    sessions,
    events,
  }
}

export interface ReconcileOutcome {
  status: string
  phase: string
  phaseIndex: number
  balance: number
  tradesCount: number
  winningTrades: number
  losingTrades: number
  maxDrawdown: number
}

export async function reconcileAccount(userId: string, accountId: string): Promise<ReconcileOutcome | null> {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
  if (!account) return null
  if (account.type !== 'PROP_FIRM') return null

  const dv = (account.defaultValues || {}) as Record<string, unknown>
  const accountSize = Number(dv.accountSize) || Number(dv.startingBalance) || Number(dv.currentAccountSize) || 0
  const rawTargets = Array.isArray(dv.phaseTargets) ? (dv.phaseTargets as number[]) : []
  const phaseTargets = rawTargets.length > 0
    ? rawTargets
    : (Number(dv.targetProfit) ? [Number(dv.targetProfit)] : [])
  const planSteps = Math.max(1, Number(dv.planSteps) || phaseTargets.length || 1)
  const marketType = (dv.marketType as string) || 'FOREX'

  const cfg: EngineConfigInput = {
    accountSize,
    startingBalance: Number(dv.startingBalance) || accountSize,
    phaseTargets,
    planSteps,
    drawdownType: ['STATIC', 'TRAILING', 'EOD_TRAILING'].includes(dv.drawdownType as string)
      ? (dv.drawdownType as DrawdownType)
      : marketType === 'FUTURES'
        ? 'EOD_TRAILING'
        : 'STATIC',
    maxTotalDrawdown: Number(dv.maxTotalDrawdown) || 0,
    maxDailyDrawdown: Number(dv.maxDailyDrawdown) || 0,
    dllBreach: dv.dllBreach === 'FAIL' ? 'FAIL' : dv.dllBreach === 'PAUSE' ? 'PAUSE' : (marketType === 'FUTURES' ? 'PAUSE' : 'FAIL'),
    trailingLock: ['START', 'START_PLUS_100', 'NONE'].includes(dv.trailingLock as string)
      ? (dv.trailingLock as TrailingLock)
      : 'START',
    phaseIndex: Number(dv.startPhaseIndex ?? dv.phaseIndex) || 0,
    manualStatus: (dv.manualStatus as string) || null,
    payouts: Array.isArray(dv.payouts)
      ? (dv.payouts as Array<{ amount: number; date?: string }>)
      : [],
    manualEvents: Array.isArray(dv.manualEvents)
      ? (dv.manualEvents as ManualEvent[])
      : [],
  }

  const trades = await prisma.trade.findMany({
    where: { userId, accountId, isDeleted: false, status: 'COMPLETED' },
    select: {
      id: true,
      entryPrice: true,
      exitPrice: true,
      direction: true,
      fees: true,
      result: true,
      createdAt: true,
      quantity: true,
      pipSize: true,
      pipValue: true,
    },
    orderBy: { createdAt: 'asc' },
  }) as unknown as EngineTrade[]

  if (cfg.accountSize <= 0 || (cfg.manualStatus && ['PASSED', 'FAILED', 'FUNDED'].includes(cfg.manualStatus))) {
    if (!cfg.manualStatus) {
      return { status: 'ACTIVE', phase: account.phase, phaseIndex: cfg.phaseIndex, balance: Number(dv.currentAccountSize) || 0, tradesCount: 0, winningTrades: 0, losingTrades: 0, maxDrawdown: 0 }
    }
    const status = cfg.manualStatus === 'FAILED' ? 'FAILED' : 'ACTIVE'
    const phase = cfg.manualStatus === 'FAILED'
      ? account.phase
      : cfg.manualStatus === 'FUNDED'
        ? 'FUNDED'
        : account.phase
    const balance = Number(dv.currentAccountSize) || Number(dv.startingBalance) || accountSize
    const mv = { ...dv, currentAccountSize: balance }
    const updateData: Record<string, unknown> = { status, phase, pausedUntil: null, defaultValues: mv as never }
    await prisma.account.update({ where: { id: accountId }, data: updateData as never })
    return { status, phase, phaseIndex: Number(dv.phaseIndex) || 0, balance, tradesCount: trades.length, winningTrades: 0, losingTrades: 0, maxDrawdown: 0 }
  }

  const result = runAccountEngine(cfg, trades, account.createdAt)

  let status = result.status
  let pausedUntil = result.pausedUntil
  if (status === 'DAILY_PAUSED' && result.sessions.length > 0) {
    const lastDay = result.sessions[result.sessions.length - 1].day
    if (nowNYKey() > lastDay) {
      status = 'ACTIVE'
      pausedUntil = null
      result.events.push({
        type: 'PAUSE_RELEASED',
        phase: result.phase,
        title: 'Daily pause lifted',
        message: 'The daily pause has expired — trading resumed at the last session rollover',
        balance: result.balance,
        createdAt: nykSessionEndUtc(lastDay),
      })
    }
  }

  const eventRows: Array<{ accountId: string; type: string; phase: string | null; title: string; message?: string; balance: number | null; createdAt: Date }> = result.events.map((e) => ({ accountId, type: e.type, phase: e.phase, title: e.title, message: e.message, balance: e.balance ?? null, createdAt: e.createdAt }))
  for (const p of cfg.payouts) {
    eventRows.push({
      accountId,
      type: 'PAYOUT',
      phase: 'FUNDED',
      title: 'Payout',
      message: `$${(Number(p.amount) || 0).toLocaleString()}`,
      balance: null,
      createdAt: new Date(p.date || new Date()),
    })
  }
  for (const me of cfg.manualEvents) {
    eventRows.push({
      accountId,
      type: me.type,
      phase: 'FUNDED',
      title: me.title,
      message: me.message,
      balance: me.balance ?? null,
      createdAt: new Date(me.createdAt),
    })
  }

  await prisma.$transaction([
    prisma.accountEvent.deleteMany({ where: { accountId } }),
    prisma.accountDaySnapshot.deleteMany({ where: { accountId } }),
    prisma.account.update({
      where: { id: accountId },
      data: {
        status,
        phase: result.phase,
        pausedUntil: status === 'DAILY_PAUSED' ? pausedUntil : null,
        defaultValues: {
          ...dv,
          currentAccountSize: result.balance > 0 ? result.balance : (Number(dv.startingBalance) || accountSize),
          phaseIndex: result.phaseIndex,
          phaseStartBalance: result.phaseStartBalance,
          enginePeak: result.peak,
          engineFloor: result.floor,
          drawdownType: cfg.drawdownType,
          dllBreach: cfg.dllBreach,
          trailingLock: cfg.trailingLock,
        } as never,
      },
    }),
  ])

  if (eventRows.length > 0) {
    await prisma.accountEvent.createMany({ data: eventRows })
  }
  if (result.sessions.length > 0) {
    await prisma.accountDaySnapshot.createMany({
      data: result.sessions.map((s) => ({
        accountId,
        day: s.day,
        phase: s.phase,
        startBalance: s.startBalance,
        endBalance: s.endBalance,
        pnl: s.pnl,
        peakBalance: s.peakBalance,
        floor: s.floor,
        breached: s.breached,
        endedAt: nykSessionEndUtc(s.day),
      })),
    })
  }

  return { status, phase: result.phase, phaseIndex: result.phaseIndex, balance: result.balance, tradesCount: result.tradesCount, winningTrades: result.winningTrades, losingTrades: result.losingTrades, maxDrawdown: result.maxDrawdown }
}
