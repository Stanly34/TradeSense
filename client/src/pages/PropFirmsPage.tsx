import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Star, TrendingUp, ArrowUpRight, ChevronDown, Sparkles, CalendarClock, CandlestickChart, Globe2, ShieldCheck } from 'lucide-react'
import * as propFirmService from '../services/propFirms'
import type { PropFirm } from '../services/propFirms'
import {
  GlowCard,
  CategoryPill,
  GradientText,
  HubHead,
  HubStats,
  OfferStrip,
  HubChip,
  PromoCopy,
  CtaButton,

} from '../components/hub/Hub'

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', USA: '🇺🇸', 'United States': '🇺🇸', 'United States (US)': '🇺🇸',
  UK: '🇬🇧', 'United Kingdom': '🇬🇧', GB: '🇬🇧',
  CA: '🇨🇦', Canada: '🇨🇦', AU: '🇦🇺', Australia: '🇦🇺', IN: '🇮🇳', India: '🇮🇳',
  AE: '🇦🇪', DE: '🇩🇪', NG: '🇳🇬', PE: '🇵🇪', PK: '🇵🇰', RO: '🇷🇴',
  CZ: '🇨🇿', IL: '🇮🇱', MT: '🇲🇹', CY: '🇨🇾', HK: '🇭🇰', 'Hong Kong': '🇭🇰',
}

const CATEGORIES = [
  {
    key: 'futures',
    label: 'Futures Prop Firms',
    icon: CandlestickChart,
    desc: 'CME futures evaluations — APEX, TopStep, Tradeify and more. Daily loss limits, trailing draws and fast payouts.',
    accent: 'from-primary/20 to-transparent',
    chip: 'primary',
  },
  {
    key: 'forex',
    label: 'Forex Prop Firms',
    icon: Globe2,
    desc: 'Forex + indices programs like FTMO and The5ers — two-step challenges, instant funding and weekly payouts.',
    accent: 'from-info/20 to-transparent',
    chip: 'info',
  },
]

const META_ALL: { title: string; sub: ReactNode } = {
  title: 'Pick Your',
  sub: (
    <>
      Choose a category — <strong className="text-text-primary font-bold">Futures</strong> or{' '}
      <strong className="text-text-primary font-bold">Forex</strong> — then compare every firm's accounts, sizes and prices.
      Discount codes are <strong className="text-text-primary font-bold">auto-tracked</strong> from each firm's own site.
    </>
  ),
}

const META_FUTURES: { title: string; sub: ReactNode } = {
  title: 'Futures Prop Firms',
  sub: (
    <>
      Every tracked <strong className="text-text-primary font-bold">futures program</strong> in one place — compare plans,
      account sizes, splits and payout speed, with each firm's current <strong className="text-text-primary font-bold">discount code</strong> applied.
    </>
  ),
}

const META_FOREX: { title: string; sub: ReactNode } = {
  title: 'Forex Prop Firms',
  sub: (
    <>
      <strong className="text-text-primary font-bold">Forex + indices</strong> evaluation programs like FTMO and The5ers —
      compare rules, sizes and costs, with each firm's current <strong className="text-text-primary font-bold">discount code</strong> applied.
    </>
  ),
}

const FAQS = [
  {
    q: 'How do I get funded?',
    a: 'Register at any prop firm on this page using the promo code shown, select your account size, and pass the evaluation — most firms split into a two-step evaluation (or one-step for instant-funded options). Once you pass, you trade the firm\u2019s capital and take up to 100% of your profits.',
  },
  {
    q: 'What\u2019s a promo code / discount?',
    a: 'Firms on this page offer a reduced signup fee when you use their current promo code. Codes are automatically re-verified from each firm\u2019s own website, so the code shown is the code the firm is running right now — copy it, enter it at checkout, and the discounted price is applied automatically.',
  },
  {
    q: 'Do I get my money back if I fail?',
    a: 'Most firms offer a refund: fail the evaluation and you can usually start a new attempt with no extra cost (within the refund window — typically 10\u201315 days after your start date).',
  },
  {
    q: 'What are daily loss limits?',
    a: 'A daily loss limit caps how much you can lose in a single trading day (e.g. 3% of the account). If hit, the account closes instantly that day, then resets at the broker\u2019s daily cut-off (often 17:00 ET).',
  },
  {
    q: 'Is there a profit target for the funded account?',
    a: 'No. Once you\u2019re funded there is no profit target or time limit — you keep trading, you take payouts (some firms offer daily payouts), and only the max loss limits still apply.',
  },
]

function dealEndLabel(firm: PropFirm): { label: string; endsAt: Date | null } {
  if (!firm.dealEndsAt) return { label: 'Ongoing offer', endsAt: null }
  const d = new Date(firm.dealEndsAt)
  return {
    label: `Ends ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    endsAt: d,
  }
}

function ago(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function verifiedLabel(firm: PropFirm) {
  if (firm.codeStatus === 'OK') return `Verified ${ago(firm.lastCodeCheckAt)}`
  if (firm.codeStatus === 'STALE') return 'Checking again soon'
  return null
}

function tagChips(f: PropFirm) {
  const chips: { node: ReactNode; key: string }[] = []
  if (f.dailyPayouts) chips.push({ node: 'Daily Payouts', key: 'dp' })
  if (f.instantFunding) chips.push({ node: 'Instant Funding', key: 'if' })
  if (f.noActivationFee) chips.push({ node: 'No Activation Fee', key: 'na' })
  if (f.oneTimeFee) chips.push({ node: 'One-Time Fee', key: 'ot' })
  return chips
}

function FirmCard({ firm }: { firm: PropFirm }) {
  const navigate = useNavigate()
  const deal = dealEndLabel(firm)
  const p = propFirmService.firstPrice(firm)
  const flag = COUNTRY_FLAGS[firm.country] ?? '🇺🇸'
  const verified = verifiedLabel(firm)

  return (
    <div onClick={() => navigate(`/prop-firms/firm/${firm.slug}`)} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/prop-firms/firm/${firm.slug}`) } }} className="cursor-pointer h-full">
      <GlowCard>
        <OfferStrip zIndex="relative z-10">
          <span className="text-xs font-black text-white tracking-wider uppercase">Ongoing Offer</span>
        </OfferStrip>

        <div className="flex flex-col h-full px-6 pb-6 md:px-8 md:pb-8 pt-6">
          <div className="pointer-events-none absolute top-[-50%] right-[-50%] w-[300px] h-[300px] rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity duration-700 bg-primary/15" />

          <div className="relative z-10 flex justify-between items-start mb-8">
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="h-16 w-16 md:h-20 md:w-20 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-2xl border border-border group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 flex-shrink-0"
                style={{ backgroundColor: firm.logoColor }}
              >
                {firm.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-xl font-black text-text-primary truncate">{firm.name}</h3>
                  {tagChips(firm).slice(0, 1).map((c) => (
                    <HubChip key={c.key} tone="primary">{c.node}</HubChip>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-text-secondary text-sm mt-1 flex-wrap">
                  <span>{flag} {firm.country}</span>
                  <span className="text-text-muted">•</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-warning fill-amber-400" />
                    <span className="font-bold text-text-primary">{firm.rating.toFixed(1)}</span>
                  </span>
                  <span className="text-text-muted">•</span>
                  <span>{firm.instruments}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mb-8 rounded-2xl border border-border bg-gradient-to-r from-glass to-transparent p-5 transition-colors group-hover:border-primary/40">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div className="flex flex-col gap-2 min-w-0">
                <div className="text-xs uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-primary" />
                  {deal.label} · Up to {firm.discountPercent}% OFF
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {tagChips(firm).map((c) => (
                    <HubChip key={c.key}>{c.node}</HubChip>
                  ))}
                  {verified && (
                    <HubChip tone={firm.codeStatus === 'OK' ? 'success' : 'muted'}>
                      <ShieldCheck className="w-3 h-3" /> {verified}
                    </HubChip>
                  )}
                </div>
              </div>
              {p && (
                <div className="flex flex-col items-end shrink-0 text-right">
                  <div className="text-xs text-text-muted">{p.size} only:</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm text-text-muted line-through">${p.price}</span>
                    <span className="text-3xl font-black text-text-primary tabular-nums">${p.discounted}</span>
                  </div>
                  <div className="text-[11px] text-text-secondary mt-1">from ${p.discounted} today</div>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 mt-auto flex flex-col gap-3" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <CtaButton href={firm.websiteUrl} block>
              <span className="font-black">Get Funded</span>
              <span className="mx-1 h-4 w-px bg-white/30" />
              <span className="flex items-center gap-1">
                <span className="text-xs font-normal opacity-70">Up to</span>
                <span className="font-black">{firm.discountPercent}% OFF</span>
              </span>
            </CtaButton>
            <div className="flex items-center justify-between px-1 flex-wrap gap-2">
              {firm.promoCode && <PromoCopy code={firm.promoCode} />}
            </div>
          </div>
        </div>
      </GlowCard>
    </div>
  )
}

function CategoryCard({ kind, firms }: { kind: (typeof CATEGORIES)[number]; firms: PropFirm[] }) {
  const Icon = kind.icon
  const top = [...firms].sort((a, b) => b.rating - a.rating).slice(0, 3)
  const entry = firms.some((f) => propFirmService.firstPrice(f))
    ? '$' + Math.min(...firms.map((f) => propFirmService.firstPrice(f)?.discounted ?? Infinity))
    : '—'
  const avgRating = firms.length ? (firms.reduce((a, f) => a + f.rating, 0) / firms.length).toFixed(1) : '—'

  return (
    <Link
      to={`/prop-firms/${kind.key}`}
      className="group relative overflow-hidden rounded-[28px] border border-border bg-card p-8 flex flex-col gap-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-2xl"
    >
      <div className={`pointer-events-none absolute -top-32 -right-32 h-[320px] w-[320px] rounded-full blur-[110px] opacity-25 ${kind.accent} transition-opacity duration-700 group-hover:opacity-50`} />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-primary-dark text-white shadow-primary flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
          {Icon && <Icon className="w-8 h-8" />}
        </div>
        <HubChip tone={kind.chip as 'primary' | 'info'}>{firms.length} firms</HubChip>
      </div>

      <div className="relative z-10">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-text-primary group-hover:text-primary-light transition-colors">
          {kind.label}
        </h2>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">{kind.desc}</p>
      </div>

      <div className="relative z-10 flex items-center gap-3 flex-wrap">
        <div className="rounded-2xl border border-border bg-elevated px-4 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Avg rating</div>
          <div className="font-black text-text-primary tabular-nums flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-warning fill-amber-400" /> {avgRating}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-elevated px-4 py-2.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Entry from</div>
          <div className="font-black text-success tabular-nums">{entry}</div>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap gap-1.5">
        {top.map((f) => (
          <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-glass px-3 py-1 text-xs font-bold text-text-secondary">
            <span className="h-4 w-4 rounded-md flex items-center justify-center text-[8px] text-white font-black" style={{ backgroundColor: f.logoColor }}>
              {f.name.slice(0, 2).toUpperCase()}
            </span>
            {f.name}
          </span>
        ))}
      </div>

      <span className="relative z-10 mt-auto inline-flex items-center gap-2 text-primary font-black text-sm uppercase tracking-widest">
        View all {firms.length} firms <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </Link>
  )
}

export function PropFirmsPage() {
  const { kind = 'all' } = useParams<{ kind?: string }>()
  const [firms, setFirms] = useState<PropFirm[]>([])
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [email, setEmail] = useState('')

  useEffect(() => {
    propFirmService.listPropFirms().then(setFirms).catch(() => setFirms([]))
  }, [])

  const active = firms.filter((f) => f.isActive)
  const futures = active.filter((f) => f.instruments.toLowerCase().includes('futur'))
  const forex = active.filter((f) => !f.instruments.toLowerCase().includes('futur'))
  const all = kind === 'all' ? active : kind === 'futures' ? futures : forex
  const featured = all.filter((f) => f.isFeatured)
  const maxDiscount = Math.max(0, ...all.map((f) => f.discountPercent))
  const minEntry = all.some((f) => propFirmService.firstPrice(f))
    ? '$' + Math.min(...all.filter((f) => propFirmService.firstPrice(f)).map((f) => propFirmService.firstPrice(f)!.discounted))
    : '—'
  const verifiedCount = all.filter((f) => f.codeStatus === 'OK').length

  const meta = kind === 'futures' ? META_FUTURES : kind === 'forex' ? META_FOREX : META_ALL
  const kindLabel = kind === 'futures' ? 'Futures' : kind === 'forex' ? 'Forex' : 'All'
  const isAll = kind === 'all'

  return (
    <div className="min-h-full bg-background text-text-primary">
      {!isAll && (
        <div className="relative mx-auto w-full px-4 md:px-6 lg:px-8 max-w-7xl pt-12">
        </div>
      )}

      {!isAll && (
        <HubHead
          eyebrow={`Prop Firm Directory · ${kindLabel}`}
          title={meta.title}
          gradient="for 2026"
          sub={meta.sub}
        >
          <HubStats
            items={[
              { value: String(all.length), label: `${kindLabel} Firms` },
              { value: `${maxDiscount}%`, label: 'Largest Discount' },
              { value: minEntry, label: 'Entry From' },
              { value: `${verifiedCount}`, label: 'Codes Auto-Verified', accent: 'text-success' },
            ]}
          />
        </HubHead>
      )}

      {isAll ? (
        <section className="relative max-w-7xl mx-auto px-4 md:px-6 pt-16 pb-10">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
            <Globe2 className="w-4 h-4" /> Choose a Category
          </div>
          <h2 className="text-text-primary text-2xl md:text-3xl font-black tracking-tighter mt-2">
            Futures or <GradientText>Forex — see both</GradientText>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {CATEGORIES.map((c) => (
              <CategoryCard key={c.key} kind={c} firms={c.key === 'futures' ? futures : forex} />
            ))}
          </div>
        </section>
      ) : null}

      {!isAll && featured.length > 0 && (
        <section className="py-10">
          <div className="relative z-10 px-4 md:px-6 max-w-7xl mx-auto w-full space-y-6">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
              <Sparkles className="w-4 h-4" /> {kindLabel} Prop Firms
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((f) => <FirmCard key={f.id} firm={f} />)}
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 md:px-6 py-12 max-w-7xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
            <TrendingUp className="w-4 h-4" /> All {isAll ? 'Prop' : kindLabel} Firms
          </div>
          <h2 className="text-text-primary text-2xl md:text-3xl font-black tracking-tighter mt-2">
            The Full <GradientText>{isAll ? 'Prop Firm' : kindLabel} Lineup</GradientText>
          </h2>

          {all.length === 0 ? (
            <div className="text-center text-text-muted py-16">
              {firms.length === 0 ? 'Loading firms…' : 'No firms match these filters — try clearing a filter.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {all.map((f) => <FirmCard key={f.id} firm={f} />)}
            </div>
          )}
          <p className="text-xs text-text-muted mt-4">
            Every firm card is clickable — open it for full account sizes, rules and payouts. Discount codes are auto-verified from each firm's website and kept up to date automatically.
          </p>
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-4 md:px-6 pb-12">
      </section>

      <section className="container mx-auto px-4 md:px-6 py-12 max-w-4xl">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary justify-center">
          <CalendarClock className="w-4 h-4" /> Quick Answers
        </div>
        <h2 className="text-text-primary text-2xl md:text-3xl font-black tracking-tight text-center mt-2">Frequently Asked Questions</h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((faq, i) => (
            <div key={faq.q} className="rounded-2xl border border-border bg-elevated overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-text-primary hover:bg-glass transition-colors"
              >
                {faq.q}
                <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <p className="px-5 pb-5 text-sm text-text-secondary leading-relaxed">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-border">
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[140px] opacity-20 bg-primary/20" />
        <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
          <CategoryPill>Auto-Tracked Deals</CategoryPill>
          <h2 className="text-text-primary text-3xl md:text-4xl font-black tracking-tight mt-4">
            Codes That <GradientText>Update Themselves.</GradientText>
          </h2>
          <p className="text-text-secondary mt-4">Every discount code on this site is re-verified from the firm's own website every 6 hours — when a firm changes its code, this site changes with it.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!email.includes('@')) return
              setEmail('')
            }}
            className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-input border border-border rounded-2xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
            <button type="submit" className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-black uppercase tracking-wider text-sm px-6 py-3 hover:brightness-110 transition-all shadow-primary">
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}