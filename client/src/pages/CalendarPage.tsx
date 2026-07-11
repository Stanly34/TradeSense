import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, CalendarDays } from 'lucide-react'
import * as dashboardService from '../services/dashboard'
import * as templateService from '../services/templates'
import type { CalendarDay } from '../services/dashboard'
import type { Template } from '../services/templates'
import { cn } from '../lib/utils'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [days, setDays] = useState<CalendarDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [accounts, setAccounts] = useState<Template[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
  const accountDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowYearPicker(false)
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) setAccountDropdownOpen(false)
    }
    if (showYearPicker || accountDropdownOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showYearPicker, accountDropdownOpen])

  useEffect(() => {
    templateService.listTemplates().then((all) => {
      setAccounts(all.filter((t) => t.type === 'PROP_FIRM' || t.type === 'PERSONAL_ACCOUNT'))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setIsLoading(true)
    dashboardService.getCalendarData(year, month, selectedAccountId || undefined)
      .then(setDays)
      .catch(() => setDays([]))
      .finally(() => setIsLoading(false))
  }, [year, month, selectedAccountId])

  const dayMap = useMemo(() => {
    const map: Record<string, CalendarDay> = {}
    days.forEach((d) => { map[d.date] = d })
    return map
  }, [days])

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [accounts])

  const { totalPnl, tradingDays, totalTrades } = useMemo(() => {
    let pnl = 0, trades = 0, td = 0
    days.forEach((d) => { pnl += d.pnl; trades += d.trades; if (d.trades > 0) td++ })
    return { totalPnl: Math.round(pnl * 100) / 100, tradingDays: td, totalTrades: trades }
  }, [days])

  const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1)

  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12) }
    else setMonth(month - 1)
  }

  function nextMonth() {
    if (isFuture) return
    if (month === 12) { setYear(year + 1); setMonth(1) }
    else setMonth(month + 1)
  }

  function handleMonthChange(y: number, m: number) {
    setYear(y); setMonth(m)
  }

  return (
    <div className="pt-5 px-5 pb-3 lg:pt-7 lg:px-7 lg:pb-4 h-[calc(100vh-4rem)] flex flex-col">
      {/* Top bar: account selector + summary */}
      <div className="flex items-center gap-4 mb-3 shrink-0">
        <div className="w-56 relative" ref={accountDropdownRef}>
          <button type="button" onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className={cn(
              'flex items-center gap-2 w-full rounded-lg border border-border/80 px-3 py-1.5 text-xs bg-input/60 backdrop-blur-sm transition-all duration-200',
              'hover:border-primary/40',
              accountDropdownOpen && 'border-primary shadow-[0_0_0_2px_rgba(124,58,237,0.12)]',
            )}>
            <CalendarDays className="w-3.5 h-3.5 text-primary-light shrink-0" />
            <span className={cn('flex-1 text-left truncate', !selectedAccountId && 'text-text-muted')}>
              {selectedAccountId
                ? accounts.find((a) => a.id === selectedAccountId)?.name || 'All Accounts'
                : 'All Accounts'}
            </span>
            <ChevronDown className={`w-3 h-3 text-text-muted shrink-0 transition-transform duration-200 ${accountDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {accountDropdownOpen && (
            <div className="absolute z-50 top-full mt-1 left-0 w-full bg-glass/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto">
              <button type="button" onClick={() => { setSelectedAccountId(''); setAccountDropdownOpen(false) }}
                className={cn('w-full text-left px-3 py-2 text-xs transition-colors', !selectedAccountId ? 'bg-primary/15 text-primary-light' : 'text-text-secondary hover:bg-card')}>
                All Accounts
              </button>
              {sortedAccounts.map((a) => (
                <button key={a.id} type="button" onClick={() => { setSelectedAccountId(a.id); setAccountDropdownOpen(false) }}
                  className={cn('w-full text-left px-3 py-2 text-xs transition-colors', selectedAccountId === a.id ? 'bg-primary/15 text-primary-light' : 'text-text-secondary hover:bg-card')}>
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="font-semibold uppercase tracking-wider text-text-secondary">P&L</span>
            <span className={`font-bold ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="font-semibold uppercase tracking-wider text-text-secondary">Days</span>
            <span className="font-bold text-text-primary">{tradingDays}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="font-semibold uppercase tracking-wider text-text-secondary">Trades</span>
            <span className="font-bold text-text-primary">{totalTrades}</span>
          </div>
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={prevMonth} className="p-1 text-text-muted hover:text-text-primary hover:bg-glass rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="relative" ref={pickerRef}>
            <button onClick={() => setShowYearPicker(!showYearPicker)}
              className="text-sm font-semibold text-text-primary w-28 text-center hover:text-primary-light transition-colors px-1.5 py-1 rounded-lg hover:bg-glass">
              {MONTHS[month - 1]} {year}
            </button>
            {showYearPicker && (
              <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-glass/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-3 w-48 space-y-2">
                <div className="flex items-center justify-between gap-1 pb-2 border-b border-border/50">
                  <button type="button" onClick={() => handleMonthChange(year - 1, month)} className="p-1 text-text-muted hover:text-text-primary rounded-lg hover:bg-card transition-colors">
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-text-primary">{year}</span>
                  <button type="button" onClick={() => { if (year < now.getFullYear()) handleMonthChange(year + 1, month) }} disabled={year >= now.getFullYear()} className={`p-1 rounded-lg transition-colors ${year >= now.getFullYear() ? 'text-text-muted/30 cursor-not-allowed' : 'text-text-muted hover:text-text-primary hover:bg-card'}`}>
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1 max-h-40 overflow-y-auto scrollbar-thin">
                  {Array.from({ length: now.getFullYear() - 2019 }, (_, i) => 2020 + i).map(y => {
                    const isFutureYear = y > now.getFullYear()
                    return (
                      <button key={y} type="button" onClick={() => { if (!isFutureYear) { handleMonthChange(y, month); setShowYearPicker(false) } }}
                        className={`text-xs py-1.5 rounded-lg font-medium transition-colors ${isFutureYear ? 'text-text-muted/30 cursor-not-allowed' : y === year ? 'bg-primary text-text-primary' : 'text-text-secondary hover:bg-card'}`}>
                        {y}
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-border/50">
                  {MONTHS.map((m, i) => {
                    const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && i + 1 > now.getMonth() + 1)
                    return (
                      <button key={m} type="button" onClick={() => { if (!isFutureMonth) { handleMonthChange(year, i + 1); setShowYearPicker(false) } }}
                        className={`text-[10px] py-1 rounded-lg font-medium transition-colors ${isFutureMonth ? 'text-text-muted/30 cursor-not-allowed' : i + 1 === month ? 'bg-primary/20 text-primary-light' : 'text-text-secondary hover:bg-card'}`}>
                        {m.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <button onClick={nextMonth} disabled={isFuture} className={`p-1 rounded-lg transition-colors ${isFuture ? 'text-text-muted/30 cursor-not-allowed' : 'text-text-muted hover:text-text-primary hover:bg-glass'}`}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 card pt-4 px-4 pb-3 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-text-muted text-sm">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-[3px] mb-1.5">
              {DAYS.map((d, i) => (
                <div key={`${d}-${i}`} className="text-center text-xs text-text-muted font-semibold py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 gap-[3px] auto-rows-fr">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const data = dayMap[dateStr]
                const isToday = dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
                return (
                  <div key={dateStr}
                    className={`rounded-xl flex flex-col items-center justify-center text-sm relative transition-all border border-border ${
                      isToday ? 'ring-2 ring-primary border-primary' : ''
                    } ${
                      data
                        ? data.pnl > 0
                          ? 'bg-success/25 text-success border-success/30'
                          : data.pnl < 0
                          ? 'bg-danger/25 text-danger border-danger/30'
                          : 'bg-glass text-text-muted'
                        : 'bg-glass/50 text-text-muted/30'
                    }`}>
                    <span className="text-base font-bold leading-none">{day}</span>
                    {data && (
                      <span className="text-xs font-bold leading-none mt-1">
                        {data.pnl > 0 ? '+$' : data.pnl < 0 ? '-$' : '$'}{Math.abs(Math.round(data.pnl))}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 pt-1.5 border-t border-border/50 text-xs text-text-muted shrink-0">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-success/60" /> Win</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-danger/60" /> Loss</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-glass" /> Flat</span>
              <span className="flex items-center gap-1.5 ml-auto"><span className="w-3 h-3 rounded-sm border border-primary" /> Today</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
