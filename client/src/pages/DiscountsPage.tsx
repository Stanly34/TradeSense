import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, TicketPercent, ShieldCheck, RefreshCw } from 'lucide-react'
import * as propFirmService from '../services/propFirms'
import type { PropFirm } from '../services/propFirms'
import { HubHead, HubStats, PromoCopy, CtaButton, HubChip } from '../components/hub/Hub'

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

export function DiscountsPage() {
  const [firms, setFirms] = useState<PropFirm[]>([])

  useEffect(() => {
    propFirmService.listPropFirms()
      .then((list) => setFirms(list.filter((f) => f.isActive)))
      .catch(() => setFirms([]))
  }, [])

  const byDiscount = [...firms].sort((a, b) => b.discountPercent - a.discountPercent)
  const maxDiscount = Math.max(0, ...firms.map((f) => f.discountPercent))
  const withCodes = firms.filter((f) => f.promoCode).length
  const verified = firms.filter((f) => f.codeStatus === 'OK').length

  return (
    <div className="min-h-full bg-background text-text-primary">
      <HubHead
        eyebrow="Auto-Tracked Deals"
        title="Discounts &"
        gradient="Promo Codes"
        sub={
          <>
            Current <strong className="text-text-primary font-bold">auto-tracked promo codes</strong> for every firm — codes are
            re-verified from each firm's own website every 6 hours, so when a firm changes its code, this page changes with it.
          </>
        }
      >
        <HubStats
          items={[
            { value: String(firms.length), label: 'Firms with Deals' },
            { value: `${maxDiscount}%`, label: 'Largest Discount', accent: 'text-success' },
            { value: String(withCodes), label: 'Active Codes' },
            { value: `${verified}`, label: 'Verified Automatically', accent: 'text-info' },
          ]}
        />
      </HubHead>

      <section className="relative max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {byDiscount.map((f) => {
            const p = propFirmService.firstPrice(f)
            const verifiedLabel = f.codeStatus === 'OK'
              ? `Verified ${ago(f.lastCodeCheckAt)} · auto-updates every 6h`
              : f.codeStatus === 'STALE'
                ? 'Re-checking soon · code may have changed'
                : 'Set manually by the team'
            return (
              <div key={f.id} className="group relative rounded-[24px] border border-border bg-card p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl overflow-hidden">
                <div className="pointer-events-none absolute top-[-40%] right-[-40%] w-[220px] h-[220px] rounded-full blur-[90px] opacity-20 group-hover:opacity-40 transition-opacity duration-700 bg-primary/15" />
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{ backgroundColor: f.logoColor }}>
                      {f.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-text-primary truncate">{f.name}</h3>
                      <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                        {f.codeStatus === 'OK' ? (
                          <ShieldCheck className="w-3 h-3 text-success" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        {verifiedLabel}
                      </div>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-success flex items-center gap-1 tabular-nums">
                    -{f.discountPercent}%
                  </span>
                </div>

                <div className="relative z-10 rounded-2xl border border-border bg-gradient-to-r from-glass to-transparent p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-1">
                        <TicketPercent className="w-3 h-3 text-primary" /> Promo Code
                      </span>
                      {f.promoCode ? <PromoCopy code={f.promoCode} /> : <span className="text-sm font-bold text-text-secondary">No code right now</span>}
                    </div>
                    {p && (
                      <div className="text-right">
                        <div className="text-xs text-text-muted line-through">${p.price}</div>
                        <div className="text-lg font-black text-text-primary tabular-nums">${p.discounted}</div>
                        <div className="text-[10px] text-text-secondary">{p.size}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative z-10 flex flex-wrap gap-1.5">
                  {f.dailyPayouts && <HubChip tone="success">Daily Payouts</HubChip>}
                  {f.instantFunding && <HubChip tone="warning">Instant Funding</HubChip>}
                  {f.noActivationFee && <HubChip tone="info">No Activation Fee</HubChip>}
                  {f.oneTimeFee && <HubChip tone="primary">One-Time Fee</HubChip>}
                </div>

                <div className="relative z-10 mt-auto flex items-center gap-2 pt-1">
                  <CtaButton href={f.websiteUrl} block>
                    <span className="text-xs font-black">Apply Code</span>
                  </CtaButton>
                  <Link to={`/prop-firms/firm/${f.slug}`} className="flex-shrink-0 p-3 rounded-2xl border border-border text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors" title="Firm details">
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-10 text-center text-xs text-text-muted max-w-lg mx-auto leading-relaxed">
          Codes are automatically re-verified from each firm's own website every 6 hours. If a firm's site can't be reached the last
          verified code stays visible while we re-check. Prices and promo codes can change without notice — the discount shown
          applies when the code is entered at checkout.
        </p>
      </section>
    </div>
  )
}