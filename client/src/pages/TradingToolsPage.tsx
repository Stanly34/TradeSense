import { Link } from 'react-router-dom'
import { ArrowUpRight, Calculator, ShieldCheck, RefreshCcw, Zap } from 'lucide-react'
import { GradientText, HubHead, HubStats, IconTile } from '../components/hub/Hub'
import { TOOLS } from '../components/hub/PropFirmTools'

export function TradingToolsPage() {
  return (
    <div className="min-h-full bg-background text-text-primary">
      <HubHead
        eyebrow="Craft Your Edge"
        title="Pro Tools —"
        gradient="Free Calculators"
        sub={
          <>
            Eight fully working calculators, <strong className="text-text-primary font-bold">each on its own page</strong> — position size, consistency, drawdown, challenge simulations and more. Runs entirely in your browser, no signup.
          </>
        }
      >
        <HubStats
          items={[
            { value: '8', label: 'Free Tools' },
            { value: '500', label: 'Monte Carlo Runs', accent: 'text-success' },
            { value: '$0', label: 'Signup Fee' },
            { value: '24/7', label: 'Support & Help' },
          ]}
        />
      </HubHead>

      <div className="relative mx-auto w-full px-4 md:px-6 lg:px-8 max-w-7xl pb-2 flex items-center justify-center gap-1.5 pointer-events-none text-xs text-text-muted">
        <Zap className="w-3.5 h-3.5" /> All calculations happen locally in your browser — as instant as you type.
      </div>

      <section className="py-12">
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {TOOLS.map((t) => (
            <Link
              key={t.id}
              to={`/trading-tools/${t.id}`}
              className="group rounded-[24px] border border-border bg-card p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl h-full"
            >
              <div className="flex items-center justify-between">
                <IconTile><t.icon /></IconTile>
                <ArrowUpRight className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-black uppercase tracking-wider text-sm text-text-primary group-hover:text-primary-light transition-colors">{t.title}</h3>
              <p className="text-sm text-text-secondary flex-1 leading-relaxed">Open the {t.title.toLowerCase()} calculator in one click.</p>
              <span className="text-primary font-bold text-sm">Open Tool →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-4 md:px-6 py-16">
        <div className="pointer-events-none absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full blur-[120px] opacity-15 bg-primary/20" />
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: ShieldCheck, t: 'No signup', d: 'Nothing to install, nothing to pay.' },
            { icon: RefreshCcw, t: 'Reruns live', d: 'Results update as you type.' },
            { icon: Zap, t: 'Instant', d: 'Spreadsheet-grade math, in browser.' },
            { icon: Calculator, t: 'Prop-ready', d: 'Rules mirror real firm evaluation lines.' },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-border bg-card p-5">
              <f.icon className="w-5 h-5 text-primary" />
              <div className="font-black text-text-primary text-sm mt-3">{f.t}</div>
              <div className="text-xs text-text-secondary mt-1 leading-relaxed">{f.d}</div>
            </div>
          ))}
        </div>

        <div className="rounded-[28px] border border-border bg-gradient-to-br from-card to-glass p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-text-primary text-2xl md:text-3xl font-black tracking-tighter">
              One account to <GradientText>trade it all</GradientText>
            </h2>
            <p className="text-text-secondary mt-2 text-sm md:text-base">
              The calculators are free forever. When you want to journal those trades, plan payouts and track consistency, TradeSense has the full dashboard.
            </p>
          </div>
          <Link
            to="/plans"
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-black uppercase tracking-wider text-sm px-8 py-4 hover:brightness-110 transition-all shadow-primary flex-shrink-0"
          >
            Start Free
          </Link>
        </div>
      </section>
    </div>
  )
}