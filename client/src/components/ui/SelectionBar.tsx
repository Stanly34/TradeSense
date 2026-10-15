import { Trash2, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface SelectionBarProps {
  count: number
  onDelete: () => void
  onCancel: () => void
  allSelected?: boolean
  onToggleSelectAll?: () => void
  deleteLabel?: string
}

export function SelectionBar({ count, onDelete, onCancel, allSelected, onToggleSelectAll, deleteLabel = 'Deactivate' }: SelectionBarProps) {
  const [mounted, setMounted] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (count > 0) {
      setMounted(true)
      requestAnimationFrame(() => setAnimating(true))
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setMounted(false), 250)
      return () => clearTimeout(timer)
    }
  }, [count])

  if (!mounted) return null

  const bar = (
      <div
        className="card flex items-center z-40"
        style={{
          position: 'fixed',
          left: '50%',
          bottom: '20px',
          transform: animating
            ? 'translateX(-50%) translateY(0) scale(1)'
            : 'translateX(-50%) translateY(20px) scale(.98)',
          opacity: animating ? 1 : 0,
          transition: 'opacity 250ms ease-out, transform 250ms ease-out',
          height: '64px',
          minWidth: 'auto',
          maxWidth: '560px',
          width: 'auto',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,.18)',
          padding: '0 24px',
          background: 'var(--color-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
      <span className="text-sm font-semibold text-text-primary whitespace-nowrap shrink-0 flex items-center gap-2">
        {count} {count === 1 ? 'item' : 'items'} selected
        {onToggleSelectAll && (
          <button onClick={onToggleSelectAll} className="text-xs font-normal text-text-muted hover:text-text-secondary transition-colors">
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </span>

      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-sm font-medium text-text-muted rounded-xl px-3 py-2 hover:bg-hover hover:text-text-primary transition-colors"
      >
        <X className="w-4 h-4" />
        Cancel
      </button>

      <div className="mx-4 h-6 w-px shrink-0 bg-border" />

      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 text-sm font-medium text-danger transition-colors rounded-xl px-3 py-2 hover:bg-danger/10"
      >
        <Trash2 className="w-4 h-4" />
        {deleteLabel}
      </button>
    </div>
  )

  return createPortal(bar, document.body)
}
