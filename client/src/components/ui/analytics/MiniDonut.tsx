import { useMemo } from 'react'

interface MiniDonutProps {
  data: Array<{ label: string; value: number; color?: 'success' | 'danger' | 'primary' | 'warning' | 'info' }>
  centerLabel?: string
  centerValue?: string | number
}

const SEG_COLORS: Record<string, string> = {
  success: '#34d399',
  danger: '#f87171',
  primary: '#a78bfa',
  warning: '#fbbf24',
  info: '#60a5fa',
}

const SEG_TAILWIND: Record<string, string> = {
  success: 'bg-success',
  danger: 'bg-danger',
  primary: 'bg-primary',
  warning: 'bg-warning',
  info: 'bg-info',
}

const RADIUS = 34
const CIRC = 2 * Math.PI * RADIUS

export function MiniDonut({ data, centerLabel, centerValue }: MiniDonutProps) {
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data])
  if (!data.length || total === 0) return null

  let acc = 0
  const strokes = data.map((d) => {
    const frac = d.value / total
    const dash = `${frac * CIRC} ${CIRC - frac * CIRC}`
    const offset = -acc
    acc += frac * CIRC
    return { ...d, dash, offset }
  })

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-28 h-28 shrink-0">
        <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
          <circle cx="42" cy="42" r={RADIUS} fill="none" strokeWidth="10" className="stroke-glass" />
          {strokes.map((s, i) => (
            <circle
              key={`${s.label}-${i}`}
              cx="42"
              cy="42"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              stroke={SEG_COLORS[s.color || 'primary']}
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-text-primary leading-none">{centerValue ?? total}</span>
          {centerLabel && <span className="text-[10px] text-text-muted mt-0.5">{centerLabel}</span>}
        </div>
      </div>
      <div className="space-y-1.5 flex-1 min-w-0">
        {data.map((d, i) => (
          <div key={`${d.label}-${i}`} className="flex items-center gap-2 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${SEG_TAILWIND[d.color || 'primary']}`} />
            <span className="truncate text-text-secondary">{d.label}</span>
            <span className="ml-auto font-semibold text-text-primary tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}