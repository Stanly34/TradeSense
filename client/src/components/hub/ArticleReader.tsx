import { ArrowLeft, BookOpen, Clock } from 'lucide-react'
import type { Guide } from '../../data/guides'
import { TAG_COLORS } from '../../data/guides'

export function ArticleReader({ guide, onBack, backLabel = 'All guides' }: { guide: Guide; onBack: () => void; backLabel?: string }) {
  return (
    <div className="min-h-full bg-background text-text-primary">
      <section className="relative w-full pt-24 pb-12 overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-[-10%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-20 bg-primary/20" />
        <div className="relative mx-auto w-full px-4 md:px-6 lg:px-8 max-w-3xl">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-primary hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </button>

          <div className="mt-8 flex items-center gap-3">
            <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${TAG_COLORS[guide.tag] ?? 'bg-primary/10 text-primary'}`}>
              {guide.tag}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-text-secondary font-semibold">
              <Clock className="w-3.5 h-3.5" /> {guide.readTime}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-text-primary mt-4 leading-tight tracking-tight">{guide.title}</h1>

          <div className="mt-6 h-px bg-border" />

          <article className="mt-8 space-y-6 text-[15px] leading-relaxed text-text-secondary">
            {guide.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}

            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-sm text-text-primary font-semibold leading-relaxed">{guide.body[0]}</p>
            </div>

            <ul className="space-y-2.5">
              {guide.body.slice(1).map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            <p className="text-text-primary font-medium border-t border-border pt-6">
              <span className="text-primary font-black uppercase tracking-wider text-xs mr-2">Takeaway</span>
              {guide.conclusion}
            </p>
          </article>

          <div className="mt-10 flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-2xl p-5">
            <BookOpen className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary leading-relaxed">
              Need to track these rules live? <strong className="text-text-primary">TradeSense</strong> journal builds your consistency report, drawdown alerts and R-multiple stats for every funded account.
            </p>
          </div>

          <button onClick={onBack} className="mt-8 inline-flex items-center gap-2 text-primary font-bold text-sm hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </button>
        </div>
      </section>
    </div>
  )
}