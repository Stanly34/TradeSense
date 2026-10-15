import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface SectionHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  number?: number
  action?: ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, icon, number, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex items-start gap-3">
        {number != null && (
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary font-semibold text-sm shrink-0 mt-0.5">
            {number}
          </span>
        )}
        {icon && !number && (
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
            {icon}
          </span>
        )}
        <div>
          <h2 className="text-sm font-semibold text-text-primary tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}