import { useState } from 'react'
import type { ReactNode } from 'react'
import { Calculator, Ruler, Percent, TrendingUp as TrendingUpIcon, Dices, Gauge, Scale, BookOpen, Crosshair } from 'lucide-react'

export function NumInput({ label, value, onChange, step = 1, hint, prefix, suffix }: {
  label: string
  value: string
  onChange: (v: string) => void
  step?: number
  hint?: string
  prefix?: string
  suffix?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">{label}</span>
      <div className="flex items-center bg-input border border-border rounded-xl px-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/60 transition">
        {prefix && <span className="text-text-muted text-sm mr-1">{prefix}</span>}
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2.5 text-sm text-text-primary placeholder-text-muted outline-none"
        />
        {suffix && <span className="text-text-muted text-sm ml-1">{suffix}</span>}
      </div>
      {hint && <span className="text-[11px] text-text-muted">{hint}</span>}
    </label>
  )
}

export function ToolCard({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="h-full bg-card border border-border rounded-[24px] p-6 flex flex-col gap-5 transition-colors hover:border-primary/40 group">
      <div>
        <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-widest mb-2">
          <span className="w-1 h-1 rounded-full bg-primary" /> Free Tool
        </div>
        <h3 className="font-black text-text-primary text-lg">{title}</h3>
        <p className="text-sm text-text-secondary mt-1 leading-relaxed">{desc}</p>
      </div>
      <div className="flex-1 space-y-3">{children}</div>
    </div>
  )
}

export function Result({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'green' | 'amber' | 'red' }) {
  const tones = {
    default: 'text-text-primary',
    green: 'text-success',
    amber: 'text-warning',
    red: 'text-danger',
  }
  return (
    <div className="flex items-center justify-between bg-elevated border border-border rounded-xl px-4 py-3">
      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-extrabold tabular-nums ${tones[tone]}`}>{value}</span>
    </div>
  )
}

export const round = (n: number, d = 2) => (isFinite(n) ? Number(n.toFixed(d)) : 0)

export function LotSizeTool() {
  const [balance, setBalance] = useState('10000')
  const [riskPct, setRiskPct] = useState('1')
  const [stopPips, setStopPips] = useState('20')
  const [lotValue, setLotValue] = useState('10')
  const risk = (parseFloat(balance) || 0) * ((parseFloat(riskPct) || 0) / 100)
  const lots = stopPips === '0' ? 0 : risk / ((parseFloat(stopPips) || 0) * (parseFloat(lotValue) || 10))
  return (
    <ToolCard title="Position Size Calculator" desc="Position size for your stop loss — how many lots keep a losing trade inside your risk budget.">
      <NumInput label="Account Balance" prefix="$" value={balance} onChange={setBalance} step={100} />
      <NumInput label="Risk Per Trade" suffix="%" value={riskPct} onChange={setRiskPct} step={0.1} />
      <NumInput label="Stop Loss" value={stopPips} onChange={setStopPips} hint="Distance in pips (or points of price)." />
      <NumInput label="$ per Pip per Lot" value={lotValue} onChange={setLotValue} step={0.1} hint="Forex standard lot = $10/pip; micro = $0.10." />
      <Result label="Money at Risk" value={`$${round(risk).toLocaleString()}`} />
      <Result label="Suggested Position Size" value={`${round(lots, 3)} lots`} tone="green" />
    </ToolCard>
  )
}

export function ConsistencyTool() {
  const [target, setTarget] = useState('5000')
  const [bestDay, setBestDay] = useState('1800')
  const [rule, setRule] = useState('30')
  const maxAllowed = (parseFloat(target) || 0) * ((parseFloat(rule) || 30) / 100)
  const over = (parseFloat(bestDay) || 0) > maxAllowed
  return (
    <ToolCard title="Consistency Rule Check" desc="Prop firms cap a single day\u2019s profit (usually 30% of target). Verify your biggest day stays inside the rule.">
      <NumInput label="Profit Target" prefix="$" value={target} onChange={setTarget} />
      <NumInput label="Best Single Day" prefix="$" value={bestDay} onChange={setBestDay} />
      <NumInput label="Rule %" value={rule} onChange={setRule} />
      <Result label="Max Allowed/Day" value={`$${round(maxAllowed).toLocaleString()}`} tone={over ? 'red' : 'green'} />
      <Result label="Status" value={over ? `BREACHED ($${round((parseFloat(bestDay) || 0) - maxAllowed).toLocaleString()} over)` : 'Within rule — safe day'} tone={over ? 'red' : 'green'} />
    </ToolCard>
  )
}

export function ReturnTool() {
  const [initial, setInitial] = useState('4000')
  const [pnl, setPnl] = useState('520')
  const [days, setDays] = useState('12')
  const pct = (parseFloat(initial) || 0) > 0 ? ((parseFloat(pnl) || 0) / (parseFloat(initial) || 0)) * 100 : 0
  const daily = days !== '0' ? pct / (parseFloat(days) || 1) : 0
  const yearly = (Math.pow(1 + daily / 100, 252) - 1) * 100
  return (
    <ToolCard title="Return Calculator" desc="Your return % over a period — plus the simple annualized projection (252 trading days).">
      <NumInput label="Starting Capital" prefix="$" value={initial} onChange={setInitial} />
      <NumInput label="Profit / Loss" prefix="$" value={pnl} onChange={setPnl} step={10} />
      <NumInput label="Trading Days" value={days} onChange={setDays} />
      <Result label="Return" value={`${round(pct)}%`} tone={pct >= 0 ? 'green' : 'red'} />
      <Result label="Avg Daily Return" value={`${round(daily)}%`} />
      <Result label="Annualized (252 days)" value={`${round(yearly)}%`} tone={yearly > 20 ? 'amber' : 'default'} />
    </ToolCard>
  )
}

export function ProfitTargetTool() {
  const [balance, setBalance] = useState('50000')
  const [targetPct, setTargetPct] = useState('8')
  const [days, setDays] = useState('30')
  const target = (parseFloat(balance) || 0) * ((parseFloat(targetPct) || 0) / 100)
  const perDay = days === '0' ? 0 : target / (parseFloat(days) || 1)
  const maxDay = target * 0.3
  return (
    <ToolCard title="Profit Target Calculator" desc="Your target $ and the daily pace required to hit it — and what the 30% consistency rule allows.">
      <NumInput label="Account Size" prefix="$" value={balance} onChange={setBalance} step={1000} />
      <NumInput label="Target" suffix="%" value={targetPct} onChange={setTargetPct} step={0.5} />
      <NumInput label="Trading Days" value={days} onChange={setDays} />
      <Result label="Target in $" value={`$${round(target).toLocaleString()}`} tone="green" />
      <Result label="Needed Per Day" value={`$${round(perDay).toLocaleString()}`} />
      <Result label="Consistency Cap (30%)" value={`$${round(maxDay).toLocaleString()}`} tone="amber" />
    </ToolCard>
  )
}

export function DrawdownTool() {
  const [balance, setBalance] = useState('25000')
  const [maxLoss, setMaxLoss] = useState('5')
  const [dailyLimit, setDailyLimit] = useState('1500')
  const dd = (parseFloat(balance) || 0) * ((parseFloat(maxLoss) || 0) / 100)
  const blown = (parseFloat(dailyLimit) || 0) >= dd
  return (
    <ToolCard title="Max Drawdown Calculator" desc="Know exactly when the account is blown — the maximum loss allowed per day vs the trailing drawdown room.">
      <NumInput label="Simulated Balance" prefix="$" value={balance} onChange={setBalance} />
      <NumInput label="Max Drawdown" suffix="%" value={maxLoss} onChange={setMaxLoss} hint="Trailing or fixed, from balance." />
      <NumInput label="Single Day Loss Limit" prefix="$" value={dailyLimit} onChange={setDailyLimit} />
      <Result label="Allowed Drawdown Room" value={`$${round(dd).toLocaleString()}`} />
      <Result label="After -1 Flat Day Equity" value={`$${round((parseFloat(balance) || 0) - (parseFloat(dailyLimit) || 0)).toLocaleString()}`} />
      <Result label="Day Limit vs Room" value={blown ? `BLOWN — daily limit hits DD ($${round(dd - (parseFloat(dailyLimit) || 0)).toLocaleString()} left)` : 'Inside daily limit'} tone={blown ? 'red' : 'green'} />
    </ToolCard>
  )
}

export function MonteCarloTool() {
  const [balance, setBalance] = useState('20000')
  const [winsTarget, setWinsTarget] = useState('8')
  const [maxDd, setMaxDd] = useState('6')
  const [winChance, setWinChance] = useState('55')
  const [winAvg, setWinAvg] = useState('1.2')
  const [lossAvg, setLossAvg] = useState('0.9')
  const bal = parseFloat(balance) || 0
  const target = bal * (1 + ((parseFloat(winsTarget) || 0) / 100))
  const ddFloor = bal * (1 - ((parseFloat(maxDd) || 0) / 100))
  const winP = (parseFloat(winChance) || 0) / 100
  const wg = ((parseFloat(winAvg) || 0) / 100)
  const lg = ((parseFloat(lossAvg) || 0) / 100)
  const sims = 500
  let passed = 0
  let avgDays = 0
  let maxDays = 0
  for (let s = 0; s < sims; s++) {
    let eq = bal
    let days = 0
    while (eq > ddFloor && eq < target && days < 365) {
      days++
      const r = Math.random()
      if (r < winP) eq *= 1 + wg
      else eq *= 1 - lg
      if (days % 7 === 0 && Math.random() < 0.04) eq = Math.max(ddFloor + 1, eq * 0.92)
    }
    avgDays += days
    if (eq >= target) passed++
    maxDays = Math.max(maxDays, days)
  }
  const rate = round((passed / sims) * 100)
  return (
    <ToolCard title="Challenge Simulator — Monte Carlo" desc="Runs 500 simulated challenges with your risk profile and reports the pass probability of hitting your target first.">
      <NumInput label="Balance" prefix="$" value={balance} onChange={setBalance} />
      <NumInput label="Pass Target" suffix="%" value={winsTarget} onChange={setWinsTarget} hint="e.g. 8% for an 8% challenge." />
      <NumInput label="Max Drawdown" suffix="%" value={maxDd} onChange={setMaxDd} />
      <div className="grid grid-cols-3 gap-3">
        <NumInput label="Win Chance" suffix="%" value={winChance} onChange={setWinChance} />
        <NumInput label="Avg Win" suffix="%" value={winAvg} onChange={setWinAvg} />
        <NumInput label="Avg Loss" suffix="%" value={lossAvg} onChange={setLossAvg} />
      </div>
      <Result label="Simulations" value={`${sims.toLocaleString()}`} />
      <Result label="Pass Probability" value={`${rate}%`} tone={rate >= 50 ? 'green' : rate >= 30 ? 'amber' : 'red'} />
      <Result label="Avg. Time to Completion" value={`${round(avgDays / sims)} days`} />
    </ToolCard>
  )
}

export function AccountQuizTool() {
  const [exp, setExp] = useState('2')
  const [hours, setHours] = useState('6')
  const [riskPref, setRiskPref] = useState('medium')
  const [confidence, setConfidence] = useState('70')

  const score = (parseFloat(exp) || 0) + (parseFloat(hours) || 0) / 2 + (parseFloat(confidence) || 0) / 20 + (riskPref === 'high' ? 1.5 : riskPref === 'medium' ? 1 : 0.5)
  const account = score >= 7 ? 'Market Max ($100,000)' : score >= 5 ? 'Pro ($50,000)' : score >= 3.5 ? 'Starter ($25,000)' : 'Mini ($10,000)'

  function Option({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
      <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${active ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-input border-border text-text-secondary hover:bg-hover hover:text-text-primary'}`}>
        {children}
      </button>
    )
  }

  return (
    <ToolCard title="Profit-Scale Quiz" desc="Answer 4 quick questions and get a suggested starting account size for prop evaluations.">
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Experience</span>
        <div className="flex gap-2">
          {['1', '2', '3', '4'].map((v) => <Option key={v} active={exp === v} onClick={() => setExp(v)}>{v === '1' ? 'New' : v === '4' ? 'Pro' : `${v} yr`}</Option>)}
        </div>
      </div>
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Daily Hours</span>
        <div className="flex gap-2">
          {['3', '6', '9'].map((v) => <Option key={v} active={hours === v} onClick={() => setHours(v)}>{v}h</Option>)}
        </div>
      </div>
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Risk Preference</span>
        <div className="flex gap-2">
          {(['low', 'medium', 'high'] as const).map((v) => <Option key={v} active={riskPref === v} onClick={() => setRiskPref(v)}>{v}</Option>)}
        </div>
      </div>
      <NumInput label="Confidence %" suffix="%" value={confidence} onChange={setConfidence} hint="How sure are you of your edge." />
      <Result label="Your Suggested Program" value={account} tone="green" />
    </ToolCard>
  )
}

export function RiskRewardTool() {
  const [balance, setBalance] = useState('5000')
  const [riskPct, setRiskPct] = useState('1')
  const [rr, setRr] = useState('3')
  const risk = (parseFloat(balance) || 0) * ((parseFloat(riskPct) || 0) / 100)
  const target = risk * (parseFloat(rr) || 0)
  return (
    <ToolCard title="Risk & R Calculator" desc="The classic R-multiple tool: define your risk per trade and see your take-profit target.">
      <NumInput label="Account Balance" prefix="$" value={balance} onChange={setBalance} />
      <NumInput label="Risk Per Trade" suffix="%" value={riskPct} onChange={setRiskPct} />
      <NumInput label="Desired R" value={rr} onChange={setRr} hint="Distance to take-profit, in R (e.g. 3 = 3:1)." />
      <Result label="1R Risk" value={`$${round(risk).toLocaleString()}`} />
      <Result label="Take-Profit (R×Multiple)" value={`$${round(target).toLocaleString()}`} tone="green" />
      <Result label="Loss Breakeven R" value={`-1R = $${round(risk).toLocaleString()}`} tone="red" />
    </ToolCard>
  )
}

export function FundedLedgerTool() {
  const [balance, setBalance] = useState('25000')
  const [payoutPct, setPayoutPct] = useState('50')
  const [monthPnl, setMonthPnl] = useState('3000')
  const bal = parseFloat(balance) || 0
  const pnl = parseFloat(monthPnl) || 0
  const payout = pnl * ((parseFloat(payoutPct) || 0) / 100)
  const roi = bal > 0 ? (pnl / bal) * 100 : 0
  return (
    <ToolCard title="Funded Ledger" desc="What a funded account pays out: plug in monthly profit and split — see manager vs trader share.">
      <NumInput label="Funded Balance X2" prefix="$" value={balance} onChange={setBalance} />
      <NumInput label="Monthly P/L" prefix="$" value={monthPnl} onChange={setMonthPnl} />
      <NumInput label="Prop Share %" suffix="%" value={payoutPct} onChange={setPayoutPct} hint="Firms keep the other %, you pocket this." />
      <Result label="Monthly Return" value={`${round(roi)}%`} tone={roi >= 0 ? 'green' : 'red'} />
      <Result label="Your Potential Payout" value={`$${round(payout).toLocaleString()}`} tone="green" />
      <Result label="Firm Keeps" value={`$${round(pnl - payout).toLocaleString()}`} />
    </ToolCard>
  )
}

export const TOOLS = [
  { id: 'lot-size', icon: Calculator, title: 'Lot Size', comp: LotSizeTool },
  { id: 'consistency', icon: Gauge, title: 'Consistency Rule', comp: ConsistencyTool },
  { id: 'return', icon: Percent, title: 'Return %', comp: ReturnTool },
  { id: 'drawdown', icon: TrendingUpIcon, title: 'Max Drawdown', comp: DrawdownTool },
  { id: 'challenge-sim', icon: Dices, title: 'Challenge Sim', comp: MonteCarloTool },
  { id: 'scale-quiz', icon: Ruler, title: 'Scale Quiz', comp: AccountQuizTool },
  { id: 'risk-r', icon: Scale, title: 'Risk & R', comp: RiskRewardTool },
  { id: 'funded-ledger', icon: BookOpen, title: 'Funded Ledger', comp: FundedLedgerTool },
] as const

export const FIRM_TOOLS = [
  { id: 'position-size', icon: Calculator, title: 'Position Size Calculator', desc: 'Lots for your stop loss, from risk % and pip value.', href: '/trading-tools/lot-size', comp: LotSizeTool },
  { id: 'drawdown', icon: TrendingUpIcon, title: 'Drawdown Calculator', desc: 'Max-loss room per account and when a day limit blows it.', href: '/trading-tools/drawdown', comp: DrawdownTool },
  { id: 'profit-target', icon: Crosshair, title: 'Profit Target Calculator', desc: 'Target $ and the daily pace — plus the 30% consistency ceiling.', href: '/trading-tools/return', comp: ProfitTargetTool },
  { id: 'prop-firm', icon: Dices, title: 'Prop Firm Calculator', desc: '500 Monte Carlo runs: your pass probability on any challenge.', href: '/trading-tools/challenge-sim', comp: MonteCarloTool },
] as const