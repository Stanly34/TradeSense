import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string | ReactNode
  confirmLabel?: string
  isLoading?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', isLoading }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col justify-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-elevated w-full sm:max-w-sm mx-0 sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 border-t sm:border border-border mb-safe" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-text-primary">{title || 'Confirm'}</h2>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary rounded-lg hover:bg-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm text-text-secondary mb-5">{message || 'Are you sure?'}</div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body
  )
}