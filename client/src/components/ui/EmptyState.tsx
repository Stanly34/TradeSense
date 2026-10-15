import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-10', className)}>
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-glass text-text-muted mb-3">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && <p className="text-xs text-text-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}