import { useState, useEffect, useMemo, useRef } from 'react'
import { TrendingUp, Target, DollarSign, BarChart3, Activity, ExternalLink, Star, ChevronDown, TrendingDown } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useNavigate, useLocation } from 'react-router-dom'
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import * as dashboardService from '../services/dashboard'
import * as templateService from '../services/templates'
import type { DashboardStats, MonthlyPerformance, ResultDistribution, InstrumentPerformance, RecentTrade } from '../services/dashboard'
import type { Template } from '../services/templates'
import { TradeCalendar } from '../components/dashboard/TradeCalendar'
import { cn } from '../lib/utils'
import { DateRangePicker } from '../components/ui/DateRangePicker'

function getChartColors() {
  const s = getComputedStyle(document.documentElement)
  const primary = s.getPropertyValue('--color-primary').trim() || '#7C3AED'
  const primaryLight = s.getPropertyValue('--color-primary-light').trim() || '#A78BFA'
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
  const [isLoading, setIsLoading] = useState(true)
  const [overallStats, setOverallStats] = useState<DashboardStats | null>(null)
  const [todayStats, setTodayStats] = useState<DashboardStats | null>(null)
  const [accounts, setAccounts] = useState<Template[]>([])
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

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [accounts])

  const selectedAccount = useMemo(() => accounts.find(a => a.id === selectedAccountId) || null, [accounts, selectedAccountId])

  function formatChallengeValue(value: number | undefined | null, accountSize: number | undefined | null): string {
    if (!value || !accountSize) return '—'
    const pct = ((value / accountSize) * 100).toFixed(0)
    return `${pct}% ($${value.toLocaleString()})`
  }

  async function handleToggleFavorite(id: string) {
    try {
      const updated = await templateService.toggleFavorite(id)
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
    }
    if (accountDropdownOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [accountDropdownOpen])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedAccountId)
  }, [selectedAccountId])

  useEffect(() => {
    setRefreshKey((k) => k + 1)
    const onFocus = () => setRefreshKey((k) => k + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [location.key])

  useEffect(() => {
    templateService.listTemplates().then((all) => {
      setAccounts(all.filter((t) => t.type === 'PROP_FIRM' || t.type === 'PERSONAL_ACCOUNT'))
    }).catch(() => {})
  }, [refreshKey])

  useEffect(() => {
    setColors(getChartColors())
  }, [activeTheme])

  const { startDate: rangeStart, endDate: rangeEnd } = getDateRange(timePeriod)
  const sd = timePeriod !== 'CUSTOM' ? rangeStart || undefined : customStart ? new Date(customStart).toISOString() : undefined
  const ed = timePeriod !== 'CUSTOM' ? rangeEnd || undefined : customEnd ? new Date(customEnd + 'T23:59:59').toISOString() : undefined

  useEffect(() => {
    setIsLoading(true)
    const t = selectedAccountId || undefined
    Promise.all([
      dashboardService.getStats(t, sd, ed),
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
      .finally(() => setIsLoading(false))
  }, [selectedAccountId, sd, ed, refreshKey])

  useEffect(() => {
    if (!selectedAccountId) { setOverallStats(null); return }
    dashboardService.getStats(selectedAccountId)
      .then(setOverallStats)
      .catch(() => setOverallStats(null))
  }, [selectedAccountId, refreshKey])

  useEffect(() => {
    if (!selectedAccountId) { setTodayStats(null); return }
    const y = new Date().getFullYear()
    const m = new Date().getMonth()
    const d = new Date().getDate()
    const dayStart = new Date(y, m, d).toISOString()
    const dayEnd = new Date(y, m, d, 23, 59, 59).toISOString()
    dashboardService.getStats(selectedAccountId, dayStart, dayEnd)
      .then(setTodayStats)
      .catch(() => setTodayStats(null))
  }, [selectedAccountId, refreshKey])

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
    { label: 'P&L', value: totalPnL >= 0 ? `+$${totalPnL.toFixed(0)}` : `-$${Math.abs(totalPnL).toFixed(0)}`, icon: DollarSign, suffix: '', positive: totalPnL >= 0 },
    { label: 'Best Day', value: stats?.bestDay ? formatDateLabel(stats.bestDay.date) : '-', sub: stats?.bestDay ? `+$${stats.bestDay.pnl.toFixed(0)}` : '-', icon: TrendingUp, suffix: '', positive: true as const },
    { label: 'Worst Day', value: stats?.worstDay ? formatDateLabel(stats.worstDay.date) : '-', sub: stats?.worstDay ? `-$${Math.abs(stats.worstDay.pnl).toFixed(0)}` : '-', icon: TrendingUp, suffix: '', positive: false as const },
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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back, {user?.fullName || user?.username}
          </h1>
          <p className="text-text-secondary mt-1 text-sm">Here's your trading overview.</p>
        </div>
        <div className="flex items-center gap-3 bg-card backdrop-blur-xl border border-border rounded-2xl px-5 py-3 shadow-glass">
          <Activity className="w-4 h-4 text-primary-light" />
          <span className="text-xs text-text-muted">Today</span>
          <span className="text-xs font-medium text-text-primary">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-64 relative" ref={accountDropdownRef}>
            <button type="button" onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className={cn(
                'flex items-center gap-2 w-full rounded-xl border border-border/80 px-3.5 py-2.5 text-sm bg-input/60 backdrop-blur-sm transition-all duration-200',
                'hover:border-primary/40',
                accountDropdownOpen && 'border-primary shadow-[0_0_0_2px_rgba(124,58,237,0.12)]',
              )}>
              <span className={cn('flex-1 text-left', !selectedAccountId && 'text-text-muted')}>
                {selectedAccountId
                  ? accounts.find((a) => a.id === selectedAccountId)?.name || 'All Accounts'
                  : 'All Accounts'}
              </span>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${accountDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {accountDropdownOpen && (
              <div className="absolute z-50 top-full mt-1 left-0 w-full bg-glass/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto">
                <button key="" type="button" onClick={() => { setSelectedAccountId(''); setAccountDropdownOpen(false) }}
                  className={cn(
                    'w-full text-left px-3.5 py-2.5 text-sm transition-colors',
                    !selectedAccountId ? 'bg-primary/15 text-primary-light' : 'text-text-secondary hover:bg-card'
                  )}>
                  All Accounts
                </button>
                {sortedAccounts.map((a) => (
                  <div key={a.id}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors',
                      selectedAccountId === a.id ? 'bg-primary/15 text-primary-light' : 'text-text-secondary hover:bg-card'
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
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-brand/15 via-brand/5 to-transparent rounded-2xl border border-primary/15 p-5 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent)] pointer-events-none" />
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
          <div key={stat.label} className="card card-hover p-5">
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
          </div>
        ))}

        {selectedAccountId && selectedAccount?.defaultValues?.currentAccountSize && (
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted uppercase tracking-widest font-medium">Current Balance</p>
              <DollarSign className="w-4 h-4 text-success" />
            </div>
            <p className="mt-3 text-3xl font-bold text-text-primary">
              ${(selectedAccount.defaultValues.currentAccountSize as number).toLocaleString()}
            </p>
          </div>
        )}

        {stats && (
          <div className="card p-5">
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
          </div>
        )}

      </div>

      {/* Challenge Metrics - Prop Firm Style */}
      {selectedAccountId && selectedAccount && overallStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="group relative overflow-hidden rounded-[20px] p-7 transition-all duration-250"
              style={{
                background: '#171A21',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 8px 30px rgba(0,0,0,.35)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,.45)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,.35)' }}>
              <div className="flex items-center justify-between mb-1">
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#B8C0D4' }}>Daily Drawdown Level</p>
                <span style={{ background: '#222734', padding: '8px 16px', borderRadius: '999px', fontSize: '15px', fontWeight: 700, color: '#fff' }}>
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
                <span style={{ fontSize: '58px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
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
              <div className="mt-[30px]">
                <div style={{ height: '22px', background: '#252A35', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%', background: '#4D6BFF', borderRadius: '999px',
                    transition: 'width .4s ease',
                    width: `${(() => {
                      const limit = (selectedAccount.defaultValues?.maxDailyDrawdown as number) || 0
                      const pnl = todayStats?.pnl || 0
                      const used = Math.abs(Math.min(0, pnl))
                      return limit ? Math.min(100, (used / limit) * 100) : 0
                    })()}%`,
                  }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                    <span>0%</span><span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[20px] p-7 transition-all duration-250"
              style={{
                background: '#171A21',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 8px 30px rgba(0,0,0,.35)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,.45)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,.35)' }}>
              <div className="flex items-center justify-between mb-1">
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#B8C0D4' }}>Max Drawdown Level</p>
                <span style={{ background: '#222734', padding: '8px 16px', borderRadius: '999px', fontSize: '15px', fontWeight: 700, color: '#fff' }}>
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
                <span style={{ fontSize: '58px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {(() => {
                    const dv = selectedAccount.defaultValues || {}
                    const limit = (dv.maxTotalDrawdown as number) || 0
                    const accountSize = (dv.accountSize as number) || 0
                    const currentBalance = (dv.currentAccountSize as number) || 0
                    const pnl = overallStats.pnl || 0
                    if (!limit) return '—'
                    const balanceDrawdown = currentBalance > 0 && accountSize > 0 ? Math.max(0, accountSize - currentBalance) : 0
                    const tradeDrawdown = Math.abs(Math.min(0, pnl))
                    const used = Math.max(balanceDrawdown, tradeDrawdown)
                    const pct = Math.min(100, (used / limit) * 100)
                    return `${Math.round(pct)}%`
                  })()}
                </span>
              </div>
              <div className="mt-[30px]">
                <div style={{ height: '22px', background: '#252A35', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%', background: '#4D6BFF', borderRadius: '999px',
                    transition: 'width .4s ease',
                    width: `${(() => {
                      const dv = selectedAccount.defaultValues || {}
                      const limit = (dv.maxTotalDrawdown as number) || 0
                      const accountSize = (dv.accountSize as number) || 0
                      const currentBalance = (dv.currentAccountSize as number) || 0
                      const pnl = overallStats.pnl || 0
                      const balanceDrawdown = currentBalance > 0 && accountSize > 0 ? Math.max(0, accountSize - currentBalance) : 0
                      const tradeDrawdown = Math.abs(Math.min(0, pnl))
                      const used = Math.max(balanceDrawdown, tradeDrawdown)
                      return limit ? Math.min(100, (used / limit) * 100) : 0
                    })()}%`,
                  }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                    <span>0%</span><span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-[20px] p-7 transition-all duration-250"
            style={{
              background: '#171A21',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 8px 30px rgba(0,0,0,.35)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,.45)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,.35)' }}>
            <div className="flex items-center justify-between mb-1">
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#B8C0D4' }}>Target Profit</p>
              <span style={{ background: '#222734', padding: '8px 16px', borderRadius: '999px', fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  {(() => {
                    const limit = (selectedAccount.defaultValues?.targetProfit as number) || 0
                    const accountSize = (selectedAccount.defaultValues?.accountSize as number) || 0
                    if (!limit) return '—'
                    const pct = accountSize > 0 ? ` (${((limit / accountSize) * 100).toFixed(0)}%)` : ''
                    return `+$${limit.toLocaleString()}${pct}`
                  })()}
                </span>
              </div>
              <div className="flex items-end gap-2 mt-1">
                <span style={{ fontSize: '58px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {(() => {
                    const dv = selectedAccount.defaultValues || {}
                    const limit = (dv.targetProfit as number) || 0
                    const accountSize = (dv.accountSize as number) || 0
                    const currentBalance = (dv.currentAccountSize as number) || 0
                    const startingBalance = (dv.startingBalance as number) || accountSize
                    const pnl = overallStats.pnl || 0
                    if (!limit) return '—'
                    const hasBalance = currentBalance > 0 && startingBalance > 0
                    const progress = hasBalance ? currentBalance - startingBalance : pnl
                    const rem = hasBalance
                      ? Math.max(0, (accountSize + limit) - currentBalance)
                      : Math.max(0, limit - pnl)
                    return `$${rem.toLocaleString()}`
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
                  const pct = limit > 0 ? Math.min(100, Math.max(0, (progress / limit) * 100)) : 0
                  return (
                    <>
                      <span style={{ fontSize: '22px', fontWeight: 500, color: '#D5D8DF', lineHeight: '58px' }}>left</span>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: '#22C55E', lineHeight: '58px', marginLeft: '8px' }}>
                        ({Math.round(pct)}%)
                      </span>
                    </>
                  )
                })()}
              </div>
              <div className="mt-[30px]">
                <div style={{ height: '22px', background: '#252A35', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    height: '100%', background: '#22C55E', borderRadius: '999px',
                    transition: 'width .4s ease',
                    width: `${(() => {
                      const dv = selectedAccount.defaultValues || {}
                      const limit = (dv.targetProfit as number) || 0
                      const accountSize = (dv.accountSize as number) || 0
                      const currentBalance = (dv.currentAccountSize as number) || 0
                      const startingBalance = (dv.startingBalance as number) || accountSize
                      const pnl = overallStats.pnl || 0
                      if (!limit) return 0
                      const hasBalance = currentBalance > 0 && startingBalance > 0
                      const progress = hasBalance ? currentBalance - startingBalance : pnl
                      return Math.min(100, Math.max(0, (progress / limit) * 100))
                    })()}%`,
                  }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                    <span>0%</span><span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {!selectedAccountId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-[20px] p-7 flex items-center justify-center"
            style={{ background: '#171A21', border: '1px solid rgba(255,255,255,0.05)', minHeight: '180px' }}>
            <p className="text-sm text-text-muted">Select an account to view challenge progress</p>
          </div>
          <div className="rounded-[20px] p-7 flex items-center justify-center"
            style={{ background: '#171A21', border: '1px solid rgba(255,255,255,0.05)', minHeight: '180px' }}>
            <p className="text-sm text-text-muted">Select an account to view challenge progress</p>
          </div>
        </div>
      )}

      <TradeCalendar
        selectedAccountId={selectedAccountId}
        startDate={sd}
        endDate={ed}
        year={calendarYear}
        month={calendarMonth}
        onMonthChange={handleCalendarMonthChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Equity Curve</h2>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">Loading...</div>
          ) : equityData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={equityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,30,56,0.5)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#5D5D7A' }} tickLine={false} axisLine={{ stroke: 'rgba(30,30,56,0.5)' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5D5D7A' }} tickLine={false} axisLine={{ stroke: 'rgba(30,30,56,0.5)' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgba(30,30,56,0.8)', background: 'rgba(26,26,46,0.9)', backdropFilter: 'blur(16px)', color: '#fff', fontSize: '13px' }}
                />
                <Line type="monotone" dataKey="equity" stroke={colors.primary} strokeWidth={2.5} dot={{ fill: colors.primary, r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: colors.primaryLight }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Result Distribution</h2>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">Loading...</div>
          ) : pieData.every((d) => d.value === 0) ? (
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
                    contentStyle={{ borderRadius: '16px', border: '1px solid rgba(30,30,56,0.8)', background: 'rgba(26,26,46,0.9)', backdropFilter: 'blur(16px)', color: '#fff', fontSize: '13px' }}
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
                <span className="text-sm font-medium text-text-primary w-24 truncate">{inst.instrument}</span>
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

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Recent Trades</h2>
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
      </div>
    </div>
  )
}
