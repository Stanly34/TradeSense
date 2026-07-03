import { forwardRef, useRef, useCallback, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  startAdornment?: ReactNode
  endAdornment?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, onWheel, startAdornment, endAdornment, ...props }, ref) => {
    const inputRef = useRef<HTMLInputElement | null>(null)

    const setRef = useCallback((el: HTMLInputElement | null) => {
      inputRef.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) ref.current = el
    }, [ref])

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {startAdornment && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {startAdornment}
            </div>
          )}
          <input
            id={id}
            ref={setRef}
            onWheel={(e) => {
              if ((e.target as HTMLInputElement).type === 'number') {
                e.preventDefault()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            className={cn(
              'block w-full rounded-xl border border-border/80 px-3.5 py-2.5',
              'text-sm text-text-primary placeholder:text-text-muted/60',
              'bg-input/60 backdrop-blur-sm',
              'focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.12)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-all duration-200',
              error && 'border-danger focus:border-danger focus:shadow-[0_0_0_2px_rgba(239,68,68,0.2)]',
              startAdornment && 'pl-9',
              endAdornment && 'pr-9',
              className
            )}
            {...props}
          />
          {endAdornment && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {endAdornment}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-danger">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
