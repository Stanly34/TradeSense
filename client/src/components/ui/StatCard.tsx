import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  color?: 'default' | 'success' | 'danger' | 'primary' | 'warning'
  className?: string
  onClick?: () => void
}

const iconColor: Record<NonNullable<StatCardProps['color']>, string> = {
  default: 'bg-glass text-text-muted',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
}

export function StatCard({ label, value, sub, icon, color = 'default', className, onClick }: StatCardProps) {
  return (
    <div className={cn('card p-4', onClick && 'card-hover cursor-pointer', className)} onClick={onClick}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
        {icon && (
          <span className={cn('flex items-center justify-center w-7 h-7 rounded-lg', iconColor[color])}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-xl font-semibold text-text-primary tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-text-muted">{sub}</div>}
    </div>
  )
}