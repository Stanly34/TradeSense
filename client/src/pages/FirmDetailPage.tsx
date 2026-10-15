import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Star, Timer, Globe, Check, Sparkles, ShieldCheck, Copy, CheckCircle2, BookOpen, RefreshCw } from 'lucide-react'
import * as propFirmService from '../services/propFirms'
import type { PropFirm, PropFirmPlan, RuleRow } from '../services/propFirms'
import { useCrumbs } from '../lib/breadcrumbs'
import { CategoryPill, GradientText, HubChip, PromoCopy, CtaButton, GlowCard } from '../components/hub/Hub'

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', USA: '🇺🇸', 'United States': '🇺🇸', 'United States (US)': '🇺🇸',
  UK: '🇬🇧', 'United Kingdom': '🇬🇧', GB: '🇬🇧',
  CA: '🇨🇦', Canada: '🇨🇦', AU: '🇦🇺', Australia: '🇦🇺', IN: '🇮🇳', India: '🇮🇳',
  AE: '🇦🇪', DE: '🇩🇪', NG: '🇳🇬', PE: '🇵🇪', PK: '🇵🇰', RO: '🇷🇴',
  CZ: '🇨🇿', IL: '🇮🇱', MT: '🇲🇹', CY: '🇨🇾', HK: '🇭🇰', 'Hong Kong': '🇭🇰',
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

function StatCell({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-elevated p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{label}</div>
      <div className={`text-lg font-black mt-1 ${highlight ? 'text-success' : 'text-text-primary'}`}>{value}</div>
    </div>
  )
}

function RulesCard({ title, tone, rows }: { title: string; tone: 'success' | 'info'; rows: RuleRow[] }) {
  return (
    <div className="rounded-[24px] border border-border bg-card overflow-hidden">
      <div className={`flex items-center gap-2 border-b border-border px-5 py-4 ${tone === 'success' ? 'bg-success/5' : 'bg-info/5'}`}>
        <ShieldCheck className={`w-4 h-4 ${tone === 'success' ? 'text-success' : 'text-info'}`} />
        <span className="text-sm font-black text-text-primary">{title}</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 px-5 py-3">
            <span className="text-[13px] text-text-secondary flex-shrink-0">{row.label}</span>
            <span className="text-[13px] font-bold text-right text-text-primary">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FirmDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [firm, setFirm] = useState<PropFirm | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [planName, setPlanName] = useState<string | null>(null)
  const [sizeKey, setSizeKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPlanName(null)
    setSizeKey(null)
    propFirmService
      .getPropFirm(slug)
      .then((f) => { if (!cancelled) { setFirm(f); setNotFound(false) } })
      .catch(() => { if (!cancelled) setNotFound(true) })
    return () => { cancelled = true }
  }, [slug])

  const plan = useMemo<PropFirmPlan | null>(() => (firm ? propFirmService.findPlan(firm, planName ?? undefined) : null), [firm, planName])

  const isFutures = (firm?.instruments ?? '').toLowerCase().includes('futur')
  useCrumbs(firm ? [
    { label: 'Prop Firms', to: '/prop-firms' },
    { label: isFutures ? 'Futures' : 'Forex', to: `/prop-firms/${isFutures ? 'futures' : 'forex'}` },
    { label: firm.name },
  ] : null)

  const selected = useMemo(() => {
    if (!plan) return null
    const row = plan.sizes.find((s) => s.size === sizeKey) ?? plan.sizes[0]
    return row ?? null
  }, [plan, sizeKey])

  useEffect(() => {
    if (plan && !plan.sizes.some((s) => s.size === sizeKey)) {
      setSizeKey(plan.sizes[0]?.size ?? null)
    }
  }, [plan, sizeKey])

  const copyCode = async () => {
    if (!firm?.promoCode) return
    try {
      await navigator.clipboard.writeText(firm.promoCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-full bg-background text-text-primary">
        <section className="relative w-full pt-32 pb-24 overflow-hidden">
          <div className="pointer-events-none absolute -top-40 right-[-10%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-20 bg-primary/20" />
          <div className="relative mx-auto w-full px-4 md:px-6 lg:px-8 max-w-3xl text-center">
            <CategoryPill>Not Found</CategoryPill>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mt-4">Firm not found</h1>
            <p className="text-text-secondary mt-4">That listing doesn't exist or has been removed.</p>
            <Link to="/prop-firms" className="mt-8 inline-flex items-center gap-2 text-primary font-bold text-sm hover:text-text-primary transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to all prop firms
            </Link>
          </div>
        </section>
      </div>
    )
  }

  if (!firm || !plan) {
    return (
      <div className="min-h-full bg-background text-text-primary">
        <div className="flex items-center justify-center py-40 text-text-muted">Loading firm…</div>
      </div>
    )
  }

  const flag = COUNTRY_FLAGS[firm.country] ?? '🇺🇸'
  const verified = firm.codeStatus === 'OK' ? `Verified ${ago(firm.lastCodeCheckAt)}` : firm.codeStatus === 'STALE' ? 'Re-checking soon' : null
  const rulesTracked = firm.rulesStatus === 'OK' ? `Rules verified ${ago(firm.lastRulesCheckAt)}` : firm.rulesStatus === 'STALE' ? 'Rules re-checking' : null
  const savePct = selected && selected.price > 0 ? Math.round(((selected.price - selected.discounted) / selected.price) * 100) : 0

  return (
    <div className="min-h-full bg-background text-text-primary">
      <section className="relative w-full pt-20 pb-12 md:pt-24 overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-25 bg-primary/20" />
        <div className="relative mx-auto w-full px-4 md:px-6 lg:px-8 max-w-7xl">

          <div className="mt-8 flex flex-col md:flex-row md:items-center gap-6">
            <div
              className="h-20 w-20 md:h-24 md:w-24 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-2xl border border-border flex-shrink-0"
              style={{ backgroundColor: firm.logoColor }}
            >
              {firm.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryPill>Active Listing</CategoryPill>
                <HubChip tone="success"><Star className="w-3 h-3 fill-amber-400" /> {firm.rating.toFixed(1)}</HubChip>
                {verified && (
                  <HubChip tone={firm.codeStatus === 'OK' ? 'info' : 'muted'}>
                    <ShieldCheck className="w-3 h-3" /> {verified}
                  </HubChip>
                )}
                {rulesTracked && (
                  <HubChip tone={firm.rulesStatus === 'OK' ? 'success' : 'muted'}>
                    <RefreshCw className="w-3 h-3" /> {rulesTracked}
                  </HubChip>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter mt-3">{firm.name}</h1>
              <p className="text-text-secondary mt-2 flex items-center gap-2 flex-wrap text-sm">
                <span>{flag} {firm.country}</span>
                <span className="text-text-muted">•</span>
                <span>{firm.instruments}</span>
              </p>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCell label="Profit Split" value={`${firm.profitSplit}%`} highlight />
            <StatCell label="Payout Speed" value={firm.dailyPayouts ? 'Daily' : firm.payoutSpeed} />
            <StatCell label="Largest Discount" value={`${firm.discountPercent}% OFF`} />
            <StatCell label="Fit for" value={firm.instruments} />
          </div>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {firm.dailyPayouts && <HubChip tone="success"><Check className="w-3 h-3" /> Daily Payouts</HubChip>}
            {firm.instantFunding && <HubChip tone="warning"><Check className="w-3 h-3" /> Instant Funding</HubChip>}
            {firm.noActivationFee && <HubChip tone="info"><Check className="w-3 h-3" /> No Activation Fee</HubChip>}
            {firm.oneTimeFee && <HubChip tone="primary"><Check className="w-3 h-3" /> One-Time Fee</HubChip>}
            {firm.dealEndsAt && (
              <HubChip tone="warning">
                <Timer className="w-3 h-3" /> Deal ends {new Date(firm.dealEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </HubChip>
            )}
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full px-4 md:px-6 lg:px-8 max-w-7xl pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
              <Sparkles className="w-4 h-4" /> Accounts & Pricing
            </div>
            <h2 className="text-2xl font-black tracking-tighter mt-2">
              Accounts from <GradientText>{firm.name}</GradientText>
            </h2>

            <div className="mt-6 flex flex-wrap gap-2">
              {firm.accountPrices?.map((pl) => (
                <button
                  key={pl.plan}
                  type="button"
                  onClick={() => setPlanName(pl.plan)}
                  className={`px-4 py-2 rounded-full border text-sm font-bold transition-all ${
                    plan.plan === pl.plan
                      ? 'bg-primary text-white border-primary shadow-primary'
                      : 'border-border bg-card text-text-secondary hover:text-text-primary hover:border-primary/40'
                  }`}
                >
                  {pl.plan}
                  <span className="ml-1.5 text-xs font-black opacity-70 tabular-nums">{pl.sizes.length}</span>
                </button>
              ))}
            </div>

            {plan.planDesc && <p className="mt-3 text-sm text-text-secondary">{plan.planDesc}</p>}

            <div className="mt-4 overflow-hidden rounded-[24px] border border-border bg-card">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Account size</span>
                <span className="ml-auto text-[11px] font-bold uppercase tracking-wider text-text-muted">List price</span>
                <span className="w-28 text-right text-[11px] font-bold uppercase tracking-wider text-text-muted">Your price</span>
                <span className="w-20 text-right text-[11px] font-bold uppercase tracking-wider text-text-muted">Save</span>
              </div>
              <div className="divide-y divide-border">
                {plan.sizes.map((p) => (
                  <button
                    key={p.size}
                    type="button"
                    onClick={() => setSizeKey(p.size)}
                    className={`w-full flex items-center gap-2 px-5 py-4 text-left transition-colors ${
                      selected?.size === p.size ? 'bg-primary/10' : 'hover:bg-glass'
                    }`}
                  >
                    <span
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selected?.size === p.size ? 'border-primary' : 'border-border'
                      }`}
                    >
                      {selected?.size === p.size && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    <span className="flex-1 font-bold text-text-primary">{p.size}</span>
                    <span className="text-sm text-text-muted line-through tabular-nums w-24 text-right">${p.price}</span>
                    <span className="text-sm font-black text-text-primary tabular-nums w-28 text-right">${p.discounted}</span>
                    <span className="text-xs font-black text-success tabular-nums w-20 text-right">
                      {Math.max(0, p.price - p.discounted)} ({Math.round(((p.price - p.discounted) / p.price) * 100)}%)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selected && (selected.evalRules?.length || selected.fundedRules?.length) && (
              <div className="mt-10">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <BookOpen className="w-4 h-4" /> Account Rules · {plan.plan} · {selected.size}
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!!selected.evalRules?.length && (
                    <RulesCard title="Evaluation Rules" tone="info" rows={selected.evalRules} />
                  )}
                  {!!selected.fundedRules?.length && (
                    <RulesCard title="Funded Account Rules" tone="success" rows={selected.fundedRules} />
                  )}
                </div>
                {rulesTracked && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
                    <RefreshCw className={`w-3.5 h-3.5 ${firm.rulesStatus === 'OK' ? 'text-success' : 'text-warning'}`} />
                    {firm.rulesStatus === 'OK'
                      ? `Auto-tracked — ${rulesTracked.toLowerCase()} from the firm's own site`
                      : "Rules re-checking automatically — last known rules shown, verify on the firm's site"}
                  </div>
                )}
              </div>
            )}

            {firm.description && (
              <>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary mt-10">
                  <Globe className="w-4 h-4" /> About
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">{firm.description}</p>
              </>
            )}
          </div>

          <aside className="lg:col-span-2 lg:sticky lg:top-8">
            <div className="rounded-[24px] bg-gradient-to-br from-primary/60 via-primary-dark/40 to-info/50 p-[1.5px] shadow-primary/20 shadow-2xl">
              <div className="rounded-[23px] bg-card/95 backdrop-blur p-6 flex flex-col gap-5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <Timer className="w-4 h-4" /> Price Builder
                </div>

                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Account type</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {firm.accountPrices?.map((pl) => (
                      <button
                        key={pl.plan}
                        type="button"
                        onClick={() => setPlanName(pl.plan)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          plan.plan === pl.plan ? 'bg-primary text-white' : 'bg-glass text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {pl.plan}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Account size</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {plan.sizes.map((s) => (
                      <button
                        key={s.size}
                        type="button"
                        onClick={() => setSizeKey(s.size)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black tabular-nums transition-all ${
                          selected?.size === s.size ? 'bg-primary text-white shadow-primary' : 'bg-glass text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {s.size}
                      </button>
                    ))}
                  </div>
                </div>

                {selected && (
                  <div className="rounded-2xl border border-border bg-gradient-to-r from-glass to-transparent p-4">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-text-muted line-through tabular-nums">${selected.price}</span>
                        <span className="text-4xl font-black text-text-primary tabular-nums">${selected.discounted}</span>
                      </div>
                      <span className="text-xs font-black text-success tabular-nums">
                        Save ${selected.price - selected.discounted} ({savePct}%)
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-text-secondary tabular-nums">
                      {plan.plan} · {selected.size} · {firm.discountPercent}% off with code
                    </div>
                  </div>
                )}

                <CtaButton href={firm.websiteUrl} block>
                  <span className="font-black">Get Funded</span>
                  <span className="mx-1 h-4 w-px bg-white/30" />
                  <span>Up to {firm.discountPercent}% OFF</span>
                </CtaButton>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Your promo code</div>
                    {firm.promoCode ? (
                      <div className="font-black text-primary text-lg tracking-widest">{firm.promoCode}</div>
                    ) : (
                      <div className="text-sm font-bold text-text-secondary">No code right now</div>
                    )}
                  </div>
                  {firm.promoCode && (
                    <button
                      type="button"
                      onClick={copyCode}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-3.5 py-2 text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>

                {verified ? (
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <ShieldCheck className="w-4 h-4 text-success" />
                    Code auto-tracked — {verified} from the firm's own site
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <ShieldCheck className="w-4 h-4 text-warning" />
                    Code is being re-checked — verify on the firm's site at checkout
                  </div>
                )}
              </div>
            </div>

            <GlowCard>
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <Timer className="w-4 h-4" /> Snapshot
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-text-secondary">Rating</span>
                  <span className="font-bold flex items-center gap-1"><Star className="w-3.5 h-3.5 text-warning fill-amber-400" /> {firm.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-sm text-text-secondary">Profit split</span>
                  <span className="font-bold">{firm.profitSplit}%</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-sm text-text-secondary">Payouts</span>
                  <span className="font-bold">{firm.dailyPayouts ? 'Daily' : firm.payoutSpeed}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-sm text-text-secondary">Activation fee</span>
                  <span className="font-bold">{firm.noActivationFee ? 'Free' : 'May apply'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-sm text-text-secondary">Master card / one-time fee</span>
                  <span className="font-bold">{firm.oneTimeFee ? 'Yes' : 'Standard'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Promo code</span>
                  {firm.promoCode && <PromoCopy code={firm.promoCode} />}
                </div>
              </div>
            </GlowCard>
          </aside>
        </div>
      </section>
    </div>
  )
}