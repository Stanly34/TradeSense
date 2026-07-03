import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium',
          'transition-all duration-200 focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'relative overflow-hidden',
          {
            'bg-gradient-to-br from-primary to-primary-dark text-text-inverse shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:brightness-110 active:brightness-95': variant === 'primary',
            'bg-elevated/60 backdrop-blur-xl text-text-primary border border-border hover:bg-hover hover:border-border-hover shadow-sm': variant === 'secondary',
            'text-text-secondary hover:text-text-primary hover:bg-glass': variant === 'ghost',
            'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 shadow-sm shadow-danger/5': variant === 'danger',
          },
          {
            'px-3 py-1.5 text-xs rounded-lg': size === 'sm',
            'px-5 py-2.5 text-sm rounded-xl': size === 'md',
            'px-7 py-3 text-base rounded-xl': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'