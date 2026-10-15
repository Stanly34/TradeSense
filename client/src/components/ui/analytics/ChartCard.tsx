import type { ReactNode } from 'react'
import { Card } from '../Card'
import { EmptyState } from '../EmptyState'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  empty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  icon?: ReactNode
  action?: ReactNode
}

export function ChartCard({ title, subtitle, children, empty = false, emptyTitle = 'No data yet', emptyDescription, icon, action }: ChartCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {empty ? (
        <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} className="py-8" />
      ) : (
        children
      )}
    </Card>
  )
}