import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'primary'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const styles: Record<BadgeVariant, string> = {
  default: 'bg-glass text-text-secondary border-border',
  success: 'bg-success/10 text-success border-success/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info: 'bg-info/10 text-info border-info/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border',
      styles[variant],
      className
    )}>
      {children}
    </span>
  )
}