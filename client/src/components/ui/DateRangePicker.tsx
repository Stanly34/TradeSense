import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { CalendarDays, ArrowRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../../lib/utils'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartChange: (date: string) => void
  onEndChange: (date: string) => void
  disableFuture?: boolean
}

export function DateRangePicker({ startDate, endDate, onStartChange, onEndChange, disableFuture = true }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'start' | 'end'>('start')
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nowRef = useRef(new Date())

  const resetView = useCallback(() => {
    setMode('start')
    setYear(new Date().getFullYear())
    setMonth(new Date().getMonth() + 1)
    setShowYearPicker(false)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const todayStr = new Date().toDateString()

  const pad = (n: number) => String(n).padStart(2, '0')
  const localDateStr = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

  const daysArray = useMemo(() => {
    const arr: (number | null)[] = []
    for (let i = 0; i < firstDayOfWeek; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    return arr
  }, [daysInMonth, firstDayOfWeek])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (disableFuture) {
      const nextFirst = new Date(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1)
      if (nextFirst > nowRef.current) return
    }
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const formatDisplay = (dateStr: string) => {
    if (!dateStr) return null
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const startLabel = formatDisplay(startDate)
  const endLabel = formatDisplay(endDate)

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => { resetView(); setOpen(true) }}
        className={cn(
          'flex items-center gap-2.5 rounded-xl border border-border/80 px-3.5 py-2.5 text-sm bg-input/60 backdrop-blur-sm transition-all duration-200',
          'hover:border-primary/40',
          open && 'border-primary shadow-[0_0_0_2px_rgba(124,58,237,0.12)]'
        )}>
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary-light">
          <CalendarDays className="w-4 h-4" />
        </div>
        {startLabel && endLabel ? (
          <span className="text-text-primary font-medium text-xs sm:text-sm whitespace-nowrap">
            {startLabel} <ArrowRight className="w-3 h-3 inline mx-1 text-text-muted" /> {endLabel}
          </span>
        ) : (
          <span className="text-text-muted text-xs sm:text-sm">Select date range</span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 w-72 sm:w-80 bg-glass/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-card/50 rounded-lg p-0.5">
              <button type="button" onClick={() => setMode('start')}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                  mode === 'start' ? 'bg-primary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
                )}>
                Start
              </button>
              <button type="button" onClick={() => setMode('end')}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                  mode === 'end' ? 'bg-primary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
                )}>
                End
              </button>
            </div>
            <span className="text-[11px] text-text-muted font-medium">
              {mode === 'start' ? (startLabel || 'Not set') : (endLabel || 'Not set')}
            </span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <button type="button" onClick={() => setYear(y => y - 1)} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-card rounded-lg transition-colors">
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={prevMonth} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-card rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setShowYearPicker(!showYearPicker)}
              className="text-sm font-semibold text-text-primary hover:text-primary-light transition-colors px-2 py-1 rounded-lg hover:bg-card">
              {MONTHS[month - 1]} {year}
            </button>
            <button type="button" onClick={nextMonth} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-card rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setYear(y => disableFuture && y >= nowRef.current.getFullYear() ? y : y + 1)} className={cn('p-1.5 rounded-lg transition-colors', disableFuture && year >= nowRef.current.getFullYear() ? 'text-text-muted/30 pointer-events-none' : 'text-text-muted hover:text-text-primary hover:bg-card')}>
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          {showYearPicker && (
            <div className="grid grid-cols-4 gap-1 p-1 bg-card/50 rounded-xl max-h-48 overflow-y-auto scrollbar-thin">
              {Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 2020 + i).map(y => (
                <button key={y} type="button" onClick={() => { setYear(y); setShowYearPicker(false) }}
                  className={cn(
                    'text-sm py-2 rounded-lg font-medium transition-colors',
                    y === year
                      ? 'bg-primary text-text-primary'
                      : 'text-text-secondary hover:bg-card'
                  )}>
                  {y}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-7 gap-1">
            {DAYS.map(d => (
              <span key={d} className="text-[11px] font-semibold text-text-muted text-center py-1">{d}</span>
            ))}
            {daysArray.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />
              const dateObj = new Date(year, month - 1, d)
              const dateStr = dateObj.toDateString()
              const isToday = dateStr === todayStr
              const isFuture = disableFuture && dateObj > nowRef.current
              const isoDate = localDateStr(dateObj)

              const isStart = startDate === isoDate
              const isEnd = endDate === isoDate
              const inRange = startDate && endDate && isoDate > startDate && isoDate < endDate

              const isSelected = mode === 'start' ? isStart : isEnd

              return (
                <button key={d} type="button"
                  onClick={() => {
                    if (isFuture) return
                    const iso = localDateStr(new Date(year, month - 1, d))
                    if (mode === 'start') {
                      onStartChange(iso)
                      if (endDate && iso > endDate) {
                        // Auto-adjust end if start > end
                        onEndChange(iso)
                      }
                      setMode('end')
                    } else {
                      if (iso < startDate) {
                        // If end < start, swap
                        onEndChange(startDate)
                        onStartChange(iso)
                        setMode('end')
                      } else {
                        onEndChange(iso)
                        setOpen(false)
                      }
                    }
                  }}
                  className={cn(
                    'text-sm py-2 rounded-xl font-medium transition-all relative',
                    isFuture
                      ? 'opacity-30 pointer-events-none'
                      : isSelected
                        ? 'bg-primary text-text-primary shadow-lg shadow-primary/25'
                        : isToday
                          ? 'bg-primary/10 text-primary-light'
                          : 'text-text-secondary hover:bg-card',
                    !isFuture && inRange && 'bg-primary/10 rounded-none',
                    !isFuture && isStart && 'rounded-r-none bg-primary text-text-primary shadow-lg shadow-primary/25',
                    !isFuture && isEnd && 'rounded-l-none bg-primary text-text-primary shadow-lg shadow-primary/25'
                  )}>
                  {d}
                </button>
              )
            })}
          </div>

          <div className="flex justify-between pt-1">
            <button type="button" onClick={() => { onStartChange(''); onEndChange('') }}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors px-2 py-1">
              Clear
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="text-xs font-medium bg-primary/10 text-primary-light hover:bg-primary/20 px-4 py-1.5 rounded-lg transition-colors">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
