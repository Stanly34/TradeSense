import api from './api'

export interface DashboardStats {
  total: number
  wins: number
  losses: number
  breakEvens: number
  winRate: number
  pnl: number
  avgReturn: number
  bestDay: { date: string; pnl: number } | null
  worstDay: { date: string; pnl: number } | null
  profitFactor: number | null
}

export interface MonthlyPerformance {
  month: string
  pnl: number
  trades: number
}

export interface ResultDistribution {
  wins: number
  losses: number
  breakEvens: number
  drafts: number
}

export interface InstrumentPerformance {
  instrument: string
  total: number
  wins: number
  losses: number
  winRate: number
}

function buildParams(templateId?: string, startDate?: string, endDate?: string): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (templateId) params.templateId = templateId
  if (startDate) params.startDate = startDate
  if (endDate) params.endDate = endDate
  return params
}

export async function getStats(templateId?: string, startDate?: string, endDate?: string): Promise<DashboardStats> {
  const { data } = await api.get('/dashboard/stats', { params: buildParams(templateId, startDate, endDate) })
  return data.data
}

export async function getMonthlyPerformance(templateId?: string, startDate?: string, endDate?: string): Promise<MonthlyPerformance[]> {
  const { data } = await api.get('/dashboard/monthly-performance', { params: buildParams(templateId, startDate, endDate) })
  return data.data
}

export async function getResultDistribution(templateId?: string, startDate?: string, endDate?: string): Promise<ResultDistribution> {
  const { data } = await api.get('/dashboard/result-distribution', { params: buildParams(templateId, startDate, endDate) })
  return data.data
}

export interface CalendarDay {
  date: string
  pnl: number
  trades: number
  wins: number
  losses: number
}

export async function getCalendarData(year: number, month: number, templateId?: string, startDate?: string, endDate?: string): Promise<CalendarDay[]> {
  const params: Record<string, string | number> = { year, month, ...buildParams(templateId, startDate, endDate) }
  const { data } = await api.get('/dashboard/calendar', { params })
  return data.data
}

export async function getInstrumentPerformance(templateId?: string, startDate?: string, endDate?: string): Promise<InstrumentPerformance[]> {
  const { data } = await api.get('/dashboard/instrument-performance', { params: buildParams(templateId, startDate, endDate) })
  return data.data
}

export interface RecentTrade {
  id: string
  instrument: string
  direction: string
  entryPrice: number | null
  exitPrice: number | null
  result: string | null
  status: string
  fees: number | null
  createdAt: string
  tags: { tag: { id: string; name: string; color: string | null } }[]
}

export async function getRecentTrades(templateId?: string, limit = 15, startDate?: string, endDate?: string): Promise<RecentTrade[]> {
  const params: Record<string, string | number> = { limit, ...buildParams(templateId, startDate, endDate) }
  const { data } = await api.get('/dashboard/recent-trades', { params })
  return data.data
}
