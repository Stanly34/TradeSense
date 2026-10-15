export interface Guide {
  id: string
  tag: string
  tagColor: string
  title: string
  readTime: string
  paragraphs: string[]
  body: string[]
  conclusion: string
}

export const TAG_COLORS: Record<string, string> = {
  'NEWS': 'bg-primary/10 text-primary',
  'ECONOMICS': 'bg-warning/10 text-warning',
  'TOOLS': 'bg-info/10 text-info',
  'LIFESTYLE': 'bg-success/10 text-success',
  'TECHNIQUE': 'bg-primary/10 text-primary-light',
  'GUIDE': 'bg-danger/10 text-danger',
  'EDUCATION': 'bg-warning/10 text-warning',
}

export const GUIDES: Guide[] = [
  {
    id: 'how-prop-firms-work',
    tag: 'NEWS',
    tagColor: 'bg-primary/10 text-primary',
    title: 'How Does a Prop Firm Work in 2025',
    readTime: '5 min read',
    paragraphs: [
      'A prop firm (short for proprietary trading firm) evaluates you with its own money. You trade through a challenge — usually one, two or three steps — until you hit a profit target (e.g. 8%) without breaching the max loss limits. Pass, and you get a funded account of real capital (often $25k, $50k or $100k) to trade with.',
      'The firm takes on the risk; you take a cut of the profits — typically 70% to 100% depending on the firm and account type. That is the whole model: your skill is the product, the firm offers leverage on its balance sheet.',
      'Most firms add a "trailing" twist: the max loss limit follows your best balance, so the deeper you are in profit, the more protection you keep. Daily loss limits protect the firm from a single disaster day.',
    ],
    body: [
      'Understanding the evaluation is step one: look for the profit target, max daily loss, max overall loss, minimum trading days, and consistency rule before you buy.',
    ],
    conclusion: 'The best way to think about it: a prop account is a live P&L puzzle — hit target, respect limits, get paid.',
  },
  {
    id: 'inflation-badge',
    tag: 'ECONOMICS',
    tagColor: 'bg-warning/10 text-warning',
    title: 'Prop Firms Funding in a High-Inflation World',
    readTime: '4 min read',
    paragraphs: [
      'Inflation reshapes prop funding in one simple way: nominal account sizes stay the same, but their purchasing power falls. A $50k evaluation in 2021 bought a lot more lifestyle than the same $50k today.',
      'The counterintuitive alternative: inflation is exactly why prop firms hold their appeal. Traders need income streams faster than slow-growth job wages, and the daily payouts trend (2024–2025) turns trading wins into same-week cash flow instead of month-end paychecks.',
      'Watch payout structures: some firms quote "shared" splits (e.g. 80% for you), others straight up "100% and more" — in inflationary environments the percentage matters more than ever.',
    ],
    body: [
      'Every funded decision in a high-inflation year should consider: payout speed, percentage split, and weekly cost averages of challenge fees.',
    ],
    conclusion: 'Buy power is the goal — and prop funding remains one of the few titles that converts small capital into professional-scale buying power.',
  },
  {
    id: 'rate-language',
    tag: 'TOOLS',
    tagColor: 'bg-info/10 text-info',
    title: 'How to Read a Prop Firm Rate Card',
    readTime: '6 min read',
    paragraphs: [
      'Every prop firm publishes a rate card — a table of accounts with prices, target percentages, fees and thresholds. The standard fields: Size & Price (e.g. $50k for $145), Discount (what a promo code like LUMI takes off), Profit Target %, Daily Loss Limit %, Trailing Max Loss %, and Payout conditions.',
      'The trap is "list price" psychology. The list price is rarely what you should pay — promo codes from listings sites (like this one) routinely cut 30–50% of the fee. Always cross-reference the discount column and the promo row before checkout.',
      'Then compare the risk columns — not the price. A cheaper account with a 5% max trailing is riskier than a $50 more expensive one with 6%.',
    ],
    body: [
      'Golden rule: price is the visible bait, loss limits are the real product.',
    ],
    conclusion: 'Track a table for two weeks before paying. The best deal is the one you can pass.',
  },
  {
    id: 'day-in-life',
    tag: 'LIFESTYLE',
    tagColor: 'bg-success/10 text-success',
    title: 'A Day in the Life of a Funded Prop Trader',
    readTime: '7 min read',
    paragraphs: [
      '06:45 — pre-market scan: news calendar, session openings, Asia-to-London flow. Most funded traders target the London open because the liquidity is deterministic and the stops are cleaner.',
      '09:00 — first executions: pre-defined setups only. Funded traders do not wing it; every tick in is a pre-determined A+ setup from last night\u2019s journal.',
      '12:00 — risk check: the daily loss line. Many firms print a "daily range" on the dashboard; the professional funds that money check into the remaining room.',
      '15:00 — stats close: flatten (or move to breakeven), log everything in TradeSense, review, plan tomorrow.',
    ],
    body: [
      'The funded lifestyle is 3 hours of desk focus on your plan, not 12 hours of screen coffee.',
    ],
    conclusion: 'Structure beats inspiration — this daily loop is how the 80% split gets paid as a weekly paycheck.',
  },
  {
    id: 'price-power',
    tag: 'TECHNIQUE',
    tagColor: 'bg-primary/10 text-primary-light',
    title: 'Price Action: The Power Level Chronicles',
    readTime: '8 min read',
    paragraphs: [
      'Price action is the pure form of supply and demand: every candle the history of buyers and sellers at that level. The "Power Level" concept — a liquidity pool given inside prop communities — is a zone where recent price sloshed back and forth, storing orders.',
      'The technique: mark the level, wait for price to sweep (wicks beyond it), then reclaim — and trade the return to the level with a tight stop. This produces the extreme R multiple equation: double-digit R entries where the risk is the tiny wick zone.',
      'In a prop accounting context price action matters twice: one, entries with close stops mean your max daily loss buffer stays intact; two, sweep-prone entries are the pattern many retail traders get stopped out of only to watch price ride.',
    ],
    body: [
      'Study sweeps: 70% of the most profitable prop entries are sweep-to-level plays.',
    ],
    conclusion: 'Add one Power Level map to your nightly review — your R% will change in the first week.',
  },
  {
    id: 'pass-single-phase',
    tag: 'GUIDE',
    tagColor: 'bg-danger/10 text-danger',
    title: 'How to Pass a Single-Phase Challenge',
    readTime: '9 min read',
    paragraphs: [
      'Single-phase (or "one-step") challenges have one target — usually 8–10% — with a max drawdown of 5–6%. There is no intermediate step: pass target, get funded. The math: you must produce 1.5× your chosen risk per trade in verified trades while keeping the drawdown from ever touching.',
      'Strategy: risk 0.5% a trade, aim for 3R winners. 6–8 great trades hit the 8–10% target. The fun constant: your daily range max is the same 5% or so → never bet more than 1/10 of the daily limit in one position.',
      'Discipline check: journal every trade like an audit — the funded firm asked for exactly two things, target and limits; deliver both on a spreadsheet.',
    ],
    body: [
      'One-phase is the "fast funding" route: fewer steps = quicker payout cycles, but the per-day risk math leaves no room for a revenge trade.',
    ],
    conclusion: 'Pass rate is symmetric: risk exactly your plan, and the only room for variance is your target advantage.',
  },
  {
    id: 'ai-simulator',
    tag: 'EDUCATION',
    tagColor: 'bg-warning/10 text-warning',
    title: 'Should You Use an AI Prop Firm Simulator?',
    readTime: '6 min read',
    paragraphs: [
      'AI challenge simulators (like the Monte Carlo tool on our Trading Tools page) run the exact pass-criteria math over hundreds of virtual day cycles inside your browser: your target %, win rate, average win/loss, max drawdown — and it tells you your statistical pass probability.',
      'The honest truth: simulators aren\u2019t magic — they answer the math question "given these numbers, how often do you reach the target first?". If your answer says 28%, the biggest and best fix is your plan, not your simulator.',
      'Where simulators shine is the decision: choosing the right account size. Run the sim on a 25k vs 50k with identical R profile and the size that keeps pass rate above 60% should be the buy.',
    ],
    body: [
      'Use sims for decisions; use journals for execution. The two tools win challenges.',
    ],
    conclusion: 'Run 500 sims before you buy. If it holds, buy — and trade the plan.',
  },
]