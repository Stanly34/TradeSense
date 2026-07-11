import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import * as dashboardService from '../../services/dashboard'
import type { CalendarDay } from '../../services/dashboard'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface TradeCalendarProps {
  selectedAccountId: string
  startDate?: string
  endDate?: string
  year?: number
  month?: number
  onMonthChange?: (year: number, month: number) => void
}

export function TradeCalendar({ selectedAccountId, startDate, endDate, year: controlledYear, month: controlledMonth, onMonthChange }: TradeCalendarProps) {
  const now = new Date()
  const [internalYear, setInternalYear] = useState(now.getFullYear())
  const [internalMonth, setInternalMonth] = useState(now.getMonth() + 1)

  const isControlled = controlledYear !== undefined && controlledMonth !== undefined
  const year = isControlled ? controlledYear : internalYear
  const month = isControlled ? controlledMonth : internalMonth
  const [days, setDays] = useState<CalendarDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowYearPicker(false)
      }
    }
    if (showYearPicker) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showYearPicker])

  useEffect(() => {
    setIsLoading(true)
    dashboardService.getCalendarData(year, month, selectedAccountId || undefined, startDate, endDate)
      .then(setDays)
      .catch(() => setDays([]))
      .finally(() => setIsLoading(false))
  }, [year, month, selectedAccountId, startDate, endDate])

  const dayMap = useMemo(() => {
    const map: Record<string, CalendarDay> = {}
    days.forEach((d) => { map[d.date] = d })
    return map
  }, [days])

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()

  const { totalPnl, tradingDays, totalTrades } = useMemo(() => {
    let pnl = 0, trades = 0, td = 0
    days.forEach((d) => { pnl += d.pnl; trades += d.trades; if (d.trades > 0) td++ })
    return { totalPnl: Math.round(pnl * 100) / 100, tradingDays: td, totalTrades: trades }
  }, [days])

  function handleMonthChange(y: number, m: number) {
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
              <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-glass/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-3 w-48 space-y-2">
                <div className="flex items-center justify-between gap-1 pb-2 border-b border-border/50">
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
                          ? 'bg-primary text-text-primary'
                          : 'text-text-secondary hover:bg-card'
                      }`}>
                      {y}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-border/50">
                  {MONTHS.map((m, i) => {
                    const isFuture = year === now.getFullYear() && i + 1 > now.getMonth() + 1
                    return (
                      <button key={m} type="button" disabled={isFuture} onClick={() => { if (!isFuture) { handleMonthChange(year, i + 1); setShowYearPicker(false) } }}
                        className={`text-xs py-1.5 rounded-lg font-medium transition-colors ${
                          isFuture ? 'text-text-muted/30 cursor-not-allowed' : i + 1 === month ? 'bg-primary/20 text-primary-light' : 'text-text-secondary hover:bg-card'
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

      <div className="flex items-center justify-between mb-4 py-3 px-4 bg-glass rounded-xl border border-border/50">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-widest">Total P&amp;L</p>
          <p className={`text-2xl font-bold mt-0.5 ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)}
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

      {isLoading ? (
        <div className="h-32 flex items-center justify-center text-text-muted text-sm">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-[3px] mb-1.5">
            {DAYS.map((d, i) => (
              <div key={`${d}-${i}`} className="text-center text-sm text-text-muted font-semibold py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-[3px]">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const data = dayMap[dateStr]
              const isToday = dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

              return (
                <div
                  key={dateStr}
                  className={`h-24 rounded-xl flex flex-col items-center justify-center text-sm relative transition-all hover:ring-1 hover:ring-border border border-border ${
                    isToday ? 'ring-2 ring-primary border-primary' : ''
                  } ${
                    data
                      ? data.pnl > 0
                        ? 'bg-success/25 text-success border-success/30'
                        : data.pnl < 0
                        ? 'bg-danger/25 text-danger border-danger/30'
                        : 'bg-glass text-text-muted'
                      : 'bg-glass/50 text-text-muted/40'
                  }`}
                >
                   <span className="text-lg font-bold leading-none">{day}</span>
                  {data && (
                    <>
                      <span className="text-sm font-bold leading-none mt-1">
                        {data.pnl > 0 ? '+$' : data.pnl < 0 ? '-$' : '$'}{Math.abs(Math.round(data.pnl))}
                      </span>
                      <span className="text-xs font-semibold leading-none mt-0.5 text-white/70">
                        {data.trades} trade{data.trades !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50 text-sm text-text-muted">
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