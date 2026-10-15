import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import * as dashboardService from '../../services/dashboard'
import * as analyticsService from '../../services/analytics'
import type { CalendarDay } from '../../services/dashboard'
import type { MonthSummary } from '../../services/analytics'
import { cn } from '../../lib/utils'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface TradeCalendarProps {
  selectedAccountId: string
  startDate?: string
  endDate?: string
  year?: number
  month?: number
  onMonthChange?: (year: number, month: number) => void
  variant?: 'plain' | 'summary'
  onTradeClick?: (tradeId: string) => void
  onViewDay?: (dateStr: string) => void
  phase?: string
}

function fmt(v: number): string {
  return `${v >= 0 ? '+' : '-'}$${Math.abs(Number(v)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function TradeCalendar({ selectedAccountId, startDate, endDate, year: controlledYear, month: controlledMonth, onMonthChange, variant = 'plain', onTradeClick, onViewDay, phase }: TradeCalendarProps) {
  const now = new Date()
  const [internalYear, setInternalYear] = useState(now.getFullYear())
  const [internalMonth, setInternalMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState<MonthSummary | null>(null)

  const isControlled = controlledYear !== undefined && controlledMonth !== undefined
  const year = isControlled ? controlledYear : internalYear
  const month = isControlled ? controlledMonth : internalMonth
  const isSummaryMode = variant === 'summary'

  const [days, setDays] = useState<CalendarDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [openDay, setOpenDay] = useState<string | null>(null)
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowYearPicker(false)
      }
      if (openDay) {
        const el = dayRefs.current[openDay]
        if (!el || !el.contains(e.target as Node)) setOpenDay(null)
      }
    }
    if (showYearPicker || openDay) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showYearPicker, openDay])

  useEffect(() => {
    if (isSummaryMode) {
      setIsLoading(true)
      analyticsService.getMonthSummary(year, month, selectedAccountId || undefined)
        .then(setSummary)
        .catch(() => setSummary(null))
        .finally(() => setIsLoading(false))
      return
    }
    setIsLoading(true)
    dashboardService.getCalendarData(year, month, selectedAccountId || undefined, startDate, endDate, phase)
      .then(setDays)
      .catch(() => setDays([]))
      .finally(() => setIsLoading(false))
  }, [year, month, selectedAccountId, startDate, endDate, isSummaryMode, phase])

  const dayMap = useMemo(() => {
    const map: Record<string, CalendarDay> = {}
    days.forEach((d) => { map[d.date] = d })
    return map
  }, [days])

  const summaryDayMap = useMemo(() => {
    const map: Record<string, MonthSummary['days'][number]> = {}
    if (summary) summary.days.forEach((d) => { map[d.date] = d })
    return map
  }, [summary])

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()

  const { totalPnl, tradingDays, totalTrades } = useMemo(() => {
    let pnl = 0, trades = 0, td = 0
    days.forEach((d) => { pnl += d.pnl; trades += d.trades; if (d.trades > 0) td++ })
    return { totalPnl: Math.round(pnl * 100) / 100, tradingDays: td, totalTrades: trades }
  }, [days])

  function handleMonthChange(y: number, m: number) {
    setOpenDay(null)
    if (isControlled) {
      onMonthChange?.(y, m)
    } else {
      setInternalYear(y)
      setInternalMonth(m)
    }
  }

  function prevMonth() {
    if (month === 1) handleMonthChange(year - 1, 12)
    else handleMonthChange(year, month - 1)
  }

  function nextMonth() {
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)) return
    if (month === 12) handleMonthChange(year + 1, 1)
    else handleMonthChange(year, month + 1)
  }

  const streak = summary?.month.currentStreak

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-text-primary">Calendar</h2>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-2 text-text-muted hover:text-text-primary hover:bg-glass rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="relative" ref={pickerRef}>
            <button onClick={() => setShowYearPicker(!showYearPicker)}
              className="text-base font-semibold text-text-primary w-36 text-center hover:text-primary-light transition-colors px-2 py-1 rounded-lg hover:bg-glass">
              {MONTHS[month - 1]} {year}
            </button>
            {showYearPicker && (
              <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-elevated border border-border rounded-2xl shadow-2xl p-3 w-48 space-y-2">
                <div className="flex items-center justify-between gap-1 pb-2 border-b border-border">
                  <button type="button" onClick={() => handleMonthChange(year - 1, month)} className="p-1 text-text-muted hover:text-text-primary rounded-lg hover:bg-card transition-colors">
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-text-primary">{year}</span>
                  <button type="button" disabled={year >= now.getFullYear()} onClick={() => handleMonthChange(year + 1, month)} className={`p-1 rounded-lg transition-colors ${year >= now.getFullYear() ? 'text-text-muted/30 cursor-not-allowed' : 'text-text-muted hover:text-text-primary hover:bg-card'}`}>
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto scrollbar-thin">
                  {Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 2020 + i).map(y => (
                    <button key={y} type="button" onClick={() => { handleMonthChange(y, month); setShowYearPicker(false) }}
                      className={`text-sm py-2 rounded-lg font-medium transition-colors ${
                        y === year
                          ? 'bg-primary text-white'
                          : 'text-text-primary hover:bg-hover'
                      }`}>
                      {y}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-border">
                  {MONTHS.map((m, i) => {
                    const isFuture = year === now.getFullYear() && i + 1 > now.getMonth() + 1
                    return (
                      <button key={m} type="button" disabled={isFuture} onClick={() => { if (!isFuture) { handleMonthChange(year, i + 1); setShowYearPicker(false) } }}
                        className={`text-xs py-1.5 rounded-lg font-medium transition-colors ${
                          isFuture ? 'text-text-muted/30 cursor-not-allowed' : i + 1 === month ? 'bg-primary/20 text-primary-light' : 'text-text-primary hover:bg-hover'
                        }`}>
                        {m.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <button onClick={nextMonth} disabled={year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)}
            className={`p-2 rounded-lg transition-colors ${
              year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)
                ? 'text-text-muted/30 cursor-not-allowed'
                : 'text-text-muted hover:text-text-primary hover:bg-glass'
            }`}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isSummaryMode && summary ? (
        <div className="flex items-center justify-between mb-4 py-3 px-4 bg-glass rounded-xl border border-border">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-widest">Total P&amp;L</p>
            <p className={`text-2xl font-bold mt-0.5 ${summary.month.pnl >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(summary.month.pnl)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted uppercase tracking-widest">Avg Daily P&amp;L</p>
            <p className={`text-2xl font-bold mt-0.5 ${(summary.month.avgDailyPnl ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>{summary.month.avgDailyPnl != null ? fmt(summary.month.avgDailyPnl) : '—'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted uppercase tracking-widest">Avg RR</p>
            <p className="text-2xl font-bold text-text-primary mt-0.5">{summary.month.avgRR != null ? summary.month.avgRR.toFixed(2) : '—'}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-text-muted uppercase tracking-widest">Streak</p>
            <p className={`text-2xl font-bold mt-0.5 ${streak?.type === 'win' ? 'text-success' : streak?.type === 'loss' ? 'text-danger' : 'text-text-primary'}`}>
              {streak && streak.count > 0 ? `${streak.count}${streak.type === 'win' ? 'W' : 'L'}` : '—'}
            </p>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-xs text-text-muted uppercase tracking-widest">Trading Days</p>
            <p className="text-2xl font-bold text-text-primary mt-0.5">{summary.month.tradingDays}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4 py-3 px-4 bg-glass rounded-xl border border-border">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-widest">Total P&amp;L</p>
            <p className={`text-2xl font-bold mt-0.5 ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
              {totalPnl >= 0 ? '+' : ''}${Number(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted uppercase tracking-widest">Trading Days</p>
            <p className="text-2xl font-bold text-text-primary mt-0.5">{tradingDays}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted uppercase tracking-widest">Total Trades</p>
            <p className="text-2xl font-bold text-text-primary mt-0.5">{totalTrades}</p>
          </div>
        </div>
      )}

      {isSummaryMode && summary && summary.weeks.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {summary.weeks.map((w) => (
            <div key={w.start} className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium',
              summary.bestWeek?.start === w.start
                ? 'bg-success/10 border-success/30 text-success'
                : summary.worstWeek?.start === w.start && summary.bestWeek?.start !== w.start
                  ? 'bg-danger/10 border-danger/30 text-danger'
                  : 'bg-input border-border'
            )}>
              <span className="font-semibold text-text-primary">{w.label}</span>
              <span>{fmt(w.pnl)}</span>
              <span className="text-text-muted">{w.trades} trades</span>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="h-32 flex items-center justify-center text-text-muted text-sm">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-[3px] mb-1.5 overflow-x-auto scrollbar-hide">
            {DAYS.map((d, i) => (
              <div key={`${d}-${i}`} className="min-w-[44px] text-center text-[11px] text-text-secondary font-bold uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-[3px] overflow-x-auto scrollbar-hide">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const summaryDay = summaryDayMap[dateStr]
              const plainDay = dayMap[dateStr]
              const data = isSummaryMode ? summaryDay : plainDay
              const isToday = dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
              const isOpen = openDay === dateStr

return (
                <div key={dateStr} ref={(el) => { dayRefs.current[dateStr] = el }} className="relative group">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { if (data && data.trades > 0) setOpenDay(isOpen ? null : dateStr) }}
                    className={`min-w-[44px] h-20 sm:h-24 rounded-xl flex flex-col items-center justify-center text-sm relative transition-all hover:ring-1 hover:ring-border border border-border ${
                      isToday ? 'ring-2 ring-primary border-primary' : ''
                    } ${
                      data
                        ? data.pnl > 0
                          ? 'bg-success/25 text-success border-success/30'
                          : data.pnl < 0
                            ? 'bg-danger/25 text-danger border-danger/30'
                            : 'bg-info/10 text-info border-info/30'
                        : 'bg-glass/70 text-text-muted/70'
                    } ${data && data.trades > 0 ? 'cursor-pointer' : ''}`}
                  >
                    <span className="text-base sm:text-lg font-bold leading-none">{day}</span>
                    {data && (
                      <>
                        <span className="text-sm font-bold leading-none mt-1">
                          {data.pnl > 0 ? '+$' : data.pnl < 0 ? '-$' : '$'}{Math.abs(Number(data.pnl)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs font-semibold leading-none mt-0.5 text-text-muted">
                          {data.trades} trade{data.trades !== 1 ? 's' : ''}
                        </span>
                        {isSummaryMode && (data.trades > 0) && (
                          <span className="flex gap-1 mt-1">
                            {Array.from({ length: Math.min(data.wins, 5) }).map((_, wi) => (
                              <span key={`w${wi}`} className="w-1.5 h-1.5 rounded-full bg-success" />
                            ))}
                            {Array.from({ length: Math.min(data.losses, 5) }).map((_, li) => (
                              <span key={`l${li}`} className="w-1.5 h-1.5 rounded-full bg-danger" />
                            ))}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {isOpen && data && data.trades > 0 && (
                    <div className="absolute z-40 top-full left-0 right-0 mt-1 max-w-[280px] sm:w-64 sm:left-0 sm:right-auto mx-auto max-h-72 overflow-y-auto rounded-xl bg-elevated border border-border shadow-xl p-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted px-2 pb-1.5 pt-1">{dateStr} · {data.trades} trade{data.trades !== 1 ? 's' : ''}</p>
                      {isSummaryMode && summaryDay && summaryDay.tradeIds.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onTradeClick?.(t.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-hover transition-colors text-left"
                        >
                          <span className="text-xs font-medium text-text-primary w-20 truncate">{t.instrument}</span>
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded',
                            t.result === 'WIN' ? 'bg-success/10 text-success'
                              : t.result === 'LOSS' ? 'bg-danger/10 text-danger'
                              : 'bg-glass text-text-secondary')}>
                            {t.result === 'BREAK_EVEN' ? 'BE' : t.result ?? '—'}
                          </span>
                          <span className="ml-auto text-xs font-semibold text-right w-14">{t.pnl !== 0 ? fmt(t.pnl) : '$0'}</span>
                        </button>
                      ))}
                      {!isSummaryMode && (
                        <div className="px-2 py-1.5 text-xs text-text-muted">
                          <div className="flex justify-between"><span>P&L</span><span className={data.pnl >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold'}>{fmt(data.pnl)}</span></div>
                          <div className="flex justify-between mt-1"><span>W / L</span><span className="text-text-primary font-medium">{data.wins} / {data.losses}</span></div>
                        </div>
                      )}
                      {onViewDay && (
                        <button
                          type="button"
                          onClick={() => onViewDay(dateStr)}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-2 mt-1.5 rounded-lg border border-border/60 text-xs font-semibold text-primary-light hover:bg-hover transition-colors"
                        >
                          View full trading day
                          <span aria-hidden>→</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs font-medium text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-success/60" /> Win
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-danger/60" /> Loss
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-glass" /> Flat
            </span>
            <span className="flex items-center gap-1.5 ml-auto">
              <span className="w-3 h-3 rounded-sm border border-primary" /> Today
            </span>
          </div>
        </>
      )}
    </div>
  )
}