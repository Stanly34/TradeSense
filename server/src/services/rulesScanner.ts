import { prisma } from '../lib/prisma.js'
import { applyRulesResult, applyRulesStatus, listRulesTargets, normSize } from './propFirm.js'
import { fetchHtml } from './promoScanner.js'
import { logAction } from './auditLog.js'

export interface RuleRow {
  label: string
  value: string
}

interface RulesResult {
  sizes: Array<{ size: string; evalRules?: RuleRow[]; fundedRules?: RuleRow[] }>
}

interface RulesScannerConfig {
  slug: string
  urls: string[]
  parse: (html: string) => RulesResult | null
}

const EVAL_LABELS: Array<[RegExp, string]> = [
  [/profit target|profit goal/i, 'Profit target'],
  [/max(?:imum)? loss/i, 'Max loss'],
  [/daily loss/i, 'Daily loss limit'],
  [/consistency/i, 'Consistency'],
  [/minimum trading days|min trading days|min days/i, 'Min trading days'],
  [/max contracts/i, 'Max contracts'],
  [/drawdown/i, 'Drawdown'],
  [/time limit|timeframe/i, 'Time limit'],
]

const FUNDED_LABELS: Array<[RegExp, string]> = [
  [/profit split|profit share|reward share/i, 'Profit split'],
  [/payout schedule|payout frequency|payouts$/i, 'Payout schedule'],
  [/minimum payout|min payout/i, 'Min payout'],
  [/buffer/i, 'Buffer'],
  [/scaling/i, 'Scaling'],
  [/payout cap/i, 'Payout cap'],
]

function strip(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function tables(html: string): string[][][] {
  const out: string[][][] = []
  const tableRe = /<table[\s\S]*?<\/table>/gi
  let tm: RegExpExecArray | null
  while ((tm = tableRe.exec(html))) {
    const rows: string[][] = []
    const rowRe = /<tr[\s\S]*?<\/tr>/gi
    let rm: RegExpExecArray | null
    while ((rm = rowRe.exec(tm[0]))) {
      const cells: string[] = []
      const cellRe = /<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi
      let cm: RegExpExecArray | null
      while ((cm = cellRe.exec(rm[0]))) cells.push(strip(cm[0]))
      if (cells.length) rows.push(cells)
    }
    if (rows.length) out.push(rows)
  }
  return out
}

function sizeFromCell(cell: string): string | null {
  const trimmed = cell.trim().replace(/[, ]/g, '').replace(/^[$€£]/g, '')
  const m = trimmed.match(/^(\d+)(k|K)?$/)
  if (!m) return null
  const n = parseInt(m[1]!, 10)
  if (!n) return null
  if (m[2]) return `${n}k`
  if (n >= 1000 && n % 1000 === 0) return `${n / 1000}k`
  return null
}

function normalizeSizeName(size: string): string {
  return normSize(size)
}

function parseRulesTables(html: string): RulesResult | null {
  const sizes = new Map<string, { evalRules: Map<string, string>; fundedRules: Map<string, string> }>()

  for (const rows of tables(html)) {
    if (rows.length < 2) continue
    const header = rows[0]!
    const hasLabel = header.some(
      (c) => EVAL_LABELS.some(([re]) => re.test(c)) || FUNDED_LABELS.some(([re]) => re.test(c))
    )
    if (!hasLabel) continue

    for (const row of rows) {
      let sizeCell = -1
      for (let i = 0; i < row.length; i++) {
        if (sizeFromCell(row[i]!)) {
          sizeCell = i
          break
        }
      }
      if (sizeCell === -1) continue
      const name = normalizeSizeName(row[sizeCell]!)
      let entry = sizes.get(name)
      if (!entry) {
        entry = { evalRules: new Map(), fundedRules: new Map() }
        sizes.set(name, entry)
      }
      for (let i = 0; i < row.length; i++) {
        if (i === sizeCell) continue
        const labelCell = i < header.length ? header[i]! : ''
        const evalMatch = EVAL_LABELS.find(([re]) => re.test(labelCell))
        const fundedMatch = FUNDED_LABELS.find(([re]) => re.test(labelCell))
        const label = evalMatch?.[1] ?? fundedMatch?.[1]
        if (!label) continue
        const target = evalMatch ? entry.evalRules : entry.fundedRules
        if (!target.has(label)) target.set(label, row[i] ?? '')
      }
    }
  }

  if (!sizes.size) return null
  return {
    sizes: [...sizes.entries()].map(([size, v]) => ({
      size,
      evalRules: v.evalRules.size
        ? [...v.evalRules.entries()].map(([label, value]) => ({ label, value }))
        : undefined,
      fundedRules: v.fundedRules.size
        ? [...v.fundedRules.entries()].map(([label, value]) => ({ label, value }))
        : undefined,
    })),
  }
}

const RULES_SCANNERS: Record<string, RulesScannerConfig> = {
  'tradeify': { slug: 'tradeify', urls: ['https://tradeify.com/growth-account/', 'https://tradeify.com'], parse: parseRulesTables },
  'lucid-trading': { slug: 'lucid-trading', urls: ['https://support.lucidtrading.com/', 'https://www.lucidtrading.co'], parse: parseRulesTables },
  'takeprofit-trader': { slug: 'takeprofit-trader', urls: ['https://takeprofittrader.com/pricing/', 'https://takeprofittrader.com'], parse: parseRulesTables },
  'apex-trader-funding': { slug: 'apex-trader-funding', urls: ['https://apextraderfunding.com/evaluations/', 'https://apextraderfunding.com'], parse: parseRulesTables },
  'fundednext-futures': { slug: 'fundednext-futures', urls: ['https://fundednext.com/product-details', 'https://fundednext.com'], parse: parseRulesTables },
  'tradeday': { slug: 'tradeday', urls: ['https://tradeday.com/rules/', 'https://tradeday.com'], parse: parseRulesTables },
  'legends-trading': { slug: 'legends-trading', urls: ['https://thelegendstrading.com/pricing/', 'https://thelegendstrading.com'], parse: parseRulesTables },
  'funded-futures-network': { slug: 'funded-futures-network', urls: ['https://fundedfuturesnetwork.com/pricing/', 'https://fundedfuturesnetwork.com'], parse: parseRulesTables },
  'bulenox': { slug: 'bulenox', urls: ['https://bulenox.com/official-terms/', 'https://bulenox.com'], parse: parseRulesTables },
  'toponefutures': { slug: 'toponefutures', urls: ['https://toponefutures.com/pricing/', 'https://toponefutures.com'], parse: parseRulesTables },
  'daytraders': { slug: 'daytraders', urls: ['https://daytraders.com/pricing/', 'https://daytraders.com'], parse: parseRulesTables },
  'earn2trade': { slug: 'earn2trade', urls: ['https://www.e2t.co/gauntlet-mini', 'https://www.e2t.co'], parse: parseRulesTables },
  'e8-markets-futures': { slug: 'e8-markets-futures', urls: ['https://e8markets.com/pricing', 'https://e8markets.com'], parse: parseRulesTables },
  'goat-funded-trader': { slug: 'goat-funded-trader', urls: ['https://goatfundedtrader.com/pricing', 'https://goatfundedtrader.com'], parse: parseRulesTables },
  'ftmo': { slug: 'ftmo', urls: ['https://ftmo.com/terms-and-trading-objectives/', 'https://ftmo.com'], parse: parseRulesTables },
  'the5ers': { slug: 'the5ers', urls: ['https://the5ers.com/high-stakes/', 'https://the5ers.com'], parse: parseRulesTables },
  'fundednext-fx': { slug: 'fundednext-fx', urls: ['https://fundednext.com/product-details', 'https://fundednext.com'], parse: parseRulesTables },
  'e8-markets-fx': { slug: 'e8-markets-fx', urls: ['https://e8markets.com/pricing', 'https://e8markets.com'], parse: parseRulesTables },
  'aquafunded': { slug: 'aquafunded', urls: ['https://aquafunded.com/pricing', 'https://aquafunded.com'], parse: parseRulesTables },
  'funded-trading-plus': { slug: 'funded-trading-plus', urls: ['https://fundedtradingplus.com/pricing', 'https://fundedtradingplus.com'], parse: parseRulesTables },
}

export async function scanFirmRules(firm: {
  id: string
  slug: string
  name: string
  rulesSourceUrl: string | null
}): Promise<{ changed: boolean; status: string }> {
  const config = RULES_SCANNERS[firm.slug]
  if (!config) {
    await applyRulesStatus(firm.id, 'MANUAL', new Date())
    return { changed: false, status: 'MANUAL' }
  }

  const candidates = [...(firm.rulesSourceUrl ? [firm.rulesSourceUrl] : []), ...config.urls].filter(
    (u, i, arr) => arr.indexOf(u) === i
  )

  for (const url of candidates) {
    const html = await fetchHtml(url)
    if (!html) continue
    const result = config.parse(html)
    if (result) {
      const prev = await prisma.propFirm.findUnique({ where: { id: firm.id } })
      const prevPlans = (prev?.accountPrices ?? []) as unknown as Array<{
        sizes: Array<{ size: string; evalRules?: RuleRow[]; fundedRules?: RuleRow[] }>
      }>
      const changed = result.sizes.some((rs) =>
        prevPlans.some((p) =>
          p.sizes.some(
            (s) =>
              normSize(s.size) === rs.size &&
              (JSON.stringify(s.evalRules ?? []) !== JSON.stringify(rs.evalRules ?? []) ||
                JSON.stringify(s.fundedRules ?? []) !== JSON.stringify(rs.fundedRules ?? []))
          )
        )
      )
      await applyRulesResult(firm.id, result, new Date())

      if (changed) {
        const adminUser = await prisma.user.findFirst({
          where: { role: 'ADMIN' },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        })
        if (adminUser) {
          await logAction(adminUser.id, 'PROP_FIRM_RULES_UPDATED', 'PROP_FIRM', firm.id, {
            name: firm.name,
            source: url,
            sizes: result.sizes.map((s) => s.size),
          })
        }
        console.log(`[rules-scan] ${firm.name}: rules changed (source: ${url})`)
      }
      return { changed, status: 'OK' }
    }
  }

  await applyRulesStatus(firm.id, 'STALE', new Date())
  console.warn(`[rules-scan] ${firm.name}: no rules table found — marked STALE, keeping last known rules`)
  return { changed: false, status: 'STALE' }
}

export async function scanAllFirmsRules() {
  const targets = await listRulesTargets()
  const results = { ok: 0, stale: 0, manual: 0, changed: 0 }
  for (const firm of targets) {
    try {
      const res = await scanFirmRules(firm)
      if (res.status === 'OK') results.ok++
      else if (res.status === 'STALE') results.stale++
      else results.manual++
      if (res.changed) results.changed++
    } catch (err) {
      console.error(`[rules-scan] ${firm.name}: scan error:`, err)
      results.stale++
    }
  }
  console.log(
    `[rules-scan] scan complete — ${targets.length} firms: OK=${results.ok} STALE=${results.stale} MANUAL=${results.manual} CHANGED=${results.changed}`
  )
  return results
}