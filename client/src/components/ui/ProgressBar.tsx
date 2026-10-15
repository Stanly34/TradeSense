import { cn } from '../../lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  color?: 'primary' | 'success' | 'danger' | 'warning'
  className?: string
}

const colorClasses = {
  primary: 'bg-primary',
  success: 'bg-success',
  danger: 'bg-danger',
  warning: 'bg-warning',
}

export function ProgressBar({ value, max = 100, color = 'primary', className }: ProgressBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0

  return (
    <div className={cn('h-1.5 w-full rounded-full bg-hover overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', colorClasses[color])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}