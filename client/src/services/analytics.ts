import api from './api'

export interface MiniTrade {
  id: string
  instrument: string
  result: string | null
  pnl: number
}

export interface MonthDaySummary {
  date: string
  pnl: number
  trades: number
  wins: number
  losses: number
  breakEvens: number
  bestSetup: string | null
  tradeIds: MiniTrade[]
}

export interface WeekSummary {
  label: string
  start: string
  pnl: number
  trades: number
}

export interface MonthSummary {
  month: {
    year: number
    month: number
    pnl: number
    tradingDays: number
    totalTrades: number
    wins: number
    losses: number
    avgDailyPnl: number | null
    avgRR: number | null
    currentStreak: { type: 'win' | 'loss' | null; count: number }
  }
  days: MonthDaySummary[]
  weeks: WeekSummary[]
  bestWeek: WeekSummary | null
  worstWeek: WeekSummary | null
}

export async function getMonthSummary(year: number, month: number, accountId?: string): Promise<MonthSummary> {
  const { data } = await api.get('/analytics/month-summary', { params: { year, month, accountId } })
  return data.data
}

export interface TimelinePoint {
  date: string
  trades: number
  wins: number
  pnl: number
  equity: number
  drawdown: number
}

export interface TimelineData {
  points: TimelinePoint[]
  totalPnl: number
  maxDrawdown: number
}

export async function getTimeline(interval: 'daily' | 'weekly' | 'monthly', accountId?: string): Promise<TimelineData> {
  const { data } = await api.get('/analytics/timeline', { params: { interval, accountId } })
  return data.data
}

export interface BucketCount {
  bucket: string
  count: number
}

export interface Distributions {
  rr: BucketCount[]
  profits: BucketCount[]
  sizes: BucketCount[]
  longShort: { long: number; short: number; longWins: number; shortWins: number; longPnl: number; shortPnl: number }
}

export async function getDistributions(accountId?: string): Promise<Distributions> {
  const { data } = await api.get('/analytics/distributions', { params: { accountId } })
  return data.data
}

export interface TimingStat {
  trades: number
  wins: number
  pnl: number
}

export interface TimingData {
  hours: Array<TimingStat & { hour: number }>
  sessions: Array<TimingStat & { session: string }>
  weekdays: Array<TimingStat & { day: number; label: string; winRate: number }>
}

export async function getTiming(accountId?: string): Promise<TimingData> {
  const { data } = await api.get('/analytics/timing', { params: { accountId } })
  return data.data
}

export interface StreakRun {
  type: 'win' | 'loss'
  count: number
  start: string
  end: string
}

export interface BehaviorData {
  streaks: StreakRun[]
  avgWinVsLoss: { avgWin: number | null; avgLoss: number | null; winCount: number; lossCount: number }
  screenshots: { total: number; tradesWithScreenshots: number; weeks: Array<{ week: string; count: number }> }
  mistakes: { total: number; keywords: Array<{ keyword: string; count: number }> }
  checklists: { completionRate: number | null; items: Array<{ name: string; done: number; missed: number; rate: number }> }
  setups: Array<{ setup: string; trades: number; wins: number; winRate: number; pnl: number }>
  psychology: {
    emotions: Array<{ emotion: string; count: number }>
    averages: { confidence: number | null; execution: number | null; patience: number | null; discipline: number | null }
    points: Array<{ date: string; score: number }>
  }
  quality: { avg: number | null; points: Array<{ date: string; score: number; result: string | null }> }
}

export async function getBehavior(accountId?: string): Promise<BehaviorData> {
  const { data } = await api.get('/analytics/behavior', { params: { accountId } })
  return data.data
}

export interface TrendsData {
  weekly: Array<{ start: string; trades: number; wins: number; winRate: number }>
  monthly: Array<{ month: string; pnl: number; trades: number; wins: number }>
}

export async function getTrends(accountId?: string): Promise<TrendsData> {
  const { data } = await api.get('/analytics/trends', { params: { accountId } })
  return data.data
}