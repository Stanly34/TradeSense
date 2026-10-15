interface MiniHBarChartProps {
  data: Array<{ label: string; value: number; sub?: string }>
  tone?: 'auto' | 'success' | 'danger' | 'primary'
}

export function MiniHBarChart({ data, tone = 'auto' }: MiniHBarChartProps) {
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.value), 1)

  const barClass = (v: number) => {
    if (tone !== 'auto') return tone === 'success' ? 'bg-success/70' : tone === 'danger' ? 'bg-danger/70' : 'bg-primary/70'
    return v > 0 ? 'bg-success/70' : v < 0 ? 'bg-danger/70' : 'bg-primary/70'
  }

  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 truncate text-text-secondary font-medium">{d.label}</span>
          <div className="flex-1 h-3.5 rounded bg-glass overflow-hidden">
            <div
              className={`h-full rounded ${barClass(d.value)}`}
              style={{ width: `${Math.max(2, (Math.abs(d.value) / max) * 100)}%` }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="w-20 shrink-0 text-right text-text-primary font-semibold tabular-nums">{d.value}</span>
          {d.sub && <span className="w-16 shrink-0 text-right text-text-muted truncate">{d.sub}</span>}
        </div>
      ))}
    </div>
  )
}