const NY_TZ = 'America/New_York'

interface NyParts {
  y: number
  mo: number
  d: number
  h: number
  mi: number
}

function partsOf(t: Date): NyParts {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: NY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(t)
  const get = (type: string) => p.find((x) => x.type === type)?.value ?? ''
  let h = parseInt(get('hour'), 10)
  if (h === 24) h = 0
  return {
    y: parseInt(get('year'), 10),
    mo: parseInt(get('month'), 10),
    d: parseInt(get('day'), 10),
    h,
    mi: parseInt(get('minute'), 10),
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function keyOf(parts: NyParts) {
  return `${parts.y}-${pad(parts.mo)}-${pad(parts.d)}`
}

export function nykCalendarKey(t: Date): string {
  return keyOf(partsOf(t))
}

export function shiftDay(key: string, delta: number): string {
  const [y, mo, d] = key.split('-').map(Number)
  const shifted = new Date(Date.UTC(y, mo - 1, d + delta))
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

export function parseDayKey(key: string): { y: number; mo: number; d: number } {
  const [y, mo, d] = key.split('-').map(Number)
  return { y, mo, d }
}

export function nykSessionKey(t: Date): string {
  const p = partsOf(t)
  const key = keyOf(p)
  return p.h >= 17 ? shiftDay(key, 1) : key
}

function ny17Utc(dayKey: string): Date {
  const { y, mo, d } = parseDayKey(dayKey)
  for (const utcHour of [21, 22]) {
    const cand = new Date(Date.UTC(y, mo - 1, d, utcHour, 0, 0))
    const p = partsOf(cand)
    if (p.h === 17 && p.mi === 0) return cand
  }
  return new Date(Date.UTC(y, mo - 1, d, 21, 0, 0))
}

export function nykSessionStartUtc(dayKey: string): Date {
  return ny17Utc(shiftDay(dayKey, -1))
}

export function nykSessionEndUtc(dayKey: string): Date {
  return ny17Utc(dayKey)
}

export function nowNYKey(): string {
  return nykSessionKey(new Date())
}

export function nykNow(): Date {
  return new Date()
}