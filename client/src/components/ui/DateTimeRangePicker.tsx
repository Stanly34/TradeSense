import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronUp, ChevronDown, ArrowRight } from 'lucide-react'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface DateTimeRangePickerProps {
  label?: string
  entryValue?: string
  exitValue?: string
  onEntryChange?: (iso: string) => void
  onExitChange?: (iso: string) => void
  disableFuture?: boolean
}

type Segment = 'ENTRY' | 'EXIT'

interface TimeRowProps {
  seg: Segment
  h: string
  m: string
  todayOnly: boolean
  maxH: number
  maxM?: number
  minH?: number
  minM?: number
  onSetTime: (which: 'h' | 'm', raw: string, dir?: 1 | -1) => void
}

function TimeRow({ seg, h, m, todayOnly, maxH, maxM, minH, minM, onSetTime }: TimeRowProps) {
  const holdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const intRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const fnsRef = useRef<Record<string, () => void>>({})
  useEffect(() => () => { clearTimeout(holdRef.current); clearInterval(intRef.current) }, [])
  function makeHold(key: string, fn: () => void) {
    fnsRef.current[key] = fn
    const start = () => { fnsRef.current[key]?.(); holdRef.current = setTimeout(() => { intRef.current = setInterval(() => fnsRef.current[key]?.(), 100) }, 300) }
    const stop = () => { clearTimeout(holdRef.current); clearInterval(intRef.current) }
    return { onMouseDown: start, onMouseUp: stop, onMouseLeave: stop, onTouchStart: start, onTouchEnd: stop }
  }
  const hourFloor = minH ?? 0
  const minuteFloor = minH !== undefined && parseInt(h, 10) === minH ? (minM ?? 0) : 0
  const hourCeil = todayOnly ? maxH : 23
  const minuteCeil = todayOnly && parseInt(h, 10) === maxH ? (maxM ?? 59) : 59
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2">
      <span className={`text-[11px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${seg === 'ENTRY' ? 'text-primary-light' : 'text-text-secondary'}`}>
        {seg === 'ENTRY' ? 'Entry' : 'Exit'}
      </span>
      <div className="flex flex-col items-center">
        <button type="button" {...makeHold('hUp', () => onSetTime('h', '', 1))} className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none" disabled={parseInt(h, 10) >= hourCeil}><ChevronUp className="w-3.5 h-3.5" /></button>
        <input type="text" inputMode="numeric" value={h} placeholder="00" onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(-2)
            const v = Math.min(hourCeil, Math.max(hourFloor, parseInt(digits || '0', 10)))
            onSetTime('h', String(v).padStart(2, '0'))
          }}
          className="w-9 text-center text-lg font-bold text-text-primary bg-transparent outline-none" />
        <button type="button" {...makeHold('hDown', () => { if (parseInt(h, 10) - 1 >= hourFloor) onSetTime('h', '', -1) })} className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none" disabled={parseInt(h, 10) - 1 < hourFloor}><ChevronDown className="w-3.5 h-3.5" /></button>
      </div>
      <span className="text-lg font-bold text-text-primary">:</span>
      <div className="flex flex-col items-center">
        <button type="button" {...makeHold('mUp', () => { if (parseInt(m, 10) + 1 <= minuteCeil) onSetTime('m', '', 1) })} className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none" disabled={parseInt(m, 10) >= minuteCeil}><ChevronUp className="w-3.5 h-3.5" /></button>
        <input type="text" inputMode="numeric" value={m} placeholder="00" onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(-2)
            const v = Math.min(minuteCeil, Math.max(minuteFloor, parseInt(digits || '0', 10)))
            onSetTime('m', String(v).padStart(2, '0'))
          }}
          className="w-9 text-center text-lg font-bold text-text-primary bg-transparent outline-none" />
        <button type="button" {...makeHold('mDown', () => { if (parseInt(m, 10) - 1 >= minuteFloor) onSetTime('m', '', -1) })} className="p-0.5 text-text-muted hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none" disabled={parseInt(m, 10) - 1 < minuteFloor}><ChevronDown className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  )
}

export function DateTimeRangePicker({ label, entryValue, exitValue, onEntryChange, onExitChange, disableFuture = true }: DateTimeRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const nowRef = useRef(new Date())
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  function openPanel() {
    const e = entryValue ? new Date(entryValue) : null
    const x = exitValue ? new Date(exitValue) : null
    setStep(!e ? 1 : !x ? 2 : 3)
    const base = e ?? nowRef.current
    setYear(base.getFullYear())
    setMonth(base.getMonth() + 1)
    updatePos()
    setOpen((v) => !v)
  }

  function updatePos() {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const W = 320
    const estH = 460
    const left = Math.min(Math.max(8, r.left), window.innerWidth - W - 8)
    let top = r.bottom + 8
    if (top + estH > window.innerHeight - 8) top = Math.max(8, r.top - estH - 8)
    setPos({ top, left })
  }

  const entryDate = entryValue ? new Date(entryValue) : null
  const exitDate = exitValue ? new Date(exitValue) : null

  const entryH = entryDate ? String(entryDate.getHours()).padStart(2, '0') : '09'
  const entryM = entryDate ? String(entryDate.getMinutes()).padStart(2, '0') : '30'
  const exitH = exitDate ? String(exitDate.getHours()).padStart(2, '0') : '16'
  const exitM = exitDate ? String(exitDate.getMinutes()).padStart(2, '0') : '00'

  useEffect(() => {
    if (entryDate) { setYear(entryDate.getFullYear()); setMonth(entryDate.getMonth() + 1) }
  }, [entryValue])

  useEffect(() => {
    if (!open) return
    updatePos()
    const onScroll = () => updatePos()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    document.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  function clampToNow(d: Date): Date {
    return disableFuture && d > nowRef.current ? new Date(nowRef.current) : d
  }

  function commitEntry(d: Date) {
    const iso = clampToNow(d).toISOString()
    onEntryChange?.(iso)
    if (exitValue && new Date(iso) > new Date(exitValue)) onExitChange?.(iso)
  }

  function commitExit(d: Date) {
    let d2 = d
    if (entryValue && d < new Date(entryValue)) d2 = new Date(entryValue)
    d2 = clampToNow(d2)
    onExitChange?.(d2.toISOString())
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const todayStr = new Date().toDateString()

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (disableFuture) {
      const nextFirst = new Date(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1)
      if (nextFirst > nowRef.current) return
    }
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
  }

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  function pickEntryDay(day: number) {
    const dayDate = new Date(year, month - 1, day)
    if (disableFuture && dayDate > nowRef.current) return
    const h = entryDate?.getHours() ?? 9
    const m = entryDate?.getMinutes() ?? 30
    commitEntry(new Date(year, month - 1, day, h, m))
    setStep(2)
  }

  function pickExitDay(day: number) {
    const dayDate = new Date(year, month - 1, day)
    if (disableFuture && dayDate > nowRef.current) return
    if (entryDate && startOfDay(dayDate) < startOfDay(entryDate)) return
    const h = exitDate?.getHours() ?? 16
    const m = exitDate?.getMinutes() ?? 0
    commitExit(new Date(year, month - 1, day, h, m))
    setStep(3)
  }

  function setTime(seg: Segment, which: 'h' | 'm', raw: string, dir?: 1 | -1) {
    const baseDate = seg === 'ENTRY' ? (entryDate ?? clampToNow(new Date())) : (exitDate ?? entryDate ?? clampToNow(new Date()))
    const segToday = disableFuture && baseDate.toDateString() === nowRef.current.toDateString()
    const maxHcap = segToday ? nowRef.current.getHours() : 23
    const maxMcap = segToday && baseDate.getHours() === nowRef.current.getHours() ? nowRef.current.getMinutes() : 59
    let h: number
    let m: number
    if (dir) {
      h = baseDate.getHours(); m = baseDate.getMinutes()
      if (which === 'h') h = Math.min(maxHcap, Math.max(0, h + dir))
      else m = m === 59 && dir === 1 ? 0 : m === 0 && dir === -1 ? 59 : Math.min(maxMcap, Math.max(0, m + dir))
    } else {
      const digits = raw.replace(/\D/g, '').slice(-2)
      h = baseDate.getHours(); m = baseDate.getMinutes()
      if (which === 'h') h = Math.min(maxHcap, Math.max(0, parseInt(digits || '0')))
      else m = Math.min(maxMcap, Math.max(0, parseInt(digits || '0')))
    }
    const composed = new Date(baseDate); composed.setHours(h, m, 0, 0)
    if (seg === 'ENTRY') commitEntry(composed); else commitExit(composed)
  }

  const fmt = (iso?: string | null) => {
    if (!iso) return null
    const d = new Date(iso)
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const daysArray = useMemo(() => {
    const arr: (number | null)[] = []
    for (let i = 0; i < firstDayOfWeek; i++) arr.push(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    return arr
  }, [daysInMonth, firstDayOfWeek])

  const display = entryValue || exitValue
    ? `${fmt(entryValue) ?? '—'} → ${fmt(exitValue) ?? '—'}`
    : ''


  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-text-secondary">{label}</label>}
      <button type="button" ref={triggerRef}
        className="flex items-center gap-2.5 w-full text-left rounded-xl border border-border/80 px-3.5 py-2.5 text-sm bg-input/60 backdrop-blur-sm text-text-primary hover:border-primary/40 transition-all duration-200 cursor-pointer"
        onClick={openPanel}>
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary-light">
          <CalendarDays className="w-4 h-4" />
        </div>
        <span className="flex-1 text-text-primary font-medium truncate">{display || 'Pick trade window'}</span>
        <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
      </button>

      {open && pos && createPortal(
        <div ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 320 }}
          className="z-[70] bg-elevated border border-border rounded-2xl shadow-2xl p-5 space-y-4">
          {step < 3 && (
            <>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                  {step === 1 ? 'Entry day' : 'Exit day'}
                </span>
                <span className="text-[10px] font-bold text-text-muted bg-glass px-1.5 py-0.5 rounded-md">{step}/3</span>
                <span className="ml-auto text-xs text-text-muted">{MONTHS[month - 1]} {year}</span>
                <button type="button" onClick={prevMonth} className="p-1 text-text-muted hover:text-text-primary hover:bg-card rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button type="button" onClick={nextMonth} className="p-1 text-text-muted hover:text-text-primary hover:bg-card rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((d, i) => (
                  <span key={`${d}${i}`} className="text-[11px] font-semibold text-text-muted text-center py-1">{d}</span>
                ))}
                {daysArray.map((d, i) => {
                  if (d === null) return <div key={`e${i}`} />
                  const dayDate = new Date(year, month - 1, d)
                  const isFuture = disableFuture && dayDate > nowRef.current
                  const beforeEntry = step === 2 && !!entryDate && startOfDay(dayDate) < startOfDay(entryDate)
                  const isEntryCell = !!entryDate && startOfDay(dayDate).toDateString() === startOfDay(entryDate).toDateString()
                  const isExitCell = !!exitDate && startOfDay(dayDate).toDateString() === startOfDay(exitDate).toDateString()
                  const inRange = step === 2 && entryDate && exitDate &&
                    startOfDay(dayDate) > startOfDay(entryDate) && startOfDay(dayDate) < startOfDay(exitDate)
                  const endpoint = step === 1 ? isEntryCell : (isEntryCell || isExitCell)
                  return (
                    <button key={d} type="button" onClick={() => (step === 1 ? pickEntryDay(d) : pickExitDay(d))}
                      className={`text-sm py-2 rounded-xl font-medium transition-all ${
                        isFuture || beforeEntry ? 'opacity-30 pointer-events-none'
                          : endpoint ? 'bg-primary text-white shadow-lg shadow-primary/25'
                            : inRange ? 'bg-primary/15 text-primary-light'
                              : dayDate.toDateString() === todayStr ? 'bg-primary/10 text-primary-light'
                                : 'text-text-secondary hover:bg-card'
                      }`}>
                      {d}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { const b = entryDate ?? nowRef.current; setYear(b.getFullYear()); setMonth(b.getMonth() + 1); setStep(1) }}
                  className="flex items-center gap-1 text-xs font-bold text-primary hover:text-text-primary transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Change dates
                </button>
                <span className="ml-auto text-xs font-medium text-text-secondary">
                  {entryDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {exitDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div className="space-y-2 pt-1 border-t border-border">
                <TimeRow seg="ENTRY" h={entryH} m={entryM}
                  todayOnly={disableFuture && entryDate?.toDateString() === todayStr}
                  maxH={nowRef.current.getHours()}
                  maxM={nowRef.current.getMinutes()}
                  onSetTime={(which, raw, dir) => setTime('ENTRY', which, raw, dir)} />
                <TimeRow seg="EXIT" h={exitH} m={exitM}
                  todayOnly={disableFuture && (exitDate ?? entryDate)?.toDateString() === todayStr}
                  maxH={nowRef.current.getHours()}
                  maxM={nowRef.current.getMinutes()}
                  minH={entryDate && exitDate && startOfDay(entryDate).toDateString() === startOfDay(exitDate).toDateString() ? entryDate.getHours() : undefined}
                  minM={entryDate && exitDate && startOfDay(entryDate).toDateString() === startOfDay(exitDate).toDateString() ? entryDate.getMinutes() : undefined}
                  onSetTime={(which, raw, dir) => setTime('EXIT', which, raw, dir)} />
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
