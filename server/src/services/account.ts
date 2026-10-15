import { prisma } from '../lib/prisma.js'
import { getUserPlan } from './subscription.js'
import { reconcileAccount, phaseName, type DrawdownType, type DllBreach, type TrailingLock, type ManualEvent } from './accountEngine.js'
import { nowNYKey } from '../utils/nykTime.js'

interface RuleRow {
  label: string
  value: string
}

interface FirmPrice {
  size: string
  price: number
  discounted: number
  evalRules?: RuleRow[]
  fundedRules?: RuleRow[]
}

interface FirmPlan {
  plan: string
  planDesc?: string
  sizes: FirmPrice[]
}

const PHASE_INDEX: Record<string, number> = { PHASE1: 0, PHASE2: 1, PHASE3: 2, FUNDED: 3 }

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function parseAccountSizeFromName(sizeName: string): number {
  const s = sizeName.trim().toUpperCase()
  const m = s.match(/(\d+(?:\.\d+)?)\s*M\b/)
  if (m) return Math.round(parseFloat(m[1]) * 1000000)
  const k = s.match(/(\d+(?:\.\d+)?)\s*K\b/)
  if (k) return Math.round(parseFloat(k[1]) * 1000)
  const raw = s.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/)
  if (raw) return Math.round(parseFloat(raw[1].replace(/,/g, '')))
  return 0
}

function parseTarget(raw: string | null | undefined, accountSize: number): number | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s || /^none$/i.test(s)) return null
  // compound rules like "2% daily trailing / 5% overall trailing" -> prefer the overall value
  const overall = s.match(/([\d.]+)\s*%\s*(?:\([^)]*\)\s*)?overall/i) || s.match(/overall[^%]*?([\d.]+)\s*%/i)
  if (overall) return round2(accountSize * (parseFloat(overall[1]) / 100))
  const overallMoney = s.match(/\$\s*([\d,]+(?:\.\d+)?)\s*overall/i)
  if (overallMoney) return round2(parseFloat(overallMoney[1].replace(/,/g, '')))
  const pct = s.match(/(-?\d+(?:\.\d+)?)\s*%/)
  if (pct) return round2(accountSize * (parseFloat(pct[1]) / 100))
  const money = s.match(/\$\s*(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?)/)
  if (money) return round2(parseFloat(money[1].replace(/,/g, '')))
  return null
}

function detectDrawdownType(marketType: string, evalRules: RuleRow[] | undefined, maxTotalDrawdown: number): DrawdownType {
  if (!maxTotalDrawdown) return 'STATIC'
  const rules = evalRules || []
  for (const r of rules) {
    const label = r.label.toLowerCase()
    if (!/max loss|max drawdown|max total|overall loss/.test(label)) continue
    const v = r.value.toLowerCase()
    if (v.includes('eod trailing')) return 'EOD_TRAILING'
    if (v.includes('trailing')) return 'TRAILING'
    if (v.includes('static')) return 'STATIC'
  }
  return marketType === 'FUTURES' ? 'EOD_TRAILING' : 'STATIC'
}

function detectTrailingLock(evalRules: RuleRow[] | undefined, drawdownType: DrawdownType): TrailingLock {
  if (drawdownType === 'STATIC') return 'NONE'
  const rules = evalRules || []
  for (const r of rules) {
    const v = r.value.toLowerCase()
    if (v.includes('safety net') || v.includes('start + $100') || v.includes('starting balance + $100')) return 'START_PLUS_100'
    if (v.includes('locks to balance') || v.includes('locks at starting')) return 'START'
  }
  return 'START'
}

function extractPhaseModel(marketType: string, evalRules: RuleRow[] | undefined, accountSize: number) {
  const rules = evalRules || []
  const findVal = (...keywords: string[]) => {
    for (const kw of keywords) {
      const hit = rules.find((r) => r.label.toLowerCase().includes(kw))
      if (hit) return hit.value
    }
    return undefined
  }

  const stepPattern = /^step\s*(\d+)\s*target/i
  const stepRules = rules
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => stepPattern.test(r.label.trim()))
    .sort((a, b) => {
      const na = parseInt(a.r.label.match(stepPattern)?.[1] || '0', 10)
      const nb = parseInt(b.r.label.match(stepPattern)?.[1] || '0', 10)
      return na - nb
    })

  let planSteps: number
  let phaseTargets: number[]
  if (stepRules.length > 0) {
    planSteps = stepRules.length
    phaseTargets = stepRules
      .map(({ r }) => parseTarget(r.value, accountSize))
      .filter((v): v is number => v !== null)
  } else {
    const profit = parseTarget(findVal('profit target'), accountSize)
    planSteps = 1
    phaseTargets = profit !== null ? [profit] : []
  }
  if (phaseTargets.length === 0) {
    planSteps = 1
    phaseTargets = [0]
  }

  const maxTotalDrawdown = parseTarget(findVal('max loss', 'max drawdown', 'max total', 'overall loss'), accountSize) || 0
  const maxDailyDrawdown = parseTarget(findVal('daily loss limit', 'daily loss'), accountSize) || 0
  const drawdownType = detectDrawdownType(marketType, evalRules, maxTotalDrawdown)
  const trailingLock = detectTrailingLock(evalRules, drawdownType)
  const dllBreach: DllBreach = marketType === 'FUTURES' ? 'PAUSE' : 'FAIL'
  const dailyLossSoft = findVal('daily loss limit', 'daily loss')?.toLowerCase() || ''
  const effectiveDllBreach: DllBreach = /pause|soft/.test(dailyLossSoft)
    ? 'PAUSE'
    : /hard|fail/.test(dailyLossSoft)
      ? 'FAIL'
      : dllBreach

  return { planSteps, phaseTargets, maxTotalDrawdown, maxDailyDrawdown, drawdownType, trailingLock, dllBreach: effectiveDllBreach }
}

export interface PropFirmSnapshot {
  propFirmId: string
  defaultValues: Record<string, unknown>
  accountSize: number
  planSteps: number
}

export async function resolvePropFirmSnapshot(input: {
  propFirmId: string
  planName?: string
  sizeName?: string
  startingBalance?: number
}): Promise<PropFirmSnapshot> {
  const firm = await prisma.propFirm.findUnique({ where: { id: input.propFirmId } })
  if (!firm) throw new Error('Prop firm not found')

  const prices = (firm.accountPrices || []) as unknown as FirmPlan[]
  const selectedPlan = prices.find((p) => p.plan === input.planName) || prices[0]
  const selectedSize = selectedPlan?.sizes.find((s) => s.size === input.sizeName) || selectedPlan?.sizes[0]
  if (!selectedPlan || !selectedSize) throw new Error('Selected plan or size not found for this prop firm')

  const accountSize = parseAccountSizeFromName(selectedSize.size)
  if (!accountSize) throw new Error('Could not determine account size from size name')
  const { planSteps, phaseTargets, maxTotalDrawdown, maxDailyDrawdown, drawdownType, trailingLock, dllBreach } = extractPhaseModel(firm.instruments, selectedSize.evalRules, accountSize)
  const startingBalance = input.startingBalance !== undefined && Number(input.startingBalance) > 0
    ? Number(input.startingBalance)
    : accountSize

  const defaultValues: Record<string, unknown> = {
    firmSlug: firm.slug,
    firmName: firm.name,
    firmColor: firm.logoColor,
    planName: selectedPlan.plan,
    sizeName: selectedSize.size,
    marketType: firm.instruments,
    accountSize,
    startingBalance,
    currentAccountSize: startingBalance,
    planSteps,
    phaseTargets,
    phaseIndex: 0,
    phaseStartBalance: startingBalance,
    maxTotalDrawdown,
    maxDailyDrawdown,
    drawdownType,
    trailingLock,
    dllBreach,
    targetProfit: phaseTargets[0] ?? 0,
    profitSplit: firm.profitSplit,
    payoutSchedule: firm.payoutSpeed,
    evalRules: selectedSize.evalRules || [],
    fundedRules: selectedSize.fundedRules || [],
    payouts: [],
    manualEvents: [],
  }

  return { propFirmId: firm.id, defaultValues, accountSize, planSteps }
}

export interface ChallengeInput {
  marketType?: string
  startingPhase?: string
  phaseTargets?: number[]
  maxTotalDrawdown?: number
  maxDailyDrawdown?: number
  drawdownType?: string
  dllBreach?: string
  trailingLock?: string
  fundedPath?: string
}

function mergeChallenge(dv: Record<string, unknown>, challenge: ChallengeInput | undefined) {
  if (!challenge) return
  const valid = (v: unknown): v is number => typeof v === 'number' && isFinite(v)

  if (challenge.marketType === 'FOREX' || challenge.marketType === 'FUTURES') dv.marketType = challenge.marketType
  if (Array.isArray(challenge.phaseTargets)) {
    const targets = challenge.phaseTargets.map(Number)
    if (targets.length > 0) {
      dv.phaseTargets = targets
      dv.planSteps = Math.max(1, targets.length)
      dv.targetProfit = targets[0] ?? 0
    }
  }
  if (valid(challenge.maxTotalDrawdown)) dv.maxTotalDrawdown = round2(challenge.maxTotalDrawdown)
  if (valid(challenge.maxDailyDrawdown)) dv.maxDailyDrawdown = round2(challenge.maxDailyDrawdown)
  if (['STATIC', 'TRAILING', 'EOD_TRAILING'].includes(challenge.drawdownType || '')) dv.drawdownType = challenge.drawdownType
  if (challenge.dllBreach === 'PAUSE' || challenge.dllBreach === 'FAIL') dv.dllBreach = challenge.dllBreach
  if (['START', 'START_PLUS_100', 'NONE'].includes(challenge.trailingLock || '')) dv.trailingLock = challenge.trailingLock
  if (typeof challenge.fundedPath === 'string' && ['flex', 'daily'].includes(challenge.fundedPath)) dv.fundedPath = challenge.fundedPath
}

function resolveStartPhase(dv: Record<string, unknown>, startingPhase?: string): number {
  if (!startingPhase) return 0
  if (startingPhase === 'FUNDED') return Number(dv.planSteps) || 1
  const idx = PHASE_INDEX[startingPhase]
  if (idx === undefined) return 0
  return Math.min(idx, Number(dv.planSteps) || 1)
}

export async function createAccount(userId: string, data: {
  name: string
  description?: string
  type?: string
  propFirmId?: string
  planName?: string
  sizeName?: string
  startingBalance?: number
  currentBalance?: number
  defaultValues?: Record<string, unknown>
  challenge?: ChallengeInput
}) {
  const plan = await getUserPlan(userId)
  if (plan.plan.accountLimit !== null) {
    const count = await prisma.account.count({ where: { userId } })
    if (count >= plan.plan.accountLimit) {
      throw new Error(`Free plan allows ${plan.plan.accountLimit} accounts. Delete an account or upgrade to Pro.`)
    }
  }

  const type = (data.type || 'JOURNAL') as never
  const dv: Record<string, unknown> = { ...(data.defaultValues || {}) }
  let propFirmId: string | null = null

  if (type === 'PROP_FIRM' && data.propFirmId) {
    const snapshot = await resolvePropFirmSnapshot({
      propFirmId: data.propFirmId,
      planName: data.planName,
      sizeName: data.sizeName,
    })
    Object.assign(dv, snapshot.defaultValues)
    propFirmId = snapshot.propFirmId
  } else if (type === 'PROP_FIRM') {
    const startingBalance = data.startingBalance !== undefined && Number(data.startingBalance) > 0
      ? Number(data.startingBalance)
      : (Number(dv.accountSize) || 0)
    const currentBalance = data.currentBalance !== undefined && Number(data.currentBalance) > 0
      ? Number(data.currentBalance)
      : startingBalance
    Object.assign(dv, {
      accountSize: startingBalance,
      startingBalance,
      currentAccountSize: currentBalance,
      phaseIndex: 0,
      phaseStartBalance: currentBalance,
      planName: data.planName || '',
      sizeName: data.sizeName || '',
      marketType: 'FOREX',
      planSteps: 1,
      phaseTargets: [],
      maxTotalDrawdown: 0,
      maxDailyDrawdown: 0,
      drawdownType: 'STATIC',
      trailingLock: 'NONE',
      dllBreach: 'FAIL',
      targetProfit: 0,
      profitSplit: 0,
      payoutSchedule: '',
      evalRules: [],
      fundedRules: [],
      payouts: [],
      manualEvents: [],
    })
  }

  mergeChallenge(dv, data.challenge)
  const startPhaseIdx = resolveStartPhase(dv, data.challenge?.startingPhase)
  if (type === 'PROP_FIRM') {
    dv.phaseIndex = startPhaseIdx
    dv.startPhaseIndex = startPhaseIdx
  }

  const account = await prisma.account.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      type,
      propFirmId,
      phase: phaseName(startPhaseIdx, Number(dv.planSteps) || 1),
      defaultValues: dv as never,
    },
  })

  if (type === 'PROP_FIRM') {
    await reconcileAccount(userId, account.id)
  }

  return account
}

export async function listAccounts(userId: string) {
  return prisma.account.findMany({
    where: { userId },
    orderBy: [{ isFavorite: 'desc' }, { name: 'asc' }],
  })
}

export async function getAccount(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
  if (!account) throw new Error('Account not found')
  return account
}

export async function updateAccount(userId: string, accountId: string, data: {
  name?: string
  description?: string
  startingBalance?: number
  currentBalance?: number
  propFirmId?: string
  planName?: string
  sizeName?: string
  challenge?: ChallengeInput
}) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
  if (!account) throw new Error('Account not found')

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = String(data.name)
  if (data.description !== undefined) updateData.description = data.description === '' ? null : String(data.description)

  const dv = (account.defaultValues || {}) as Record<string, unknown>

  if (data.propFirmId && data.planName && data.sizeName) {
    const snapshot = await resolvePropFirmSnapshot({
      propFirmId: data.propFirmId,
      planName: data.planName,
      sizeName: data.sizeName,
    })
    const oldSize = Number(dv.accountSize) || 0
    const next: Record<string, unknown> = { ...snapshot.defaultValues }
    if (dv.manualStatus !== undefined) next.manualStatus = dv.manualStatus
    if (Array.isArray(dv.payouts)) next.payouts = dv.payouts
    if (Array.isArray(dv.manualEvents)) next.manualEvents = dv.manualEvents
    if (snapshot.accountSize !== oldSize) {
      next.currentAccountSize = snapshot.accountSize
      next.startingBalance = snapshot.accountSize
      next.phaseIndex = 0
      next.phaseStartBalance = snapshot.accountSize
    } else {
      next.currentAccountSize = Number(dv.currentAccountSize) || snapshot.accountSize
      next.startingBalance = Number(dv.startingBalance) || snapshot.accountSize
      next.phaseIndex = Number(dv.phaseIndex) || 0
      next.phaseStartBalance = Number(dv.phaseStartBalance) || snapshot.accountSize
    }
    Object.assign(dv, next)
    updateData.defaultValues = dv as never
    updateData.propFirmId = snapshot.propFirmId
  }

  if (data.startingBalance !== undefined) {
    const newStart = Number(data.startingBalance)
    if (!isFinite(newStart) || newStart <= 0) throw new Error('Invalid starting balance')
    const oldStart = Number(dv.startingBalance) || Number(dv.accountSize) || 0
    const current = Number(dv.currentAccountSize) || newStart
    dv.startingBalance = newStart
    dv.currentAccountSize = round2(newStart + (current - oldStart))
    updateData.defaultValues = dv as never
  }

  if (data.currentBalance !== undefined) {
    const newCurrent = Number(data.currentBalance)
    if (!isFinite(newCurrent) || newCurrent <= 0) throw new Error('Invalid current balance')
    dv.currentAccountSize = round2(newCurrent)
    updateData.defaultValues = dv as never
  }

  if (data.propFirmId && data.planName && data.sizeName) {
    dv.startPhaseIndex = Number(dv.startPhaseIndex ?? dv.phaseIndex) || 0
  }

  if (data.challenge) {
    mergeChallenge(dv, data.challenge)
    if (data.challenge.startingPhase) {
      dv.phaseIndex = resolveStartPhase(dv, data.challenge.startingPhase)
      dv.startPhaseIndex = dv.phaseIndex
      const size = Number(dv.accountSize) || Number(dv.startingBalance) || 0
      dv.phaseStartBalance = size
    }
    updateData.defaultValues = dv as never
  }

  if (Object.keys(updateData).length === 0) return account
  const updated = await prisma.account.update({ where: { id: accountId }, data: updateData as never })

  if (account.type === 'PROP_FIRM' || updated.type === 'PROP_FIRM') {
    await reconcileAccount(userId, accountId)
  }

  return updated
}

export async function deleteAccount(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
  if (!account) throw new Error('Account not found')
  await prisma.account.delete({ where: { id: accountId } })
}

export async function batchDeleteAccounts(userId: string, accountIds: string[]) {
  const accounts = await prisma.account.findMany({
    where: { id: { in: accountIds }, userId },
    select: { id: true },
  })
  if (accounts.length !== accountIds.length) throw new Error('Some accounts not found')
  await prisma.account.deleteMany({ where: { id: { in: accountIds }, userId } })
}

export async function toggleFavorite(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
  if (!account) throw new Error('Account not found')
  return prisma.account.update({
    where: { id: accountId },
    data: { isFavorite: !account.isFavorite },
  })
}

export async function resetAccount(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
  if (!account) throw new Error('Account not found')
  if (account.type !== 'PROP_FIRM') throw new Error('Only prop firm accounts can be reset')

  const dv = shallowDv(account.defaultValues)
  const accountSize = Number(dv.accountSize) || Number(dv.startingBalance) || 0
  const planSteps = Math.max(1, Number(dv.planSteps) || 1)
  const manualEvents = Array.isArray(dv.manualEvents) ? (dv.manualEvents as ManualEvent[]) : []
  manualEvents.push({
    type: 'RESET',
    title: 'Challenge reset',
    message: 'Account restarted fresh at Phase 1',
    balance: accountSize,
    createdAt: new Date().toISOString(),
  })

  dv.phaseIndex = 0
  dv.phaseStartBalance = accountSize
  dv.currentAccountSize = accountSize
  dv.manualEvents = manualEvents
  delete dv.manualStatus

  await prisma.account.update({
    where: { id: accountId },
    data: {
      phase: phaseName(0, planSteps),
      status: 'ACTIVE',
      pausedUntil: null,
      defaultValues: dv as never,
    },
  })

  await reconcileAccount(userId, accountId)
  return prisma.account.findFirst({ where: { id: accountId, userId } })
}

function shallowDv(defaultValues: unknown): Record<string, unknown> {
  return { ...((defaultValues || {}) as Record<string, unknown>) }
}

export async function getAllProgressStatuses(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { userId, type: 'PROP_FIRM' },
    select: { id: true },
  })
  if (accounts.length === 0) return {}

  const statusMap: Record<string, string> = {}
  for (const account of accounts) {
    const outcome = await reconcileAccount(userId, account.id)
    statusMap[account.id] = outcome?.status || 'ACTIVE'
  }
  return statusMap
}

export async function getChallengeProgress(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
  if (!account) throw new Error('Account not found')

  const outcome = await reconcileAccount(userId, accountId)

  const fresh = await prisma.account.findFirst({ where: { id: accountId, userId } })
  if (!fresh) throw new Error('Account not found')
  const dv = (fresh.defaultValues || {}) as Record<string, unknown>

  const manualStatus = dv.manualStatus as string | undefined
  if (manualStatus === 'PASSED' || manualStatus === 'FAILED' || manualStatus === 'FUNDED') {
    return {
      tradesCount: 0,
      totalPnl: 0,
      peakPnl: 0,
      maxDrawdown: 0,
      winningTrades: 0,
      losingTrades: 0,
      status: manualStatus === 'FAILED' ? 'FAILED' : 'ACTIVE',
      phase: manualStatus === 'FAILED' ? fresh.phase : manualStatus === 'FUNDED' ? 'FUNDED' : fresh.phase,
      planSteps: Number(dv.planSteps) || 1,
      phaseTargets: (dv.phaseTargets as number[]) || [],
      nextTarget: null,
      isFunded: manualStatus !== 'FAILED',
      totalPayouts: 0,
      dailyData: [],
      manualOverride: true,
      drawdownType: (dv.drawdownType as string) || 'STATIC',
      dllBreach: (dv.dllBreach as string) || 'FAIL',
      trailingLock: (dv.trailingLock as string) || 'START',
      dailyLossLimit: Number(dv.maxDailyDrawdown) || 0,
      maxTotalDrawdown: Number(dv.maxTotalDrawdown) || 0,
      phases: [],
      phaseIndex: Number(dv.phaseIndex) || 0,
      phaseStartBalance: Number(dv.phaseStartBalance) || Number(dv.accountSize) || 0,
      balance: Number(dv.currentAccountSize) || 0,
      floor: 0,
      lockAmount: 0,
      dayStartBalance: 0,
      dailyPnlToday: 0,
      pausedUntil: null,
      events: [],
      snapshots: [],
    }
  }

  const accountSize = Number(dv.accountSize) || Number(dv.startingBalance) || 0
  const planSteps = Math.max(1, Number(dv.planSteps) || 1)
  const phaseTargets = Array.isArray(dv.phaseTargets)
    ? (dv.phaseTargets as number[]).map(Number)
    : (Number(dv.targetProfit) ? [Number(dv.targetProfit)] : [])
  const phaseIndex = Math.min(Math.max(0, Number(dv.phaseIndex) || 0), planSteps)
  const balance = Number(dv.currentAccountSize) || 0
  const phaseStartBalance = Number(dv.phaseStartBalance) || accountSize
  const maxTotalDrawdown = Number(dv.maxTotalDrawdown) || 0
  const maxDailyDrawdown = Number(dv.maxDailyDrawdown) || 0
  const status = fresh.status
  const target = phaseIndex < planSteps ? (phaseTargets[phaseIndex] || 0) : 0
  const nextTarget = status === 'ACTIVE' && target > 0
    ? round2(Math.max(0, phaseStartBalance + target - balance))
    : null

  const phases = phaseTargets.map((t, i) => ({
    name: phaseName(i, planSteps),
    target: t,
    status: i < phaseIndex ? 'COMPLETED' : (i === phaseIndex ? 'CURRENT' : 'PENDING'),
  }))
  phases.push({
    name: 'FUNDED',
    target: 0,
    status: phaseIndex >= planSteps ? 'CURRENT' : 'PENDING',
  })

  const [snapshots, events] = await Promise.all([
    prisma.accountDaySnapshot.findMany({ where: { accountId }, orderBy: { day: 'asc' } }),
    prisma.accountEvent.findMany({ where: { accountId }, orderBy: { createdAt: 'asc' } }),
  ])

  const dailyData = snapshots.map((s) => ({
    date: s.day,
    startBalance: s.startBalance,
    dailyPnL: s.pnl,
    endBalance: s.endBalance,
    dailyDrawdownBreached: s.breached,
  }))

  const today = nowNYKey()
  const todaySnap = snapshots.find((s) => s.day === today)
  const dayStartBalance = todaySnap ? todaySnap.startBalance : balance
  const dailyPnlToday = todaySnap ? todaySnap.pnl : 0

  const payouts = Array.isArray(dv.payouts) ? (dv.payouts as Array<{ amount: number }>) : []
  const totalPayouts = payouts.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const lockAmount = (dv.trailingLock as string) === 'START_PLUS_100' ? accountSize + 100 : (dv.trailingLock as string) === 'START' ? accountSize : null

  return {
    tradesCount: outcome ? outcome.tradesCount : 0,
    totalPnl: round2(balance - phaseStartBalance),
    peakPnl: round2(Math.max(0, (Number(dv.enginePeak) || phaseStartBalance) - phaseStartBalance)),
    maxDrawdown: outcome ? outcome.maxDrawdown : 0,
    winningTrades: outcome ? outcome.winningTrades : 0,
    losingTrades: outcome ? outcome.losingTrades : 0,
    status,
    phase: fresh.phase,
    planSteps,
    phaseTargets,
    nextTarget,
    isFunded: phaseIndex >= planSteps,
    totalPayouts: round2(totalPayouts),
    dailyData,
    manualOverride: false,
    drawdownType: (dv.drawdownType as string) || 'STATIC',
    dllBreach: (dv.dllBreach as string) || (fresh.type === 'PROP_FIRM' && (dv.marketType as string) === 'FUTURES' ? 'PAUSE' : 'FAIL'),
    trailingLock: (dv.trailingLock as string) || 'START',
    dailyLossLimit: maxDailyDrawdown,
    maxTotalDrawdown,
    phases,
    phaseIndex,
    phaseStartBalance,
    balance,
    floor: Number(dv.engineFloor) || 0,
    lockAmount,
    dayStartBalance,
    dailyPnlToday,
    pausedUntil: fresh.pausedUntil,
    events: events.map((e) => ({
      type: e.type,
      phase: e.phase,
      title: e.title,
      message: e.message,
      balance: e.balance,
      createdAt: e.createdAt,
    })),
    snapshots: snapshots.map((s) => ({
      day: s.day,
      phase: s.phase,
      startBalance: s.startBalance,
      endBalance: s.endBalance,
      pnl: s.pnl,
      peakBalance: s.peakBalance,
      floor: s.floor,
      breached: s.breached,
    })),
  }
}

export async function overrideStatus(userId: string, accountId: string, status: 'PASSED' | 'FAILED' | 'FUNDED' | null) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
  if (!account) throw new Error('Account not found')

  const defaultValues = shallowDv(account.defaultValues)
  const manualEvents = Array.isArray(defaultValues.manualEvents) ? (defaultValues.manualEvents as ManualEvent[]) : []
  const accountSize = Number(defaultValues.accountSize) || Number(defaultValues.startingBalance) || 0
  const planSteps = Math.max(1, Number(defaultValues.planSteps) || 1)
  const fundIdx = planSteps

  if (status === 'PASSED') {
    const nextIdx = Math.min((Number(defaultValues.phaseIndex) || 0) + 1, fundIdx)
    const phase = nextIdx >= fundIdx ? 'FUNDED' : phaseName(nextIdx, fundIdx)
    defaultValues.phaseIndex = nextIdx
    defaultValues.phaseStartBalance = accountSize
    defaultValues.currentAccountSize = accountSize
    defaultValues.manualStatus = 'PASSED'
    manualEvents.push({
      type: nextIdx >= fundIdx ? 'FUNDED' : 'PHASE_COMPLETED',
      title: 'Phase passed (manual)',
      message: `Manually marked passed — moved to ${phase} with a fresh ${accountSize.toLocaleString()} balance`,
      balance: accountSize,
      createdAt: new Date().toISOString(),
    })
    defaultValues.manualEvents = manualEvents
    await prisma.account.update({
      where: { id: accountId },
      data: { defaultValues: defaultValues as never, phase, status: 'ACTIVE', pausedUntil: null },
    })
  } else if (status === 'FUNDED') {
    defaultValues.phaseIndex = fundIdx
    defaultValues.phaseStartBalance = accountSize
    defaultValues.currentAccountSize = accountSize
    defaultValues.manualStatus = 'FUNDED'
    manualEvents.push({
      type: 'FUNDED',
      title: 'Account funded (manual)',
      message: `Manually marked funded — fresh ${accountSize.toLocaleString()} balance`,
      balance: accountSize,
      createdAt: new Date().toISOString(),
    })
    defaultValues.manualEvents = manualEvents
    await prisma.account.update({
      where: { id: accountId },
      data: { defaultValues: defaultValues as never, phase: 'FUNDED', status: 'ACTIVE', pausedUntil: null },
    })
  } else if (status === 'FAILED') {
    defaultValues.manualStatus = 'FAILED'
    manualEvents.push({
      type: 'STATUS_OVERRIDE',
      title: 'Marked as failed (manual)',
      message: 'Drawdown reached or manually marked failed',
      balance: Number(defaultValues.currentAccountSize) || accountSize,
      createdAt: new Date().toISOString(),
    })
    defaultValues.manualEvents = manualEvents
    await prisma.account.update({
      where: { id: accountId },
      data: { defaultValues: defaultValues as never, status: 'FAILED', pausedUntil: null },
    })
  } else {
    delete defaultValues.manualStatus
    const startIdx = Number(defaultValues.startPhaseIndex) || 0
    const phase = startIdx >= fundIdx ? 'FUNDED' : phaseName(startIdx, fundIdx)
    defaultValues.phaseIndex = startIdx
    defaultValues.phaseStartBalance = accountSize
    defaultValues.currentAccountSize = accountSize
    manualEvents.push({
      type: 'STATUS_OVERRIDE',
      title: 'Status override cleared',
      message: 'Back to automatic challenge tracking',
      balance: accountSize,
      createdAt: new Date().toISOString(),
    })
    defaultValues.manualEvents = manualEvents
    await prisma.account.update({
      where: { id: accountId },
      data: { defaultValues: defaultValues as never, phase, status: 'ACTIVE', pausedUntil: null },
    })
  }

  await reconcileAccount(userId, accountId)
  return prisma.account.findFirst({ where: { id: accountId, userId } })
}

export async function addPayout(userId: string, accountId: string, data: { amount?: number; date?: string }) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
  if (!account) throw new Error('Account not found')

  const amount = Number(data.amount)
  if (!isFinite(amount) || amount <= 0) throw new Error('Invalid payout amount')

  const defaultValues = shallowDv(account.defaultValues)
  const payouts = Array.isArray(defaultValues.payouts) ? (defaultValues.payouts as Array<{ amount: number; date?: string }>) : []
  payouts.push({
    amount: round2(amount),
    date: data.date || new Date().toISOString().slice(0, 10),
  })
  defaultValues.payouts = payouts

  await prisma.account.update({
    where: { id: accountId },
    data: { defaultValues: defaultValues as never },
  })

  await reconcileAccount(userId, accountId)
  return prisma.account.findFirst({ where: { id: accountId, userId } })
}

export async function removePayout(userId: string, accountId: string, index: number) {
  const account = await prisma.account.findFirst({ where: { id: accountId, userId } })
  if (!account) throw new Error('Account not found')

  const defaultValues = shallowDv(account.defaultValues)
  const payouts = Array.isArray(defaultValues.payouts) ? (defaultValues.payouts as Array<{ amount: number }>) : []
  const removed = payouts[index]
  if (!removed) throw new Error('Payout not found')

  payouts.splice(index, 1)
  defaultValues.payouts = payouts

  await prisma.account.update({
    where: { id: accountId },
    data: { defaultValues: defaultValues as never },
  })

  await reconcileAccount(userId, accountId)
  return prisma.account.findFirst({ where: { id: accountId, userId } })
}