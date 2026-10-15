import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Check, Copy, Zap } from 'lucide-react'
import { cn } from '../../lib/utils'

export function GradientText({ children, className = '', animated = false }: { children: ReactNode; className?: string; animated?: boolean }) {
  return (
    <span className={`bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary-light to-primary-dark ${animated ? 'animate-gradient-x' : ''} ${className}`}>
      {children}
    </span>
  )
}

export function CategoryPill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary ${className}`}>
      {children}
    </div>
  )
}

export type HubStat = { value: string; label: string; accent?: string }

export function HubStats({ items, className = '' }: { items: HubStat[]; className?: string }) {
  return (
    <dl className={`mt-10 flex flex-wrap items-center justify-center gap-6 md:gap-12 py-6 px-6 rounded-2xl bg-card border border-border shadow-glass ${className}`}>
      {items.map((s, i) => (
        <div key={s.label} className="flex items-center gap-6 md:gap-12 last:gap-0 flex-wrap justify-center">
          <div className="text-center">
            <div className={`flex items-center justify-center gap-1 text-3xl font-black tabular-nums ${s.accent ?? 'text-text-primary'}`}>{s.value}</div>
            <div className="text-sm text-text-muted mt-1">{s.label}</div>
          </div>
          {i < items.length - 1 && <div className="hidden sm:block w-px h-12 bg-border" />}
        </div>
      ))}
    </dl>
  )
}

export function HubHead({ eyebrow, title, gradient, sub, children }: {
  eyebrow: string
  title: ReactNode
  gradient?: ReactNode
  sub?: ReactNode
    children?: ReactNode
}) {
  return (
    <section className="relative w-full pt-24 pb-10 md:pt-28 md:pb-12 overflow-hidden">
      <div className="pointer-events-none absolute -top-40 right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-25 bg-primary/20" />
      <div className="pointer-events-none absolute bottom-[-40%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 bg-primary-light/20" />
      <div className="relative mx-auto w-full px-4 md:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col items-center text-center">
          <CategoryPill>{eyebrow}</CategoryPill>
          <h1 className="text-text-primary text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-tight mt-4">
            {title} {gradient && <GradientText>{gradient}</GradientText>}
          </h1>
          <p className="max-w-2xl text-base md:text-lg leading-relaxed text-text-secondary mt-5">{sub}</p>
        </div>
        {children}
      </div>
    </section>
  )
}

export function GlowCard({ children, className = '', glow = true }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <article className="group relative transition-transform duration-300 hover:-translate-y-1 h-full">
      {glow && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 to-primary-light/40 rounded-[32px] blur opacity-20 group-hover:opacity-60 transition duration-500" />
      )}
      <div className={cn('relative h-full bg-card rounded-[32px] flex flex-col overflow-hidden border border-border', className)}>
        {children}
      </div>
    </article>
  )
}

export function useCountdown(end?: Date | number, offsetDays = 30) {
  const endTime = useMemo(() => {
    if (end === undefined) return new Date(Date.now() + offsetDays * 86400000).getTime()
    const t = typeof end === 'number' ? end : end.getTime()
    return Number.isFinite(t) ? t : Date.now()
  }, [end, offsetDays])
  const [left, setLeft] = useState(() => Math.max(0, endTime - Date.now()))
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, endTime - Date.now())), 1000)
    return () => clearInterval(t)
  }, [endTime])
  const s = Math.floor(left / 1000)
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    end,
  }
}

export function CountdownMono({ items, separator = ' : ', className = '' }: { items: { v: number; l: string }[]; separator?: string; className?: string }) {
  return (
    <span className={`text-sm font-mono font-bold text-white tabular-nums ${className}`}>
      {items.map((it, i) => (
        <span key={it.l}>
          {i > 0 && <span className="text-white/40 mx-2">{separator}</span>}
          <span className="font-black">{it.v}</span>
          <span className="text-white/50 text-xs ml-1">{it.l}</span>
        </span>
      ))}
    </span>
  )
}

export function OfferStrip({ children, zIndex = 'relative z-10' }: { children: ReactNode; zIndex?: string }) {
  return (
    <div className={`w-full py-2 px-4 flex items-center justify-center min-h-[40px] bg-gradient-to-r from-primary via-primary-dark to-primary-dark relative overflow-hidden text-white shadow-lg ${zIndex}`}>
      <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(45deg,transparent_25%,rgba(255,255,255,.35)_50%,transparent_75%)] [background-size:12px_12px]" />
      <div className="flex items-center gap-2 md:gap-3 relative z-10 flex-wrap justify-center">
        {children}
      </div>
    </div>
  )
}

export function LiveDot({ className = '' }: { className?: string }) {
  return (
    <span className={`flex h-2 w-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)] ${className}`} />
  )
}

export function HubChip({ children, tone = 'primary' }: { children: ReactNode; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted' }) {
  const tones: Record<string, string> = {
    primary: 'bg-primary/10 border-primary/30 text-primary',
    success: 'bg-success/10 border-success/30 text-success',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    danger: 'bg-danger/10 border-danger/30 text-danger',
    info: 'bg-info/10 border-info/30 text-info',
    muted: 'bg-card border-border text-text-secondary',
  }
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap border rounded-full text-[10px] font-semibold px-2.5 py-1 ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function PromoCopy({ code, label = 'Promo Code:' }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2 px-1 flex-wrap">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {}
        }}
        className="flex items-center gap-1.5 text-xs font-black text-text-primary hover:text-primary transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
        {code}
      </button>
    </div>
  )
}

export function CtaButton({ href, children, block = false }: { href: string; children: ReactNode; block?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-text-inverse font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-primary ${block ? 'w-full' : ''}`}
    >
      <Zap className="w-4 h-4" />
      {children}
    </a>
  )
}

export function IconTile({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary flex-shrink-0">
      {children}
    </div>
  )
}