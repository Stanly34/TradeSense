import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { CategoryPill, IconTile } from '../components/hub/Hub'
import { TOOLS } from '../components/hub/PropFirmTools'

export function TradingToolPage() {
  const { id = '' } = useParams<{ id: string }>()
  const index = TOOLS.findIndex((t) => t.id === id)

  const tool = useMemo(() => (index >= 0 ? TOOLS[index] : null), [index])

  if (!tool) return <Navigate to="/trading-tools" replace />

  const prev = TOOLS[index - 1] ?? TOOLS[TOOLS.length - 1]
  const next = TOOLS[index + 1] ?? TOOLS[0]
  const Comp = tool.comp

  return (
    <div className="min-h-full bg-background text-text-primary">
      <section className="relative w-full pt-16 pb-10 overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-[-10%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-20 bg-primary/20" />
        <div className="relative mx-auto w-full px-4 md:px-6 lg:px-8 max-w-7xl">
          <Link to="/trading-tools" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> All tools
          </Link>

          <div className="mt-6 flex flex-col md:flex-row md:items-center gap-4">
            <IconTile><tool.icon /></IconTile>
            <div>
              <CategoryPill>Free Calculator</CategoryPill>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter mt-2">{tool.title}</h1>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full px-4 md:px-6 lg:px-8 max-w-5xl pb-16">
        <Comp />
      </section>

      <section className="relative max-w-7xl mx-auto px-4 md:px-6 pb-20">
        <div className="flex items-center justify-between gap-4 flex-wrap rounded-[24px] border border-border bg-card p-4">
          <Link to={`/trading-tools/${prev.id}`} className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors min-w-0">
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{prev.title}</span>
          </Link>
          <Link to="/trading-tools" className="text-xs font-bold uppercase tracking-widest text-text-muted hover:text-primary transition-colors">All Tools</Link>
          <Link to={`/trading-tools/${next.id}`} className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary transition-colors min-w-0">
            <span className="truncate">{next.title}</span>
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
          </Link>
        </div>
      </section>
    </div>
  )
}