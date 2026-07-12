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
      className="flex items-center"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '20px',
        transform: animating
          ? 'translateX(-50%) translateY(0) scale(1)'
          : 'translateX(-50%) translateY(20px) scale(.98)',
        opacity: animating ? 1 : 0,
        transition: 'opacity 250ms ease-out, transform 250ms ease-out',
        zIndex: 99999,
        height: '64px',
        minWidth: '420px',
        maxWidth: '560px',
        width: 'auto',
        background: '#262236',
        border: '1px solid rgba(255,255,255,.06)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,.45)',
        padding: '0 24px',
      }}
    >
      <span className="text-sm font-medium text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        style={{ fontWeight: 600, fontSize: '16px' }}>
        {count} {count === 1 ? 'item' : 'items'} selected
        {onToggleSelectAll && (
          <button onClick={onToggleSelectAll} className="text-xs font-normal text-zinc-400 hover:text-white transition-colors">
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </span>

      <div className="mx-8 h-6 w-px shrink-0" style={{ background: 'rgba(255,255,255,.08)' }} />

      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors"
        style={{
          color: '#EF4444',
          padding: '8px 12px',
          borderRadius: '12px',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,.08)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <Trash2 className="w-4 h-4" />
        {deleteLabel}
      </button>

      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-2 rounded-xl hover:bg-white/5"
        style={{ color: '#A1A1AA', borderRadius: '12px', padding: '8px 12px' }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#A1A1AA'}
      >
        <X className="w-4 h-4" />
        Cancel
      </button>
    </div>
  )

  return createPortal(bar, document.body)
}
