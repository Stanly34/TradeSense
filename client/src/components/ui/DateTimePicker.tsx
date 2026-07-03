import { useState, useEffect, useRef, useMemo } from 'react'
import { CalendarDays, Clock, ChevronUp, ChevronDown } from 'lucide-react'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const SESSION_RANGES: Record<string, { start: number; end: number } | null> = {
  ASIA: { start: 18, end: 24 },
  LONDON: { start: 2, end: 5 },
  NEW_YORK: { start: 8, end: 17 },
  CUSTOM: null,
}

interface DateTimePickerProps {
  label?: string
  value?: string
  onChange?: (iso: string) => void
  session?: string | null
  defaultTab?: 'date' | 'time'
  disableFuture?: boolean
}

export function DateTimePicker({ label, value, onChange, session, defaultTab = 'date', disableFuture = true }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'date' | 'time'>(defaultTab)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [hours, setHours] = useState('12')
  const [minutes, setMinutes] = useState('00')
  const ref = useRef<HTMLDivElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const holdIntervalRef = useRef<ReturnType<typeof setInterval>>()
  const hoursUpFnRef = useRef<() => void>(() => {})
  const hoursDownFnRef = useRef<() => void>(() => {})
  const minutesUpFnRef = useRef<() => void>(() => {})
  const minutesDownFnRef = useRef<() => void>(() => {})
  const nowRef = useRef(new Date())

  function makeHoldHandler(fn: () => void, fnRef: { current: () => void }) {
    fnRef.current = fn
    const start = () => {
      fnRef.current()
      holdTimerRef.current = setTimeout(() => {
        holdIntervalRef.current = setInterval(() => fnRef.current(), 40)
      }, 100)
    }
    const stop = () => {
      clearTimeout(holdTimerRef.current)
      clearInterval(holdIntervalRef.current)
    }
    return { onMouseDown: start, onMouseUp: stop, onMouseLeave: stop, onTouchStart: start, onTouchEnd: stop }
  }

  const selectedDate = value ? new Date(value) : null

  function localIso(hh: string, mm: string): string {
    const d = value ? new Date(value) : new Date()
    d.setHours(parseInt(hh))
    d.setMinutes(parseInt(mm))
    if (disableFuture && d > nowRef.current) return nowRef.current.toISOString()
    return d.toISOString()
  }

  useEffect(() => {
    if (selectedDate) {
      setYear(selectedDate.getFullYear())
      setMonth(selectedDate.getMonth() + 1)
      setHours(String(selectedDate.getHours()).padStart(2, '0'))
      setMinutes(String(selectedDate.getMinutes()).padStart(2, '0'))
    }
  }, [value])

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

  const sessionRange = session ? SESSION_RANGES[session] : null

  const allowedHours = useMemo(() => {
    if (!sessionRange) return Array.from({ length: 24 }, (_, i) => i)
    if (sessionRange.start < sessionRange.end) {
      return Array.from({ length: sessionRange.end - sessionRange.start }, (_, i) => sessionRange.start + i)
    }
    return Array.from({ length: 24 - sessionRange.start + sessionRange.end }, (_, i) =>
      (sessionRange.start + i) % 24
    )
  }, [sessionRange])

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

  const selectDay = (day: number) => {
    if (disableFuture && new Date(year, month - 1, day) > nowRef.current) return
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    const d = new Date(year, month - 1, day, h, m)
    if (disableFuture && d > nowRef.current) return
    onChange?.(d.toISOString())
    setTab('time')
  }

  const formatDisplay = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const daysArray = useMemo(() => {
    const arr: (number | null)[] = []
    for (let i = 0; i < firstDayOfWeek; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    return arr
  }, [daysInMonth, firstDayOfWeek])

  return (
    <div className="space-y-1.5" ref={ref}>
      {label && <label className="block text-sm font-medium text-text-secondary">{label}</label>}
      <div className="relative">
          <div className="flex items-center gap-2.5 w-full rounded-xl border border-border/80 px-3.5 py-2.5 text-sm bg-input/60 backdrop-blur-sm text-text-primary hover:border-primary/40 transition-all duration-200 cursor-text"
            onClick={() => setOpen(true)}>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary-light group-hover:bg-primary/20 transition-colors">
              {defaultTab === 'time' ? <Clock className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
            </div>
            <span className="flex-1 text-text-primary font-medium">{formatDisplay(value) || (defaultTab === 'time' ? 'Pick time' : 'Pick date & time')}</span>
            <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
          </div>
      </div>

      {open && (
        <div className="relative">
          <div className="absolute z-50 top-1 left-0 w-80 bg-glass/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-5 space-y-4">
            {defaultTab !== 'time' && (
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <button type="button" onClick={() => setTab('date')}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${tab === 'date' ? 'bg-primary/20 text-primary-light' : 'text-text-muted hover:text-text-secondary'}`}>Date</button>
                  <button type="button" onClick={() => setTab('time')}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${tab === 'time' ? 'bg-primary/20 text-primary-light' : 'text-text-muted hover:text-text-secondary'}`}>Time</button>
                </div>
                {selectedDate && (
                  <span className="text-xs text-text-muted">{formatDisplay(value)}</span>
                )}
              </div>
            )}
            {defaultTab === 'time' && selectedDate && (
              <div className="flex items-center justify-center">
                <span className="text-xs text-text-muted">{formatDisplay(value)}</span>
              </div>
            )}

            {tab === 'date' && (
              <>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={prevMonth} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-card rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-sm font-semibold text-text-primary">{MONTHS[month - 1]} {year}</span>
                  <button type="button" onClick={nextMonth} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-card rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map(d => (
                    <span key={d} className="text-[11px] font-semibold text-text-muted text-center py-1">{d}</span>
                  ))}
                  {daysArray.map((d, i) => {
                    if (d === null) return <div key={`e${i}`} />
                    const dayDate = new Date(year, month - 1, d)
                    const dateStr = dayDate.toDateString()
                    const isToday = dateStr === todayStr
                    const isFuture = disableFuture && dayDate > nowRef.current
                    const isSelected = selectedDate &&
                      selectedDate.getDate() === d &&
                      selectedDate.getMonth() === month - 1 &&
                      selectedDate.getFullYear() === year
                    return (
                      <button key={d} type="button" onClick={() => !isFuture && selectDay(d)}
                        className={`text-sm py-2 rounded-xl font-medium transition-all ${
                          isFuture
                            ? 'opacity-30 pointer-events-none'
                            : isSelected
                              ? 'bg-primary text-text-primary shadow-lg shadow-primary/25'
                              : isToday
                                ? 'bg-primary/10 text-primary-light'
                                : 'text-text-secondary hover:bg-card'
                        }`}>
                        {d}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {tab === 'time' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <button type="button" {...makeHoldHandler(() => {
                      const v = Math.max(0, parseInt(hours) - 1)
                      const hs = String(v).padStart(2, '0')
                      setHours(hs)
                      onChange?.(localIso(hs, minutes))
                    }, hoursUpFnRef)}
                      className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover transition-colors">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <input type="text" inputMode="numeric"
                      value={hours} placeholder="00"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(-2)
                        const maxH = disableFuture && selectedDate?.toDateString() === todayStr ? Math.min(23, nowRef.current.getHours()) : 23
                        const v = Math.min(maxH, Math.max(0, parseInt(raw || '0')))
                        const hs = String(v).padStart(2, '0')
                        setHours(hs)
                        if (raw.length >= 2) minuteRef.current?.focus()
                        onChange?.(localIso(hs, minutes))
                      }}
                      className="w-16 text-center text-3xl font-bold text-text-primary bg-transparent border-none outline-none" />
                    <button type="button" {...makeHoldHandler(() => {
                      const maxH = disableFuture && selectedDate?.toDateString() === todayStr ? Math.min(23, nowRef.current.getHours()) : 23
                      const v = Math.min(maxH, parseInt(hours) + 1)
                      const hs = String(v).padStart(2, '0')
                      setHours(hs)
                      onChange?.(localIso(hs, minutes))
                    }, hoursDownFnRef)}
                      className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover transition-colors">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-medium text-text-muted">HR</span>
                  </div>

                  <span className="text-3xl font-bold text-text-primary">:</span>

                  <div className="flex flex-col items-center gap-1">
                    <button type="button" {...makeHoldHandler(() => {
                      const cur = parseInt(minutes) || 0
                      const next = Math.max(0, cur - 1)
                      const ms = String(next).padStart(2, '0')
                      setMinutes(ms)
                      onChange?.(localIso(hours, ms))
                    }, minutesUpFnRef)}
                      className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover transition-colors">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <input ref={minuteRef} type="text" inputMode="numeric"
                      value={minutes} placeholder="00"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(-2)
                        const maxM = disableFuture && selectedDate?.toDateString() === todayStr && parseInt(hours) === nowRef.current.getHours() ? nowRef.current.getMinutes() : 59
                        const v = Math.min(maxM, Math.max(0, parseInt(raw || '0')))
                        const ms = String(v).padStart(2, '0')
                        setMinutes(ms)
                        onChange?.(localIso(hours, ms))
                      }}
                      className="w-16 text-center text-3xl font-bold text-text-primary bg-transparent border-none outline-none" />
                    <button type="button" {...makeHoldHandler(() => {
                      const cur = parseInt(minutes) || 0
                      const maxM = disableFuture && selectedDate?.toDateString() === todayStr && parseInt(hours) === nowRef.current.getHours() ? nowRef.current.getMinutes() : 59
                      const prev = Math.min(maxM, cur + 1)
                      const ms = String(prev).padStart(2, '0')
                      setMinutes(ms)
                      onChange?.(localIso(hours, ms))
                    }, minutesDownFnRef)}
                      className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover transition-colors">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-medium text-text-muted">MIN</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
