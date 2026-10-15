export interface DocSection {
  id: string
  title: string
  tone: string
  heading: string
  intro: string
  sections: { h: string; p: string }[]
  tips: string[]
  closing: string
}

export const PROP_FIRM_DOCS: DocSection[] = [
  {
    id: 'rules',
    title: 'Rules & Policies',
    tone: 'bg-primary/10 text-primary',
    heading: 'The Rulebook You\nActually Trade',
    intro: 'Every funded account ships with a rulebook. These are the ten policies that matter most, compared across the firms on this page.',
    sections: [
      { h: 'Profit target', p: 'Usually 8% on Phase 1 and 5% on Phase 2. Some one-step firms use 10%+. Calculated on the starting balance, not the peak.' },
      { h: 'Max daily loss', p: 'Typically 3–5% of the starting balance. Measured by balance, and frozen after a profit is locked. A breach closes the account for the day.' },
      { h: 'Max overall / trailing loss', p: '2.5–10% of peak equity. Trailing versions lock in your run-up; if you made $2k, the floor rises with it.' },
      { h: 'Consistency rule', p: 'Best single day must stay under 30–50% of your total target. Hit 2 big days back-to-back and this is what blocks your payout.' },
      { h: 'Minimum trading days', p: 'Often 3–5. You cannot pass on day one; the rule exists to avoid weekend-scalping tactics.' },
      { h: 'News trading / hidden buffers', p: 'Some firms ban high-impact news entries or apply a spike buffer; check the policy each firm publishes.' },
      { h: 'Trading hours', p: 'Sessions are usually Mon–Fri; a daily-loss cut-off time (17:00 ET) counts as the day boundary.' },
      { h: 'Hold period on payouts', p: 'The initial payout often waits until the first payout cycle completes, then the cycle speed applies.' },
    ],
    tips: [
      'Read the rulebook twice: once for the target, once for the daily-loss and consistency clauses.',
      'Firm rules differ on weekend and copy-trading — pick the policy that matches how you trade.',
      'The dashboard prints your daily range — review it nightly, like a pre-flight checklist.',
    ],
    closing: 'A funded account is a contract: target + limits. Everything else in the policy doc is detail.',
  },
  {
    id: 'policies',
    title: 'Funding Policies',
    tone: 'bg-success/10 text-success',
    heading: 'How Firms Fund\nYour Progress',
    intro: 'Discounts, refund promises, resets and scaling — understand the money-side policies before swiping a card.',
    sections: [
      { h: 'Challenge fee & promo codes', p: 'Fees range roughly $65–$350 for a 50k–150k account. Promo codes from this page commonly cut 20–55% — apply at the checkout.' },
      { h: 'Refund promise', p: 'Most firms refund the fee if you fail within 10–15 days of purchase. Keep the original card and the voucher email.' },
      { h: 'Reset/restart pricing', p: 'After a breach, all firms offer a discounted restart (usually the promo price again).' },
      { h: 'Activation after passing', p: 'Passing activates your funded account; some firms require a monthly subscription or a one-time activation fee depending on billing type.' },
      { h: 'Payout frequency', p: 'Bi-weekly, weekly or daily payouts. The fastest splits (e.g. 50% every 2 weeks) apply to the first withdrawal request.' },
      { h: 'Scaling plans', p: 'Milestone-based growth: e.g. $25k → $50k → $100k as you maintain positive months.' },
    ],
    tips: [
      'Track your refund window with a calendar entry — it also resets on restart.',
      'Verified: the biggest discount is usually on the largest account size.',
      'Read the "reset vs breach" policy, since it is often the difference between paying again and continuing.',
    ],
    closing: 'The best deal is the one you can pass, refund-backed, at the promo price.',
  },
  {
    id: 'funding',
    title: 'Funding Models',
    tone: 'bg-info/10 text-info',
    heading: 'One-Step, Two-Step\nor Instant',
    intro: 'The three evaluation models that determine how fast you get to real capital — and how rules still protect the firm.',
    sections: [
      { h: 'One-step (single phase)', p: 'One profit target (8–10%), one max loss (5–6%). No stage 2: reach the target and receive funds. Fast but per-day risk math leaves little room to recover.' },
      { h: 'Two-step', p: 'Phase 1 hits the 8% target, Phase 2 repeats a lower target (5%) with the same limits — discipline check, then funded.' },
      { h: 'Instant funding', p: 'Firms fund a margin hold upfront and set a loss threshold you must never cross; you withdraw your profit at any time, no stages.' },
      { h: 'Real vs virtual scoring', p: 'All are demo-of-record — the broker positions are reported to a dashboard, so pick the rule sets over the demo amount.' },
    ],
    tips: [
      'Choose the model by human style — instant for scalpers, two-step for position traders.',
      'One-step + risk 0.5% a trade and 1×8 target still works: 6–8 good trades.',
    ],
    closing: 'Model is a preference; the rulebook is the contract.',
  },
  {
    id: 'payouts',
    title: 'Payouts',
    tone: 'bg-warning/10 text-warning',
    heading: 'Getting Paid,\nPredictably',
    intro: 'From first payout to a weekly income — the mechanics of withdrawals and the taxes nobody prints on the rate card.',
    sections: [
      { h: 'Payout frequency', p: 'Bi-weekly → weekly → daily tiers. The first payout is typically held for validation; after that the cycle applies.' },
      { h: 'Payout amounts', p: 'You get your split (e.g. 80%) — the firm keeps the rest. Some firms pay extra a monthly activation fee from your profits.' },
      { h: 'Payment methods', p: 'Wire, crypto, PayPal or Compass-A attributes vary by firm; withdrawal fees and processing times are disclosed per method.' },
      { h: 'Tax note', p: 'Prop payouts are taxable income at the trader\u2019s level — keep a ledger (TradeSense exports fit perfectly).' },
    ],
    tips: [
      'Set up your payout profile immediately after being funded.',
      'Daily payout firms make you eligible after 3 consecutive tiny payouts.',
      'Never cash out into a blocked wallet: use the firm\u2019s verified methods only.',
    ],
    closing: 'Choose the payout business model that matches your paycheck habits.',
  },
]

export const PROP_FIRM_RESOURCES = [
  { id: 'guides', title: 'Guides', desc: 'The strategy guides that power the directory — read the rulebook first.', href: '/prop-firms/resources/guides' },
  { id: 'rules', title: 'Rules & Policies', desc: 'Targets, daily loss, trailing drawdown, news filters and consistency rules.', href: '/prop-firms/resources/rules' },
  { id: 'funding', title: 'Funding', desc: 'One-step, two-step, instant — how each firm gets you funded.', href: '/prop-firms/resources/funding' },
  { id: 'payouts', title: 'Payouts', desc: 'Frequency, splits, methods and the tax notes other sites skip.', href: '/prop-firms/resources/payouts' },
]