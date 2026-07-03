import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react'

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function getFriday(mon: Date): Date {
  const fri = new Date(mon)
  fri.setDate(fri.getDate() + 4)
  return fri
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const startDay = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: (Date | null)[][] = []
  let week: (Date | null)[] = []
  const prevMonthDays = new Date(year, month, 0).getDate()
  for (let i = startDay - 1; i >= 0; i--) {
    week.push(new Date(year, month - 1, prevMonthDays - i))
  }
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(year, month, d))
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) {
    let fill = 1
    while (week.length < 7) {
      week.push(new Date(year, month + 1, fill++))
    }
    weeks.push(week)
  }
  return weeks
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

interface WeekPickerProps {
  label?: string
  value?: string
  onChange?: (mondayIso: string) => void
}

export function WeekPicker({ label, value, onChange }: WeekPickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initialMonday = value ? new Date(value + 'T00:00:00') : getMonday(new Date())
  const [monday, setMonday] = useState(initialMonday)
  const [viewYear, setViewYear] = useState(monday.getFullYear())
  const [viewMonth, setViewMonth] = useState(monday.getMonth())

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setMonday(d)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const fri = getFriday(monday)

  function selectWeek(mon: Date) {
    setMonday(mon)
    setViewYear(mon.getFullYear())
    setViewMonth(mon.getMonth())
    onChange?.(toISODate(mon))
    setOpen(false)
  }

  function prevWeek(e: React.MouseEvent) {
    e.stopPropagation()
    const prev = new Date(monday)
    prev.setDate(prev.getDate() - 7)
    setMonday(prev)
    setViewYear(prev.getFullYear())
    setViewMonth(prev.getMonth())
    onChange?.(toISODate(prev))
  }

  function nextWeek(e: React.MouseEvent) {
    e.stopPropagation()
    const next = new Date(monday)
    next.setDate(next.getDate() + 7)
    setMonday(next)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
    onChange?.(toISODate(next))
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11) }
    else setViewMonth(viewMonth - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0) }
    else setViewMonth(viewMonth + 1)
  }

  const weeks = getMonthGrid(viewYear, viewMonth)
  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-1.5" ref={ref}>
      {label && <label className="block text-sm font-medium text-text-secondary">{label}</label>}
      <div className="relative">
        <div className="flex items-center gap-2.5 w-full rounded-xl border border-border/80 px-3.5 py-2.5 text-sm bg-input/60 backdrop-blur-sm text-text-primary hover:border-primary/40 transition-all duration-200 cursor-pointer"
          onClick={() => setOpen(true)}>
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary-light transition-colors">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <button type="button" onClick={prevWeek}
            className="p-1 text-text-muted hover:text-text-primary hover:bg-hover rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 flex items-center gap-3 cursor-pointer" onClick={() => setOpen(true)}>
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">From</span>
              <span className="text-sm font-semibold text-text-primary">{formatDateLong(monday)}</span>
            </div>
            <span className="text-text-muted text-lg font-light">→</span>
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">To</span>
              <span className="text-sm font-semibold text-text-primary">{formatDateLong(fri)}</span>
            </div>
          </div>
          <button type="button" onClick={nextWeek}
            className="p-1 text-text-muted hover:text-text-primary hover:bg-hover rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {open && (
          <div className="absolute z-50 mt-1 left-0 w-80 bg-[#1E1E2E] border border-[#2A2A3E] rounded-2xl shadow-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <button type="button" onClick={prevMonth}
                className="p-1.5 text-text-muted hover:text-white hover:bg-[#2A2A3E] rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-white">{monthLabel}</span>
              <button type="button" onClick={nextMonth}
                className="p-1.5 text-text-muted hover:text-white hover:bg-[#2A2A3E] rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {weeks.map((week, i) => {
                const mon = week.find(d => d && d.getDay() === 1)
                const fri = week.find(d => d && d.getDay() === 5)
                if (!mon || !fri) return null
                const inMonth = mon.getMonth() === viewMonth
                const isSelected = isSameDay(mon, monday)
                return (
                  <button key={i} type="button" onClick={() => selectWeek(mon)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all ${
                      isSelected
                        ? 'bg-primary/20 text-white font-semibold ring-1 ring-primary/50'
                        : inMonth
                          ? 'text-text-primary hover:bg-[#2A2A3E]'
                          : 'text-text-muted/30 hover:bg-[#2A2A3E]'
                    }`}>
                    <span>{formatDateLong(mon)}</span>
                    <span className={`text-xs font-medium ${isSelected ? 'text-primary-light' : 'text-text-muted'}`}>→</span>
                    <span>{formatDateLong(fri)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
