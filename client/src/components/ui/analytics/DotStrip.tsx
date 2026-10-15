interface DotStripProps {
  items: Array<{ label: string; color: 'success' | 'danger' | 'default'; count: number }>
}

const DOT_CLASS: Record<string, string> = {
  success: 'bg-success',
  danger: 'bg-danger',
  default: 'bg-text-muted',
}

export function DotStrip({ items }: DotStripProps) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <div key={`${it.label}-${i}`} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-glass border border-border/50 text-xs">
          <span className={`w-2 h-2 rounded-full ${DOT_CLASS[it.color]}`} />
          <span className="text-text-secondary font-medium">{it.label}</span>
          <span className="text-text-muted font-semibold">{it.count}</span>
        </div>
      ))}
    </div>
  )
}