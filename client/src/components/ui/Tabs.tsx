import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface TabItem {
  key: string
  label: ReactNode
  icon?: ReactNode
}

interface TabsProps {
  tabs: TabItem[]
  value: string
  onChange: (key: string) => void
  className?: string
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex items-center gap-1 bg-glass rounded-xl p-1 border border-border w-fit', className)}>
      {tabs.map((tab) => {
        const active = tab.key === value
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
              active
                ? 'bg-card text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}