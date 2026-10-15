import { useState, useEffect, useMemo, useRef } from 'react'
import { TrendingUp, Target, DollarSign, BarChart3, Activity, ExternalLink, Star, ChevronDown, TrendingDown, Flame, Award, CalendarDays } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useNavigate, useLocation } from 'react-router-dom'
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import * as dashboardService from '../services/dashboard'
import * as accountService from '../services/accounts'
import type { DashboardStats, MonthlyPerformance, ResultDistribution, InstrumentPerformance, RecentTrade } from '../services/dashboard'
import type { Account } from '../services/accounts'
import { eventBus } from '../lib/eventBus'
import { onStorageChange, broadcastStorage } from '../lib/crossTabSync'
import { TradeCalendar } from '../components/dashboard/TradeCalendar'
import { GradientText } from '../components/hub/Hub'
import { motion } from 'framer-motion'
import { fadeUp, staggerContainer } from '../lib/motion'
import { cn } from '../lib/utils'
import { DateRangePicker } from '../components/ui/DateRangePicker'

function getChartColors() {
  const s = getComputedStyle(document.documentElement)
  const primary = s.getPropertyValue('--color-primary').trim() || '#4F46E5'
  const primaryLight = s.getPropertyValue('--color-primary-light').trim() || '#A5B4FC'
  return {
    pie: [
      s.getPropertyValue('--color-success').trim() || '#22C55E',
      s.getPropertyValue('--color-danger').trim() || '#EF4444',
      s.getPropertyValue('--color-warning').trim() || '#F59E0B',
      s.getPropertyValue('--color-text-muted').trim() || '#8A8A99',
    ],
    primary,
    primaryLight,
  }
}

type TimePeriod = 'OVERALL' | 'DAY' | 'WEEK' | 'MONTH' | 'CUSTOM'

function getDateRange(period: TimePeriod): { startDate: string; endDate: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()

  switch (period) {
    case 'DAY': {
      const start = new Date(y, m, d)
      const end = new Date(y, m, d, 23, 59, 59)
      return { startDate: start.toISOString(), endDate: end.toISOString() }
    }
    case 'WEEK': {
      const dayOfWeek = now.getDay()
      const monday = new Date(y, m, d - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      const sunday = new Date(y, m, d + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek), 23, 59, 59)
      return { startDate: monday.toISOString(), endDate: sunday.toISOString() }
    }
    case 'MONTH': {
      const start = new Date(y, m, 1)
      const end = new Date(y, m + 1, 0, 23, 59, 59)
      return { startDate: start.toISOString(), endDate: end.toISOString() }
    }
    case 'OVERALL':
      return { startDate: '', endDate: '' }
    default:
      return { startDate: '', endDate: '' }
  }
}

function formatDateForInput(iso: string): string {
  return iso.slice(0, 10)
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
  const dayNum = d.getDate()
  const suffix = dayNum % 10 === 1 && dayNum !== 11 ? 'st' : dayNum % 10 === 2 && dayNum !== 12 ? 'nd' : dayNum % 10 === 3 && dayNum !== 13 ? 'rd' : 'th'
  return `${dayName} ${dayNum}${suffix}`
}

function calculateEquityCurve(monthly: MonthlyPerformance[]) {
  let cumulative = 0
  return monthly.map((m) => {
    cumulative += m.pnl
    return { month: m.month, equity: Math.round(cumulative * 100) / 100 }
  })
}

function fmtMoney(v: number): string {
  return `${v >= 0 ? '+' : '-'}$${Math.abs(Number(v)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 18) return 'Good Afternoon'
  return 'Good Evening'
}

const STORAGE_KEY = 'tradesense_calendar_account'

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: 'OVERALL', label: 'Overall' },
  { value: 'DAY', label: 'Day' },
  { value: 'WEEK', label: 'Week' },
  { value: 'MONTH', label: 'Month' },
  { value: 'CUSTOM', label: 'Custom' },
]

export function DashboardPage() {
  const { user } = useAuth()
  const { activeTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [monthly, setMonthly] = useState<MonthlyPerformance[]>([])
  const [distribution, setDistribution] = useState<ResultDistribution | null>(null)
  const [instruments, setInstruments] = useState<InstrumentPerformance[]>([])
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([])
  const [overallStats, setOverallStats] = useState<DashboardStats | null>(null)
  const [todayStats, setTodayStats] = useState<DashboardStats | null>(null)
  const [weekStats, setWeekStats] = useState<DashboardStats | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [colors, setColors] = useState(getChartColors)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || ''
  })
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('OVERALL')
  const [customStart, setCustomStart] = useState(() => formatDateForInput(new Date().toISOString()))
  const [customEnd, setCustomEnd] = useState(() => formatDateForInput(new Date().toISOString()))
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
  const accountDropdownRef = useRef<HTMLDivElement>(null)
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1)
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)
  const [viewingDropdownOpen, setViewingDropdownOpen] = useState(false)
  const viewingDropdownRef = useRef<HTMLDivElement>(null)

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [accounts])

  const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId) || null, [accounts, selectedAccountId])

  useEffect(() => { setSelectedPhase(null) }, [selectedAccountId])

  const PHASE_NAMES = ['PHASE1', 'PHASE2', 'PHASE3', 'FUNDED']
  const currentPhase = useMemo(() => {
    if (!selectedAccount) return 'PHASE1'
    if (selectedAccount.phase === 'FUNDED') return 'FUNDED'
    const idx = Number((selectedAccount.defaultValues?.phaseIndex as number) ?? 0)
    return PHASE_NAMES[Math.min(idx, PHASE_NAMES.length - 1)]
  }, [selectedAccount])
  const effectivePhase = selectedPhase ?? currentPhase
  const availablePhases = useMemo(() => {
    if (!selectedAccount) return []
    const idx = Number((selectedAccount.defaultValues?.phaseIndex as number) ?? 0)
    const phases: string[] = []
    for (let i = 0; i <= Math.min(idx, 3); i++) {
      phases.push(PHASE_NAMES[i])
    }
    if (selectedAccount.phase === 'FUNDED' && !phases.includes('FUNDED')) phases.push('FUNDED')
    return phases
  }, [selectedAccount])

  async function handleToggleFavorite(id: string) {
    try {
      const updated = await accountService.toggleFavorite(id)
      setAccounts((prev) => {
        const next = prev.map((a) => a.id === id ? { ...a, isFavorite: updated.isFavorite } : a)
        next.sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        return next
      })
    } catch {}
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false)
      }
      if (viewingDropdownRef.current && !viewingDropdownRef.current.contains(e.target as Node)) {
        setViewingDropdownOpen(false)
      }
    }
    if (accountDropdownOpen || viewingDropdownOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [accountDropdownOpen, viewingDropdownOpen])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedAccountId)
    broadcastStorage(STORAGE_KEY, selectedAccountId)
  }, [selectedAccountId])

  useEffect(() => {
    const offStorage = onStorageChange(STORAGE_KEY, (_k, v) => {
      setSelectedAccountId(v || '')
      setRefreshKey((k) => k + 1)
    })
    return () => offStorage()
  }, [])

  useEffect(() => {
    setRefreshKey((k) => k + 1)
    const onFocus = () => setRefreshKey((k) => k + 1)
    window.addEventListener('focus', onFocus)
    const offAccounts = eventBus.on('accounts:changed', () => setRefreshKey((k) => k + 1))
    const offTrades = eventBus.on('trades:changed', () => setRefreshKey((k) => k + 1))
    const offPayouts = eventBus.on('payouts:changed', () => setRefreshKey((k) => k + 1))
    return () => {
      window.removeEventListener('focus', onFocus)
      offAccounts()
      offTrades()
      offPayouts()
    }
  }, [location.key])

  useEffect(() => {
    accountService.listAccounts().then((all) => {
      setAccounts(all.filter((a) => a.type === 'PROP_FIRM' || a.type === 'PERSONAL_ACCOUNT'))
    }).catch(() => {})
  }, [refreshKey])

  useEffect(() => {
    setColors(getChartColors())
  }, [activeTheme])

  const { startDate: rangeStart, endDate: rangeEnd } = getDateRange(timePeriod)
  const sd = timePeriod !== 'CUSTOM' ? rangeStart || undefined : customStart ? new Date(customStart).toISOString() : undefined
  const ed = timePeriod !== 'CUSTOM' ? rangeEnd || undefined : customEnd ? new Date(customEnd + 'T23:59:59').toISOString() : undefined

  useEffect(() => {
    const t = selectedAccountId || undefined
    Promise.all([
      dashboardService.getStats(t, sd, ed, effectivePhase),
      dashboardService.getMonthlyPerformance(t, sd, ed),
      dashboardService.getResultDistribution(t, sd, ed),
      dashboardService.getInstrumentPerformance(t, sd, ed),
      dashboardService.getRecentTrades(t, 10, sd, ed),
    ])
      .then(([s, m, d, i, r]) => {
        setStats(s)
        setMonthly(m)
        setDistribution(d)
        setInstruments(i)
        setRecentTrades(r)
      })
      .catch(() => {})
  }, [selectedAccountId, sd, ed, refreshKey, effectivePhase])

  useEffect(() => {
    if (!selectedAccountId) { setOverallStats(null); return }
    dashboardService.getStats(selectedAccountId, undefined, undefined, effectivePhase)
      .then(setOverallStats)
      .catch(() => setOverallStats(null))
  }, [selectedAccountId, refreshKey, effectivePhase])

  useEffect(() => {
    const acct = selectedAccountId || undefined
    const y = new Date().getFullYear()
    const m = new Date().getMonth()
    const d = new Date().getDate()
    const dayStart = new Date(y, m, d).toISOString()
    const dayEnd = new Date(y, m, d, 23, 59, 59).toISOString()
    dashboardService.getStats(acct, dayStart, dayEnd, effectivePhase)
      .then(setTodayStats)
      .catch(() => setTodayStats(null))
  }, [selectedAccountId, refreshKey, effectivePhase])

  useEffect(() => {
    const acct = selectedAccountId || undefined
    const range = getDateRange('WEEK')
    dashboardService.getStats(acct, range.startDate, range.endDate, effectivePhase)
      .then(setWeekStats)
      .catch(() => setWeekStats(null))
  }, [selectedAccountId, refreshKey, effectivePhase])

  useEffect(() => {
    if (timePeriod === 'CUSTOM' && customStart) {
      const d = new Date(customStart)
      setCalendarYear(d.getFullYear())
      setCalendarMonth(d.getMonth() + 1)
    } else if (timePeriod !== 'CUSTOM') {
      const now = new Date()
      setCalendarYear(now.getFullYear())
      setCalendarMonth(now.getMonth() + 1)
    }
  }, [timePeriod, customStart])

  function handleCalendarMonthChange(y: number, m: number) {
    setCalendarYear(y)
    setCalendarMonth(m)
    setTimePeriod('CUSTOM')
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 0))
    setCustomStart(formatDateForInput(start.toISOString()))
    setCustomEnd(formatDateForInput(end.toISOString()))
  }

  const pieData = distribution
    ? [
        { name: 'Wins', value: distribution.wins },
        { name: 'Losses', value: distribution.losses },
        { name: 'Break Even', value: distribution.breakEvens },
        { name: 'Draft', value: distribution.drafts },
      ]
    : []

  const totalPnL = stats?.pnl ?? 0
  const tradesenseScore = stats?.winRate && stats?.avgReturn
    ? Math.round((stats.winRate * 0.6) + (Math.min(Math.max(stats.avgReturn / 100, -10), 10) + 10) * 2.5)
    : 0

  const statCards = [
    { label: 'Total Trades', value: stats?.total ?? '--', icon: BarChart3, suffix: '' },
    { label: 'Win Rate', value: stats ? `${stats.winRate}%` : '--', icon: Target, suffix: '' },
    { label: 'P&L', value: totalPnL >= 0 ? `+$${Number(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(Number(totalPnL)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, suffix: '', positive: totalPnL >= 0 },
    { label: 'Best Day', value: stats?.bestDay ? formatDateLabel(stats.bestDay.date) : '-', sub: stats?.bestDay ? `+$${Number(stats.bestDay.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-', icon: TrendingUp, suffix: '', positive: true as const },
    { label: 'Worst Day', value: stats?.worstDay ? formatDateLabel(stats.worstDay.date) : '-', sub: stats?.worstDay ? `-$${Math.abs(Number(stats.worstDay.pnl)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-', icon: TrendingUp, suffix: '', positive: false as const },
  ]

  function getProfitFactorColor(pf: number | null | undefined): { text: string; bg: string; label: string } {
    if (pf === null || pf === undefined) return { text: 'text-purple-400', bg: 'bg-purple-500/10', label: 'No losses' }
    if (pf >= 3) return { text: 'text-success', bg: 'bg-success/10', label: 'Excellent' }
    if (pf >= 2) return { text: 'text-success', bg: 'bg-success/10', label: 'Great' }
    if (pf >= 1.5) return { text: 'text-warning', bg: 'bg-warning/10', label: 'Good' }
    if (pf >= 1) return { text: 'text-warning', bg: 'bg-warning/10', label: 'Profitable' }
    return { text: 'text-danger', bg: 'bg-danger/10', label: 'Losing' }
  }

  const equityData = calculateEquityCurve(monthly)

  const bestInstrument = useMemo(() => {
    const candidates = instruments.filter((i) => i.total >= 2)
    if (candidates.length === 0) return null
    return [...candidates].sort((a, b) => b.winRate - a.winRate)[0]
  }, [instruments])

  const mostTradedInstrument = useMemo(() => {
    if (instruments.length === 0) return null
    return [...instruments].sort((a, b) => b.total - a.total)[0]
  }, [instruments])

  const bestMonth = useMemo(() => {
    if (monthly.length === 0) return null
    return [...monthly].sort((a, b) => b.pnl - a.pnl)[0]
  }, [monthly])

  const currentStreak = useMemo(() => {
    let count = 0
    let type: 'win' | 'loss' | null = null
    for (const t of recentTrades) {
      if (t.result !== 'WIN' && t.result !== 'LOSS') break
      const next = t.result === 'WIN' ? 'win' : 'loss'
      if (type === null) type = next
      else if (type !== next) break
      count++
    }
    return { count, type }
  }, [recentTrades])

  const insights = useMemo(() => {
    const list: Array<{ icon: typeof Award; tone: string; title: string; text: string }> = []
    if (!stats || stats.total === 0) return list
    if (bestMonth) {
      list.push({ icon: Award, tone: 'bg-success/10 text-success', title: 'Best month', text: `${bestMonth.month} earned ${fmtMoney(bestMonth.pnl)} over ${bestMonth.trades} trades.` })
    }
    if (stats.bestDay) {
      list.push({ icon: TrendingUp, tone: 'bg-success/10 text-success', title: 'Most productive day', text: `${formatDateLabel(stats.bestDay.date)} brought ${fmtMoney(stats.bestDay.pnl)} — your best result.` })
    }
    if (stats.worstDay) {
      list.push({ icon: TrendingDown, tone: 'bg-danger/10 text-danger', title: 'Hardest day', text: `${formatDateLabel(stats.worstDay.date)} cost ${fmtMoney(stats.worstDay.pnl)} — review what happened before repeating.` })
    }
    if (mostTradedInstrument) {
      list.push({ icon: BarChart3, tone: 'bg-primary/10 text-primary', title: 'Home market', text: `${mostTradedInstrument.instrument} is your most traded market (${mostTradedInstrument.total} trades).` })
    }
    if (stats.profitFactor !== null && stats.profitFactor !== undefined && stats.profitFactor >= 1.2) {
      list.push({ icon: DollarSign, tone: 'bg-primary/10 text-primary', title: 'Profit factor', text: `Profit factor ${stats.profitFactor.toFixed(2)} — you earn ${stats.profitFactor.toFixed(2)} for every 1 unit risked.` })
    }
    if (stats.winRate >= 55) {
      list.push({ icon: Target, tone: 'bg-success/10 text-success', title: 'Winning edge', text: `You win ${stats.winRate}% of trades — above 50% keeps the account growing.` })
    }
    return list.slice(0, 6)
  }, [stats, bestMonth, mostTradedInstrument])

  const todaySubText = todayStats
    ? todayStats.total === 0
      ? 'No trades today yet'
      : `${todayStats.total} trade${todayStats.total !== 1 ? 's' : ''} today`
    : 'No trades today yet'

  const weekSubText = weekStats
    ? weekStats.total === 0
      ? 'No trades this week yet'
      : `${weekStats.total} trade${weekStats.total !== 1 ? 's' : ''} this week`
    : 'No trades this week yet'

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="p-6 lg:p-8 space-y-6">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {getGreeting()},{' '}
            <GradientText animated className="font-extrabold">
              {user?.fullName || user?.username}
            </GradientText>
          </h1>
          <p className="text-text-secondary mt-1 text-sm">Here's your trading overview.</p>
        </div>
        <div className="flex items-center gap-3 bg-card backdrop-blur-xl border border-border rounded-2xl px-5 py-3 shadow-glass">
          <Activity className="w-4 h-4 text-primary-light" />
          <span className="text-xs text-text-muted">Today</span>
          <span className="text-xs font-medium text-text-primary">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="hidden lg:grid grid-cols-2 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-muted uppercase tracking-widest font-medium">Today's Profit</p>
            <p className={`text-xl font-bold mt-0.5 ${todayStats ? (todayStats.pnl < 0 ? 'text-danger' : 'text-success') : 'text-text-primary'}`}>{todayStats ? fmtMoney(todayStats.pnl) : '—'}</p>
            <p className="text-xs text-text-muted mt-0.5 truncate">{todaySubText}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-muted uppercase tracking-widest font-medium">Week Profit</p>
            <p className={`text-xl font-bold mt-0.5 ${weekStats ? (weekStats.pnl < 0 ? 'text-danger' : 'text-success') : 'text-text-primary'}`}>{weekStats ? fmtMoney(weekStats.pnl) : '—'}</p>
            <p className="text-xs text-text-muted mt-0.5 truncate">{weekSubText}</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-64 max-w-full relative" ref={accountDropdownRef}>
            <button type="button" onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className={cn(
                'flex items-center gap-2 w-full rounded-xl border border-border/80 px-3.5 py-2.5 text-sm bg-input/60 backdrop-blur-sm transition-all duration-200',
                'hover:border-primary/40',
                accountDropdownOpen && 'border-primary shadow-[0_0_0_2px_rgba(79,70,229,0.12)]',
              )}>
              <span className={cn('flex-1 text-left', !selectedAccountId && 'text-text-muted')}>
                {selectedAccountId
                  ? accounts.find((a) => a.id === selectedAccountId)?.name || 'All Accounts'
                  : 'All Accounts'}
              </span>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${accountDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {accountDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 left-0 w-full bg-elevated border border-border rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto">
                <button key="" type="button" onClick={() => { setSelectedAccountId(''); setAccountDropdownOpen(false) }}
                  className={cn(
                    'w-full text-left px-3.5 py-2.5 text-sm transition-colors',
                    !selectedAccountId ? 'bg-primary text-white' : 'text-text-primary hover:bg-hover'
                  )}>
                  All Accounts
                </button>
                {sortedAccounts.map((a) => (
                  <div key={a.id}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors',
                      selectedAccountId === a.id ? 'bg-primary text-white' : 'text-text-primary hover:bg-hover'
                    )}>
                    <button type="button" onClick={() => { setSelectedAccountId(a.id); setAccountDropdownOpen(false) }}
                      className="flex-1 text-left">
                      {a.name}
                    </button>
                    <button type="button" onMouseDown={(e) => { e.stopPropagation() }}
                      onClick={() => handleToggleFavorite(a.id)}
                      className="shrink-0 p-0.5 rounded hover:bg-hover transition-colors">
                      <Star className={cn('w-3.5 h-3.5', a.isFavorite ? 'fill-warning text-warning' : 'text-text-muted')} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1 bg-glass rounded-xl border border-border/50 p-0.5">
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => setTimePeriod(p.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  timePeriod === p.value
                    ? 'bg-primary text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {timePeriod === 'CUSTOM' && (
          <DateRangePicker
            startDate={customStart}
            endDate={customEnd}
            onStartChange={setCustomStart}
            onEndChange={setCustomEnd}
          />
        )}
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-brand/15 via-brand/5 to-transparent rounded-2xl border border-primary/15 p-5 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.15),transparent)] pointer-events-none" />
          <p className="text-xs text-text-muted uppercase tracking-widest font-medium relative z-10">TradeSense Score</p>
          <p className="text-4xl font-bold text-text-primary mt-2 relative z-10">{Math.min(100, Math.max(0, tradesenseScore))}</p>
          <div className="w-full mt-3 h-1.5 bg-hover/50 rounded-full overflow-hidden relative z-10">
            <div className="h-full bg-gradient-to-r from-brand via-brand-light to-purple-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, tradesenseScore))}%` }} />
          </div>
          <p className="text-xs text-text-muted mt-2 relative z-10">
            {tradesenseScore >= 70 ? 'Exceptional performance' : tradesenseScore >= 40 ? 'Room for improvement' : 'Needs work'}
          </p>
        </div>

        {statCards.map((stat) => (
          <motion.div key={stat.label} variants={fadeUp} className="card card-hover p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted uppercase tracking-widest font-medium">{stat.label}</p>
              <stat.icon className={`w-4 h-4 ${'positive' in stat ? (stat.positive ? 'text-success' : 'text-danger') : 'text-primary-light'}`} />
            </div>
            <p className={`mt-3 text-3xl font-bold ${'positive' in stat ? (stat.positive ? 'text-success' : 'text-danger') : 'text-text-primary'}`}>
              {stat.value}
            </p>
            {'sub' in stat && (
              <p className={`text-lg font-bold ${'positive' in stat ? (stat.positive ? 'text-success/70' : 'text-danger/70') : 'text-text-muted'}`}>
                {stat.sub}
              </p>
            )}
          </motion.div>
        ))}

        {selectedAccountId && !!selectedAccount?.defaultValues?.currentAccountSize && (
          <motion.div variants={fadeUp} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted uppercase tracking-widest font-medium">Current Balance</p>
              <DollarSign className="w-4 h-4 text-success" />
            </div>
            <p className="mt-3 text-3xl font-bold text-text-primary">
              ${(selectedAccount.defaultValues.currentAccountSize as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </motion.div>
        )}

        {stats && (
          <motion.div variants={fadeUp} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted uppercase tracking-widest font-medium">Profit Factor</p>
              <Activity className={`w-4 h-4 ${getProfitFactorColor(stats.profitFactor).text}`} />
            </div>
            <p className={`mt-3 text-2xl font-bold ${getProfitFactorColor(stats.profitFactor).text}`}>
              {stats.profitFactor === null ? 'N/A' : stats.profitFactor.toFixed(2)}
            </p>
            <p className={`text-xs font-medium ${getProfitFactorColor(stats.profitFactor).text}/70`}>
              {getProfitFactorColor(stats.profitFactor).label}
            </p>
          </motion.div>
        )}

      </motion.div>

      {/* Challenge Metrics - Prop Firm Style */}
      {selectedAccountId && selectedAccount && overallStats && selectedAccount.type === 'PROP_FIRM' && (
        <div className="space-y-6">
          {availablePhases.length > 0 && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-medium">Phase:</span>
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/20 text-primary">
                  {currentPhase.replace('PHASE', 'Phase ')} {currentPhase === 'FUNDED' ? '• Current' : '• Current'}
                </span>
                {selectedPhase !== null && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/20">
                    Viewing: {selectedPhase.replace('PHASE', 'Phase ')}
                  </span>
                )}
              </div>
              {availablePhases.length > 1 && (
                <div className="relative" ref={viewingDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setViewingDropdownOpen(!viewingDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-border/80 bg-input/60 text-text-secondary hover:text-text-primary hover:border-primary/40 transition-all"
                  >
                    {selectedPhase ? `Viewing: ${selectedPhase.replace('PHASE', 'Phase ')}` : 'Viewing: Current'}
                    <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${viewingDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {viewingDropdownOpen && (
                    <div className="absolute z-50 top-full mt-1 right-0 w-56 bg-elevated border border-border rounded-xl shadow-2xl py-1">
                      <button
                        type="button"
                        onClick={() => { setSelectedPhase(null); setViewingDropdownOpen(false) }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                          selectedPhase === null ? 'bg-primary text-white' : 'text-text-primary hover:bg-hover'
                        }`}
                      >
                        Current ({currentPhase.replace('PHASE', 'Phase ')})
                      </button>
                      <div className="h-px bg-border my-1" />
                      <button
                        type="button"
                        onClick={() => { setSelectedPhase('ALL'); setViewingDropdownOpen(false) }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                          selectedPhase === 'ALL' ? 'bg-primary text-white' : 'text-text-primary hover:bg-hover'
                        }`}
                      >
                        All Phases
                      </button>
                      {availablePhases.filter(p => p !== currentPhase).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => { setSelectedPhase(p); setViewingDropdownOpen(false) }}
                          className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors ${
                            selectedPhase === p ? 'bg-primary text-white' : 'text-text-primary hover:bg-hover'
                          }`}
                        >
                          {p.replace('PHASE', 'Phase ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group relative overflow-hidden rounded-[20px] p-5 sm:p-6 lg:p-7 transition-all duration-250 card hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs sm:text-sm font-semibold text-text-secondary">Daily Drawdown Level</p>
                <span className="bg-hover px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-text-primary whitespace-nowrap">
                  {(() => {
                    const limit = (selectedAccount.defaultValues?.maxDailyDrawdown as number) || 0
                    const accountSize = (selectedAccount.defaultValues?.accountSize as number) || 0
                    if (!limit) return '—'
                    const pct = accountSize > 0 ? ` (${((limit / accountSize) * 100).toFixed(1)}%)` : ''
                    return `$${limit.toLocaleString()}${pct}`
                  })()}
                </span>
              </div>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary leading-none">
                  {(() => {
                    const limit = (selectedAccount.defaultValues?.maxDailyDrawdown as number) || 0
                    const pnl = todayStats?.pnl || 0
                    if (!limit) return '—'
                    const used = Math.abs(Math.min(0, pnl))
                    const pct = Math.min(100, (used / limit) * 100)
                    return `${Math.round(pct)}%`
                  })()}
                </span>
              </div>
              <div className="mt-6 sm:mt-8">
                <div className="h-4 sm:h-5 lg:h-6 bg-hover rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full transition-all duration-[400ms] bg-info"
                    style={{ width: `${(() => {
                      const limit = (selectedAccount.defaultValues?.maxDailyDrawdown as number) || 0
                      const pnl = todayStats?.pnl || 0
                      const used = Math.abs(Math.min(0, pnl))
                      return limit ? Math.min(100, (used / limit) * 100) : 0
                    })()}%` }} />
                  <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-bold text-text-muted">
                    <span>0%</span><span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[20px] p-5 sm:p-6 lg:p-7 transition-all duration-250 card hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs sm:text-sm font-semibold text-text-secondary">Max Drawdown Level</p>
                <span className="bg-hover px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-text-primary whitespace-nowrap">
                  {(() => {
                    const limit = (selectedAccount.defaultValues?.maxTotalDrawdown as number) || 0
                    const accountSize = (selectedAccount.defaultValues?.accountSize as number) || 0
                    if (!limit) return '—'
                    const pct = accountSize > 0 ? ` (${((limit / accountSize) * 100).toFixed(1)}%)` : ''
                    return `$${limit.toLocaleString()}${pct}`
                  })()}
                </span>
              </div>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary leading-none">
                  {(() => {
                    const dv = selectedAccount.defaultValues || {}
                    const limit = (dv.maxTotalDrawdown as number) || 0
                    const accountSize = (dv.accountSize as number) || 0
                    const currentBalance = (dv.currentAccountSize as number) || 0
                    const pnl = overallStats.pnl || 0
                    if (!limit) return '—'
                    const used = Math.max(
                      currentBalance > 0 && accountSize > 0 ? Math.max(0, accountSize - currentBalance) : 0,
                      Math.abs(Math.min(0, pnl))
                    )
                    const pct = Math.min(100, (used / limit) * 100)
                    return `${Math.round(pct)}%`
                  })()}
                </span>
              </div>
              <div className="mt-6 sm:mt-8">
                <div className="h-4 sm:h-5 lg:h-6 bg-hover rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full transition-all duration-[400ms] bg-info"
                    style={{ width: `${(() => {
                      const dv = selectedAccount.defaultValues || {}
                      const limit = (dv.maxTotalDrawdown as number) || 0
                      const accountSize = (dv.accountSize as number) || 0
                      const currentBalance = (dv.currentAccountSize as number) || 0
                      const pnl = overallStats.pnl || 0
                      if (!limit) return 0
                      const used = Math.max(
                        currentBalance > 0 && accountSize > 0 ? Math.max(0, accountSize - currentBalance) : 0,
                        Math.abs(Math.min(0, pnl))
                      )
                      return Math.min(100, (used / limit) * 100)
                    })()}%` }} />
                  <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-bold text-text-muted">
                    <span>0%</span><span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {selectedAccount.phase !== 'FUNDED' && (selectedAccount.defaultValues?.targetProfit as number || 0) > 0 && (
          <div className="group relative overflow-hidden rounded-[20px] p-5 sm:p-6 lg:p-7 transition-all duration-250 card hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs sm:text-sm font-semibold text-text-secondary">Target Profit</p>
              <span className="bg-hover px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-text-primary whitespace-nowrap">
                  {(() => {
                    const limit = (selectedAccount.defaultValues?.targetProfit as number) || 0
                    const accountSize = (selectedAccount.defaultValues?.accountSize as number) || 0
                    if (!limit) return '—'
                    const pct = accountSize > 0 ? ` (${((limit / accountSize) * 100).toFixed(0)}%)` : ''
                    return `+$${limit.toLocaleString()}${pct}`
                  })()}
                </span>
              </div>
              <div className="flex items-end gap-2 mt-1 flex-wrap">
                <span className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary leading-none">
                  {(() => {
                    const dv = selectedAccount.defaultValues || {}
                    const limit = (dv.targetProfit as number) || 0
                    const accountSize = (dv.accountSize as number) || 0
                    const currentBalance = (dv.currentAccountSize as number) || 0
                    const startingBalance = (dv.startingBalance as number) || accountSize
                    const pnl = overallStats.pnl || 0
                    if (!limit) return '—'
                    const hasBalance = currentBalance > 0 && startingBalance > 0
                    const rem = hasBalance
                      ? Math.max(0, (accountSize + limit) - currentBalance)
                      : Math.max(0, limit - pnl)
                    return `$${Number(rem).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  })()}
                </span>
                {(() => {
                  const dv = selectedAccount.defaultValues || {}
                  const limit = (dv.targetProfit as number) || 0
                  const accountSize = (dv.accountSize as number) || 0
                  const currentBalance = (dv.currentAccountSize as number) || 0
                  const startingBalance = (dv.startingBalance as number) || accountSize
                  const pnl = overallStats.pnl || 0
                  if (!limit) return null
                  const hasBalance = currentBalance > 0 && startingBalance > 0
                  const progress = hasBalance ? currentBalance - startingBalance : pnl
                  const pct = limit > 0 ? (progress / limit) * 100 : 0
                  return (
                    <>
                      <span className="text-lg sm:text-xl font-medium text-text-secondary self-end mb-1">left</span>
                      <span className="text-sm sm:text-base font-semibold text-success self-end mb-1">
                        ({Math.round(pct)}%)
                      </span>
                    </>
                  )
                })()}
              </div>
              <div className="mt-6 sm:mt-8">
                <div className="h-4 sm:h-5 lg:h-6 bg-hover rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full transition-all duration-[400ms] bg-success"
                    style={{ width: `${(() => {
                      const dv = selectedAccount.defaultValues || {}
                      const limit = (dv.targetProfit as number) || 0
                      const accountSize = (dv.accountSize as number) || 0
                      const currentBalance = (dv.currentAccountSize as number) || 0
                      const pnl = overallStats.pnl || 0
                      if (!limit) return 0
                      const hasBalance = currentBalance > 0 && accountSize > 0
                      const progress = hasBalance ? currentBalance - accountSize : pnl
                      return Math.min(100, Math.max(0, (progress / limit) * 100))
                    })()}%` }} />
                  <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-bold text-text-muted">
                    <span>0%</span><span>100%</span>
                  </div>
                </div>
              </div>
            </div>
           )}
        </div>
      )}

      <TradeCalendar
        selectedAccountId={selectedAccountId}
        startDate={sd}
        endDate={ed}
        year={calendarYear}
        month={calendarMonth}
        onMonthChange={handleCalendarMonthChange}
        onViewDay={(dateStr) => navigate(`/trades?date=${dateStr}`)}
        phase={effectivePhase}
      />

      {/* Trading Behaviour - below calendar */}
      {stats && stats.total > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Trading Behaviour</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-surface border border-border/50 p-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-widest font-medium">Avg P&amp;L / Trade</p>
              <p className={`text-lg font-bold mt-1 ${stats.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                {fmtMoney(stats.pnl / stats.total)}
              </p>
            </div>
            <div className="rounded-xl bg-surface border border-border/50 p-4">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-widest font-medium">Best Instrument</p>
              <p className="text-lg font-bold text-text-primary mt-1">{bestInstrument ? bestInstrument.instrument : '—'}</p>
              <p className="text-xs text-text-muted mt-0.5">{bestInstrument ? `${bestInstrument.winRate}% win rate` : 'Need data'}</p>
            </div>
            <div className="rounded-xl bg-surface border border-border/50 p-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-widest font-medium">Most Traded</p>
              <p className="text-lg font-bold text-text-primary mt-1">{mostTradedInstrument ? mostTradedInstrument.instrument : '—'}</p>
              <p className="text-xs text-text-muted mt-0.5">{mostTradedInstrument ? `${mostTradedInstrument.total} trades` : 'no data'}</p>
            </div>
            <div className="rounded-xl bg-surface border border-border/50 p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${currentStreak.type === 'win' ? 'bg-success/10 text-success' : currentStreak.type === 'loss' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                <Flame className="w-4 h-4" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-widest font-medium">Current Streak</p>
              <p className="text-lg font-bold text-text-primary mt-1">{currentStreak.count > 0 ? `${currentStreak.count} ${currentStreak.type}${currentStreak.count > 1 ? 's' : ''}` : '—'}</p>
              <p className="text-xs text-text-muted mt-0.5">{currentStreak.count > 0 ? 'keep it going' : 'no recent streak'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Equity Curve</h2>
          {equityData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={equityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: '1px solid var(--color-border)', background: 'var(--color-card)', backdropFilter: 'blur(16px)', color: 'var(--color-text-primary)', fontSize: '13px' }}
                />
                <Line type="monotone" dataKey="equity" stroke={colors.primary} strokeWidth={2.5} dot={{ fill: colors.primary, r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: colors.primaryLight }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Result Distribution</h2>
          {pieData.every((d) => d.value === 0) ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">No data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={colors.pie[index % colors.pie.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: '1px solid var(--color-border)', background: 'var(--color-card)', backdropFilter: 'blur(16px)', color: 'var(--color-text-primary)', fontSize: '13px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-5 mt-2">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.pie[index] }} />
                    {entry.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {instruments.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-text-primary">Instrument Performance</h2>
            <button onClick={() => navigate('/trades')} className="text-xs text-primary-light hover:text-primary-light/80 transition-colors">View all</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {instruments.slice(0, 8).map((inst) => (
              <div key={inst.instrument} className="flex items-center gap-4">
                <span className="text-sm font-medium text-text-primary w-20 sm:w-24 truncate">{inst.instrument}</span>
                <div className="flex-1 h-2 bg-hover/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand to-brand-light rounded-full transition-all duration-500"
                    style={{ width: `${inst.winRate}%` }}
                  />
                </div>
                <span className="text-xs text-text-secondary w-12 text-right">{inst.winRate}%</span>
                <span className="text-xs text-text-muted w-16 text-right">{inst.total} trades</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <motion.div variants={fadeUp} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Recent Journals</h2>
          <button onClick={() => navigate('/trades')} className="text-xs text-primary-light hover:text-primary-light/80 transition-colors">View all</button>
        </div>
        {recentTrades.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-text-muted text-sm">No recent trades</div>
        ) : (
          <div className="space-y-1">
            {recentTrades.map((trade) => {
              return (
                <div
                  key={trade.id}
                  onClick={() => navigate(`/trades/${trade.id}`)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-glass cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm text-text-primary">{trade.instrument}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${
                      trade.direction === 'LONG' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    }`}>{trade.direction}</span>
                    {trade.tags?.slice(0, 2).map((t) => (
                      <span key={t.tag.id} className="text-[10px] text-text-muted bg-glass px-2 py-0.5 rounded-lg">
                        {t.tag.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    {trade.result && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                        trade.result === 'WIN' ? 'bg-success/10 text-success' :
                        trade.result === 'LOSS' ? 'bg-danger/10 text-danger' :
                        'bg-glass text-text-secondary'
                      }`}>{trade.result === 'BREAK_EVEN' ? 'BE' : trade.result}</span>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-text-muted/50" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      <motion.div variants={fadeUp} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Insights</h2>
          <Award className="w-4 h-4 text-primary" />
        </div>
        {insights.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-sm">No insights yet — journal your trades to unlock them.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins) => (
              <div key={ins.title} className="flex items-start gap-3 rounded-xl bg-surface border border-border/50 p-3.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ins.tone}`}>
                  <ins.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{ins.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{ins.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
