import { useMemo } from 'react'

interface MiniLineChartProps {
  data: Array<{ label: string; value: number }>
  height?: number
  tone?: 'auto' | 'success' | 'danger' | 'primary'
  unit?: string
  fill?: boolean
}

const TONE_HEX: Record<string, string> = {
  success: '#34d399',
  danger: '#f87171',
  primary: '#a78bfa',
  info: '#60a5fa',
}

function fmt(v: number, unit?: string): string {
  const rounded = Math.round(v * 100) / 100
  const sign = rounded >= 0 ? '+' : ''
  return unit ? `${sign}${rounded.toLocaleString()} ${unit}` : `${sign}${rounded.toLocaleString()}`
}

export function MiniLineChart({ data, height = 160, tone = 'auto', unit, fill = true }: MiniLineChartProps) {
  const values = data.map((d) => d.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const span = max - min || 1
  const pad = height * 0.12

  const color = useMemo(() => {
    if (tone !== 'auto') return tone
    const last = values[values.length - 1] ?? 0
    return last >= 0 ? 'success' : 'danger'
  }, [tone, values])

  const stroke = TONE_HEX[color] || TONE_HEX.info
  const tailwind = color === 'success' ? 'text-success' : color === 'danger' ? 'text-danger' : color === 'primary' ? 'text-primary' : 'text-info'

  if (data.length === 0) return null

  const points = data.map((d, i) => {
    const x = data.length === 1 ? 0 : (i / (data.length - 1)) * 100
    const y = height - pad - ((d.value - min) / span) * (height - pad * 2)
    return { x, y, ...d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = fill ? `${linePath} L 100 ${height} L 0 ${height} Z` : ''

  const first = points[0]
  const last = points[points.length - 1]
  const mid = points.length > 2 ? points[Math.floor((points.length - 1) / 2)] : undefined

  return (
    <div className="w-full">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={`mc-fill-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {fill && <path d={areaPath} fill={`url(#mc-fill-${color})`} />}
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.6" fill={stroke} vectorEffect="non-scaling-stroke">
            <title>{`${p.label}: ${fmt(p.value, unit)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex items-center justify-between text-[11px] text-text-muted mt-1">
        <span className="truncate">{first?.label}</span>
        {mid && <span className="truncate hidden sm:block">{mid.label}</span>}
        <span className="truncate">{last?.label}</span>
      </div>
      <div className={`mt-1 text-xs font-semibold ${tailwind}`}>{fmt(last.value, unit)}</div>
    </div>
  )
}