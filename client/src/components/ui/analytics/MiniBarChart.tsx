interface MiniBarChartProps {
  data: Array<{ label: string; value: number }>
  height?: number
  tone?: 'auto' | 'success' | 'danger' | 'primary'
  unit?: string
}

function fmt(v: number, unit?: string): string {
  const rounded = Math.round(v * 100) / 100
  return unit ? `${rounded.toLocaleString()} ${unit}` : rounded.toLocaleString()
}

function fmtSigned(v: number, unit?: string): string {
  const rounded = Math.round(v * 100) / 100
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : ''
  return `${sign}${fmt(rounded, unit)}`
}

export function MiniBarChart({ data, height = 160, tone = 'auto', unit }: MiniBarChartProps) {
  const values = data.map((d) => d.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const span = max - min || 1

  if (data.length === 0) return null

  return (
    <div className="w-full">
      <div className="relative w-full" style={{ height }}>
        <div className="absolute inset-x-0" style={{ top: `${(max / span) * (height - 8) + 4}px` }}>
          <div className="border-t border-border/60" />
        </div>
        {data.map((d, i) => {
          const barHeight = Math.max(2, (Math.abs(d.value) / span) * (height - 40))
          const isNeg = d.value < 0
          const bottom = isNeg ? height / 2 - barHeight : height / 2
          const barClass = tone === 'auto'
            ? isNeg ? 'bg-danger/70' : 'bg-success/70'
            : tone === 'success' ? 'bg-success/70' : tone === 'danger' ? 'bg-danger/70' : 'bg-primary/70'
          return (
            <div key={`${d.label}-${i}`} className="absolute flex flex-col items-center justify-end" style={{ left: `${(i / data.length) * 100}%`, width: `${100 / data.length}%`, bottom, height: height / 2 + 20 }}>
              <div className={`w-full max-w-[22px] rounded-t ${barClass}`} style={{ height: barHeight }}>
                <div className="w-full h-full">
                  <title>{`${d.label}: ${fmtSigned(d.value, unit)}`}</title>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex text-[10px] text-text-muted mt-1">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center truncate">{d.label}</span>
        ))}
      </div>
    </div>
  )
}