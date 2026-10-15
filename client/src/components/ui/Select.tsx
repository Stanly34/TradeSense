import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  error?: string
  disabled?: boolean
}

export function Select({ label, value, onChange, options, placeholder, className, error, disabled }: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div className="space-y-1.5" ref={ref}>
      {label && <label className="block text-sm font-medium text-text-secondary">{label}</label>}
      <button type="button" onClick={() => !disabled && setOpen(!open)} disabled={disabled}
        className={cn(
          'flex items-center gap-2 w-full rounded-xl border border-border/80 px-3.5 py-2.5 text-sm bg-input/60 backdrop-blur-sm transition-all duration-200',
          'hover:border-primary/40',
          open && 'border-primary shadow-[0_0_0_2px_rgba(79,70,229,0.12)]',
          error && 'border-danger focus:border-danger',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}>
        <span className={cn('flex-1 text-left', !selected && 'text-text-muted')}>
          {selected ? selected.label : placeholder || 'Select...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="relative">
          <div className="absolute z-50 top-1 left-0 w-full bg-elevated border border-border rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false) }}
                className={cn(
                  'w-full text-left px-3.5 py-2.5 text-sm transition-colors',
                  opt.value === value
                    ? 'bg-primary text-white font-medium'
                    : 'text-text-primary hover:bg-hover'
                )}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
