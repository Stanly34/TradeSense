import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[30%] h-[30%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand to-purple-600 rounded-2xl shadow-xl shadow-primary/30 mb-4 ring-1 ring-white/10">
            <Sparkles className="w-8 h-8 text-text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">TradeSense</h1>
          <p className="text-sm text-text-muted mt-1">Smart Trade Journaling</p>
        </div>
        <div className="bg-card backdrop-blur-2xl rounded-2xl shadow-xl border border-border/80 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-transparent pointer-events-none" />
          <h2 className="text-xl font-semibold text-text-primary relative">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-text-secondary relative">{subtitle}</p>
          )}
          <div className="mt-6 relative">{children}</div>
        </div>
      </div>
    </div>
  )
}