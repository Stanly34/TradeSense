import { useEffect, useMemo, useState, useRef } from 'react'
import {
  BarChart3, ChevronDown, TrendingUp, Target, Timer, Layers, PieChart,
  Flame, Brain, Camera, AlertTriangle, ClipboardCheck, Grid3x3, Gauge,
} from 'lucide-react'
import { StatCard } from '../components/ui'
import { ChartCard, MiniLineChart, MiniBarChart, MiniHBarChart, MiniDonut, DotStrip } from '../components/ui/analytics'
import * as analyticsService from '../services/analytics'
import * as accountService from '../services/accounts'
import { motion } from 'framer-motion'
import { PageHeader } from '../components/ui/PageHeader'
import { cn } from '../lib/utils'

const INTERVALS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
] as const

type Interval = (typeof INTERVALS)[number]['key']

const SESSION_LABEL: Record<string, string> = {
  LONDON: 'London',
  NEW_YORK: 'New York',
  ASIA: 'Asia',
  CUSTOM: 'Custom',
  UNSET: 'Unset',
}

function fmtMoney(v: number): string {
  const rounded = Math.round(v * 100) / 100
  const abs = Math.abs(rounded)
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : ''
  return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function hourLabel(h: number): string {
  const x = h % 12 === 0 ? 12 : h % 12
  return `${x}${h < 12 ? 'a' : 'p'}`
}

function shortDate(d: string): string {
  const dt = new Date(d + (d.length === 10 ? 'T12:00:00' : 'T00:00:00'))
  if (Number.isNaN(dt.getTime())) return d
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function shortMonth(m: string): string {
  const [y, mm] = m.split('-')
  return `${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(mm)]} ${y.slice(2)}`
}

const totalCount = (arr: Array<{ count: number }>) => arr.reduce((s, a) => s + a.count, 0)

export function AnalyticsPage() {
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const [interval, setInterval] = useState<Interval>('monthly')
  const [timeline, setTimeline] = useState<analyticsService.TimelineData | null>(null)
  const [distributions, setDistributions] = useState<analyticsService.Distributions | null>(null)
  const [timing, setTiming] = useState<analyticsService.TimingData | null>(null)
  const [behavior, setBehavior] = useState<analyticsService.BehaviorData | null>(null)
  const [trends, setTrends] = useState<analyticsService.TrendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false)
    }
    if (accountOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [accountOpen])

  useEffect(() => {
    accountService.listAccounts().then((all) => {
      setAccounts(all.filter((a) => a.type === 'PROP_FIRM' || a.type === 'PERSONAL_ACCOUNT').map((a) => ({ id: a.id, name: a.name })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const templateId = selectedAccountId || undefined
    Promise.all([
      analyticsService.getTimeline(interval, templateId),
      analyticsService.getDistributions(templateId),
      analyticsService.getTiming(templateId),
      analyticsService.getBehavior(templateId),
      analyticsService.getTrends(templateId),
    ])
      .then(([tl, dist, tmg, beh, trd]) => {
        if (cancelled) return
        setTimeline(tl)
        setDistributions(dist)
        setTiming(tmg)
        setBehavior(beh)
        setTrends(trd)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load analytics. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [interval, selectedAccountId])

  const equityData = useMemo(
    () => (timeline ? timeline.points.map((p) => ({ label: /^\d{4}-\d{2}$/.test(p.date) ? shortMonth(p.date) : shortDate(p.date), value: p.equity })) : []),
    [timeline],
  )
  const cumulativeBars = useMemo(
    () => (timeline ? timeline.points.map((p) => ({ label: /^\d{4}-\d{2}$/.test(p.date) ? shortMonth(p.date) : shortDate(p.date), value: p.equity })) : []),
    [timeline],
  )
  const drawdownData = useMemo(
    () => (timeline ? timeline.points.map((p) => ({ label: /^\d{4}-\d{2}$/.test(p.date) ? shortMonth(p.date) : shortDate(p.date), value: p.drawdown })) : []),
    [timeline],
  )
  const winRateTrend = useMemo(
    () => (trends ? trends.weekly.map((w) => ({ label: shortDate(w.start), value: w.winRate })) : []),
    [trends],
  )
  const hourBars = useMemo(
    () => (timing ? timing.hours.map((h) => ({ label: hourLabel(h.hour), value: h.trades })) : []),
    [timing],
  )
  const sessionBars = useMemo(
    () => (timing ? timing.sessions.map((s) => ({ label: SESSION_LABEL[s.session] || s.session, value: s.trades, sub: `${s.wins}W` })) : []),
    [timing],
  )
  const weekdayBars = useMemo(
    () => (timing ? timing.weekdays.filter((w) => w.trades > 0).map((w) => ({ label: w.label, value: w.winRate })) : []),
    [timing],
  )
  const monthlyBars = useMemo(
    () => (trends ? trends.monthly.map((m) => ({ label: shortMonth(m.month), value: m.pnl })) : []),
    [trends],
  )
  const streakItems = useMemo(
    () => (behavior ? behavior.streaks.map((s) => ({ label: shortDate(s.start), color: s.type === 'win' ? 'success' as const : 'danger' as const, count: s.count })) : []),
    [behavior],
  )
  const psychLine = useMemo(
    () => (behavior ? behavior.psychology.points.map((p) => ({ label: shortDate(p.date), value: p.score })) : []),
    [behavior],
  )
  const screenshotBars = useMemo(
    () => (behavior ? behavior.screenshots.weeks.map((w) => ({ label: shortDate(w.week), value: w.count })) : []),
    [behavior],
  )
  const setupBars = useMemo(
    () => (behavior ? behavior.setups.map((s) => ({ label: s.setup, value: s.pnl, sub: `${s.winRate}%` })) : []),
    [behavior],
  )
  const checklistBars = useMemo(
    () => (behavior ? behavior.checklists.items.map((i) => ({ label: i.name, value: i.missed, sub: `${i.done}/${i.done + i.missed}` })) : []),
    [behavior],
  )
  const mistakeBars = useMemo(
    () => (behavior ? behavior.mistakes.keywords.map((k) => ({ label: k.keyword, value: k.count })) : []),
    [behavior],
  )
  const qualityLine = useMemo(
    () => (behavior ? behavior.quality.points.map((p) => ({ label: shortDate(p.date), value: p.score })) : []),
    [behavior],
  )

  const bestStreak = useMemo(() => {
    if (!behavior || !behavior.streaks.length) return null
    const max = behavior.streaks.reduce((a, b) => (b.count > a.count ? b : a), behavior.streaks[0])
    return { count: max.count, type: max.type }
  }, [behavior])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="Analytics" subtitle="Deep insights into your trading performance." />
        <div className="h-64 flex items-center justify-center text-text-muted text-sm">Loading analytics…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="Analytics" subtitle="Deep insights into your trading performance." />
        <div className="card p-10 text-center text-danger text-sm">{error}</div>
      </div>
    )
  }

  const rrCount = distributions ? totalCount(distributions.rr) : 0
  const profitCount = distributions ? totalCount(distributions.profits) : 0
  const sizeCount = distributions ? totalCount(distributions.sizes) : 0
  const longShortTotal = distributions ? distributions.longShort.long + distributions.longShort.short : 0

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <PageHeader title="Analytics" subtitle="Deep insights into your trading performance." />
        <div className="w-64 max-w-full relative md:ml-auto" ref={accountRef}>
          <button type="button" onClick={() => setAccountOpen(!accountOpen)}
            className={cn(
              'flex items-center gap-2 w-full rounded-xl border border-border/80 px-3.5 py-2.5 text-sm bg-input transition-colors',
              'hover:border-primary/40',
              accountOpen && 'border-primary shadow-[0_0_0_2px_rgba(79,70,229,0.12)]',
            )}>
            <span className={cn('flex-1 text-left truncate', !selectedAccountId && 'text-text-muted')}>
              {selectedAccountId ? accounts.find((a) => a.id === selectedAccountId)?.name || 'All Accounts' : 'All Accounts'}
            </span>
            <ChevronDown className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`} />
          </button>
          {accountOpen && (
            <div className="absolute z-50 top-full mt-1 left-0 w-full bg-elevated border border-border rounded-xl shadow-xl py-1 max-h-60 overflow-y-auto">
              <button type="button" onClick={() => { setSelectedAccountId(''); setAccountOpen(false) }}
                className={cn('w-full text-left px-3.5 py-2.5 text-sm transition-colors', selectedAccountId ? 'text-text-primary hover:bg-hover' : 'bg-primary text-white font-medium')}>
                All Accounts
              </button>
              {accounts.map((a) => (
                <button key={a.id} type="button" onClick={() => { setSelectedAccountId(a.id); setAccountOpen(false) }}
                  className={cn('w-full text-left px-3.5 py-2.5 text-sm transition-colors', selectedAccountId === a.id ? 'bg-primary text-white font-medium' : 'text-text-primary hover:bg-hover')}>
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total P&L" value={timeline ? fmtMoney(timeline.totalPnl) : '—'} color={(timeline?.totalPnl ?? 0) >= 0 ? 'success' : 'danger'} icon={<TrendingUp className="w-4 h-4" />} />
        <StatCard label="Max Drawdown" value={timeline && timeline.maxDrawdown < 0 ? fmtMoney(timeline.maxDrawdown) : '—'} color="danger" icon={<TrendingDownIcon />} />
        <StatCard label="Best Streak" value={bestStreak ? `${bestStreak.count}${bestStreak.type === 'win' ? 'W' : 'L'}` : '—'} color={bestStreak?.type === 'win' ? 'success' : 'default'} icon={<Flame className="w-4 h-4" />} />
        <StatCard label="Avg Trade Quality" value={behavior?.quality.avg != null ? `${behavior.quality.avg}/100` : '—'} color="primary" icon={<Gauge className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <ChartCard
          title="Equity Curve"
          subtitle="Account balance growth over time"
          icon={<TrendingUp className="w-4 h-4" />}
          empty={equityData.length === 0}
          action={
            <div className="flex items-center gap-1 bg-glass rounded-lg p-1">
              {INTERVALS.map((iv) => (
                <button
                  key={iv.key}
                  type="button"
                  onClick={() => setInterval(iv.key)}
                  className={cn('px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors', interval === iv.key ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary')}
                >
                  {iv.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="xl:col-span-2">
            <MiniLineChart data={equityData} height={200} unit="$" />
          </div>
        </ChartCard>

        <ChartCard
          title="Cumulative P&L"
          subtitle={timeline ? `${timeline.points.length} ${interval} buckets` : undefined}
          icon={<BarChart3 className="w-4 h-4" />}
          empty={cumulativeBars.length === 0}
        >
          <MiniBarChart data={cumulativeBars} height={200} unit="$" />
        </ChartCard>

        <ChartCard
          title="Win Rate Trend"
          subtitle="Weekly win rate progression"
          icon={<Target className="w-4 h-4" />}
          empty={winRateTrend.length === 0}
        >
          <MiniLineChart data={winRateTrend} tone="primary" unit="%" height={180} />
        </ChartCard>

        <ChartCard
          title="RR Distribution"
          subtitle="How your reward-to-risk spreads"
          icon={<Grid3x3 className="w-4 h-4" />}
          empty={rrCount === 0}
        >
          <MiniHBarChart data={distributions ? distributions.rr.map((b) => ({ label: b.bucket, value: b.count })) : []} tone="primary" />
        </ChartCard>

        <ChartCard
          title="Profit Distribution"
          subtitle="P&L per trade in dollar buckets"
          icon={<BarChart3 className="w-4 h-4" />}
          empty={profitCount === 0}
        >
          <MiniHBarChart data={distributions ? distributions.profits.map((b) => ({ label: b.bucket, value: b.count })) : []} />
        </ChartCard>

        <ChartCard
          title="Best Trading Hours"
          subtitle="Trade frequency by hour"
          icon={<Timer className="w-4 h-4" />}
          empty={hourBars.length === 0}
        >
          <MiniBarChart data={hourBars} height={180} unit=" trades" />
        </ChartCard>

        <ChartCard
          title="Session Performance"
          subtitle="Where your sessions land"
          icon={<Layers className="w-4 h-4" />}
          empty={sessionBars.length === 0}
        >
          <MiniHBarChart data={sessionBars} tone="success" />
        </ChartCard>

        <ChartCard
          title="Weekday Performance"
          subtitle="Win rate per weekday"
          icon={<Grid3x3 className="w-4 h-4" />}
          empty={weekdayBars.length === 0}
        >
          <MiniBarChart data={weekdayBars} height={180} unit="%" />
        </ChartCard>

        <ChartCard
          title="Monthly Performance"
          subtitle="P&L per month"
          icon={<TrendingUp className="w-4 h-4" />}
          empty={monthlyBars.length === 0}
        >
          <MiniBarChart data={monthlyBars} height={180} unit="$" />
        </ChartCard>

        <ChartCard
          title="Long vs Short"
          subtitle="Directional breakdown"
          icon={<PieChart className="w-4 h-4" />}
          empty={longShortTotal === 0}
        >
          {distributions && (
            <MiniDonut
              centerLabel="trades"
              centerValue={longShortTotal}
              data={[
                { label: `Long (${distributions.longShort.longWins}W · ${fmtMoney(distributions.longShort.longPnl)})`, value: distributions.longShort.long, color: 'success' },
                { label: `Short (${distributions.longShort.shortWins}W · ${fmtMoney(distributions.longShort.shortPnl)})`, value: distributions.longShort.short, color: 'danger' },
              ]}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Streak Timeline"
          subtitle="Consecutive win / loss runs"
          icon={<Flame className="w-4 h-4" />}
          empty={streakItems.length === 0}
        >
          <DotStrip items={streakItems} />
        </ChartCard>

        <ChartCard
          title="Psychology Graph"
          subtitle="Rating-based discipline score per trade"
          icon={<Brain className="w-4 h-4" />}
          empty={psychLine.length === 0}
        >
          <MiniLineChart data={psychLine} tone="primary" height={160} />
        </ChartCard>

        <ChartCard
          title="Screenshot Frequency"
          subtitle="Screenshots used per week"
          icon={<Camera className="w-4 h-4" />}
          empty={screenshotBars.length === 0}
        >
          <MiniBarChart data={screenshotBars} height={160} tone="primary" />
        </ChartCard>

        <ChartCard
          title="Drawdown Curve"
          subtitle="Depth of losing periods"
          icon={<TrendingDownIcon />}
          empty={drawdownData.length === 0}
        >
          <MiniLineChart data={drawdownData} height={160} unit="$" />
        </ChartCard>

        <ChartCard
          title="Average Winner vs Loser"
          subtitle="Magnitude of wins against losses"
          icon={<Target className="w-4 h-4" />}
          empty={!behavior || (behavior.avgWinVsLoss.avgWin == null && behavior.avgWinVsLoss.avgLoss == null)}
        >
          {behavior && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-success/10 border border-success/25 p-4 text-center">
                <p className="text-[11px] uppercase tracking-wide text-success font-semibold">Avg Winner</p>
                <p className="text-xl font-bold text-success mt-1">{behavior.avgWinVsLoss.avgWin != null ? `+$${Math.abs(behavior.avgWinVsLoss.avgWin).toFixed(2)}` : '—'}</p>
                <p className="text-[11px] text-text-muted mt-1">{behavior.avgWinVsLoss.winCount} winners</p>
              </div>
              <div className="rounded-xl bg-danger/10 border border-danger/25 p-4 text-center">
                <p className="text-[11px] uppercase tracking-wide text-danger font-semibold">Avg Loser</p>
                <p className="text-xl font-bold text-danger mt-1">{behavior.avgWinVsLoss.avgLoss != null ? `-${Math.abs(behavior.avgWinVsLoss.avgLoss).toFixed(2)}` : '—'}</p>
                <p className="text-[11px] text-text-muted mt-1">{behavior.avgWinVsLoss.lossCount} losers</p>
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Position Size Distribution"
          subtitle="Quantity used per trade"
          icon={<Grid3x3 className="w-4 h-4" />}
          empty={sizeCount === 0}
        >
          <MiniHBarChart data={distributions ? distributions.sizes.map((b) => ({ label: b.bucket, value: b.count })) : []} tone="primary" />
        </ChartCard>

        <ChartCard
          title="Setup Performance"
          subtitle="P&L per entry setup"
          icon={<Grid3x3 className="w-4 h-4" />}
          empty={setupBars.length === 0}
        >
          <MiniHBarChart data={setupBars} />
        </ChartCard>

        <ChartCard
          title="Checklist Performance"
          subtitle="Missed checklist items"
          icon={<ClipboardCheck className="w-4 h-4" />}
          empty={checklistBars.length === 0}
        >
          {behavior?.checklists.completionRate != null && (
            <div className="mb-3 text-xs text-text-muted">
              Overall completion <span className="font-semibold text-text-primary">{behavior.checklists.completionRate}%</span>
            </div>
          )}
          <MiniHBarChart data={checklistBars} tone="danger" />
        </ChartCard>

        <ChartCard
          title="Mistake Frequency"
          subtitle="Mistake keywords across journals"
          icon={<AlertTriangle className="w-4 h-4" />}
          empty={mistakeBars.length === 0}
        >
          <MiniHBarChart data={mistakeBars} tone="danger" />
        </ChartCard>

        <ChartCard
          title="Trade Quality Score"
          subtitle="Composite quality score per trade (0-100)"
          icon={<Gauge className="w-4 h-4" />}
          empty={qualityLine.length === 0}
        >
          <MiniLineChart data={qualityLine} tone="primary" height={160} />
        </ChartCard>
      </div>
    </motion.div>
  )
}

function TrendingDownIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 17l5-5-5-5" /><path d="M21 12H9a4 4 0 0 0-4 4v4" />
    </svg>
  )
}