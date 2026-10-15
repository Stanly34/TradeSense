import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  header?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  zIndex?: string
}

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
}

export function Modal({ open, onClose, title, header, subtitle, children, footer, size = 'md', className, zIndex = 'z-[60]' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className={cn('fixed inset-0 z-40 flex flex-col justify-end sm:items-center sm:justify-center bg-black/50 sm:p-4', zIndex)} onClick={onClose}>
      <div
        ref={ref}
        className={cn(
          'bg-elevated w-full max-h-[92dvh] overflow-y-auto shadow-xl border border-border rounded-t-2xl sm:rounded-2xl',
          sizeClasses[size],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || header || subtitle) && (
          <div className="flex items-start justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border">
            <div>
              {header && <div className="flex flex-wrap items-center gap-1.5 mb-1.5">{header}</div>}
              {title && <h2 className="text-base font-semibold text-text-primary">{title}</h2>}
              {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-4 sm:px-6 py-4 sm:py-5">{children}</div>
        {footer && <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}