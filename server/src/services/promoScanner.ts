import { prisma } from '../lib/prisma.js'
import { applyScanResult, listScanTargets } from './propFirm.js'
import { logAction } from './auditLog.js'

interface ScanResult {
  code?: string
  percent?: number
  dealEndsAt?: Date
  status: string
}

interface ScannerConfig {
  slug: string
  urls: string[]
  parse: (html: string) => ScanResult | null
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

export async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!res.ok) return null
    const text = await res.text()
    return text.length > 2_000_000 ? text.slice(0, 2_000_000) : text
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const CODE_REJECT = new Set([
  'YOUR', 'TOTAL', 'TEXT', 'DIV', 'COMPONENT', 'VERTICAL', 'CODE', 'SAVE', 'GET', 'OFF',
  'FREE', 'SALE', 'NEW', 'TOP', 'BEST', 'START', 'END', 'HOME', 'SHOP', 'BUY', 'USE',
  'ENTER', 'APPLY', 'PROMO', 'DISCOUNT', 'COUPON', 'PRICE', 'MENU', 'CLASS', 'STYLE',
  'CLICK', 'LINK', 'SECTION', 'CENTER', 'RIGHT', 'LEFT', 'FLEX', 'GRID', 'WIDTH',
])

function looksLikeCode(token: string): boolean {
  if (token.length < 3 || token.length > 15) return false
  if (!/^[A-Z0-9]+$/.test(token)) return false
  if (!/[0-9]/.test(token)) return false
  return !CODE_REJECT.has(token)
}

function findCode(text: string): string | null {
  const patterns = [
    /"(?:promoCode|promo_code|discountCode|code)"\s*:\s*"([A-Za-z0-9_-]{3,20})"/i,
    /(?:promo|discount|coupon)\s*[-_ ]?code\s*[:=]\s*["']([A-Za-z0-9_-]{3,20})["']/i,
    /(?:promo code|promo-code|discount code|coupon code)\s*[:\-–]?\s*["']?([A-Z0-9]{3,15})["']?/i,
    /(?:use|enter|apply)\s+(?:the\s+)?(?:promo|discount|coupon)?\s*code\s*[: ]?\s*["']?([A-Z0-9]{3,15})["']?/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) {
      const token = m[1].toUpperCase()
      if (looksLikeCode(token)) return token
    }
  }
  return null
}

function findPercent(text: string): number | null {
  const patterns = [
    /(?:up\s*to\s*)?(\d{1,3})\s*%\s*off/i,
    /(\d{1,3})%?\s*(?:discount|off)/i,
    /"discount(?:Percent|pct)?"\s*:\s*(\d{1,3})/i,
    /(?:save|save\s*up\s*to)\s*(\d{1,3})\s*%/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) {
      const p = parseInt(m[1], 10)
      if (p > 0 && p <= 99) return p
    }
  }
  return null
}

function monthIndex(name: string): number {
  const map: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  }
  return map[name.slice(0, 3).toLowerCase()] ?? -1
}

function findDealEndsAt(text: string): Date | null {
  const kw = '(?:ends|end|expires|expire|expiry|valid\\s*(?:until|till|through)|offer\\s*(?:ends|valid|until|till|through)|promo(?:tion)?\\s*(?:ends|valid|until|till))\\s*(?:on\\s*)?(?:the\\s*)?'
  const months = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
  const monthNameRe = new RegExp(kw + '(' + months + ')\\.?\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:\\s*,\\s*)?\\s*(20\\d{2})?', 'i')
  const numericRe = new RegExp(kw + '(\\d{1,2})[\\/\\-.]\\s*(\\d{1,2})(?:[\\/\\-.]\\s*(\\d{2,4}))?', 'i')

  let m: RegExpMatchArray | null = null
  let month = -1
  let day = -1
  let year = new Date().getFullYear()

  m = text.match(monthNameRe)
  if (m) {
    month = monthIndex(m[1])
    day = parseInt(m[2], 10)
    if (m[3]) year = parseInt(m[3], 10)
  } else {
    m = text.match(numericRe)
    if (m) {
      month = parseInt(m[1], 10)
      day = parseInt(m[2], 10)
      if (m[3]) {
        const y = parseInt(m[3], 10)
        year = y < 100 ? 2000 + y : y
      }
    }
  }
  if (!m || month < 1 || month > 12 || day < 1 || day > 31) return null

  const now = new Date()
  const candidate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59))
  if (candidate.getTime() < now.getTime() - 24 * 3600 * 1000) return null
  return candidate
}

function genericParse(html: string): ScanResult | null {
  const code = findCode(html)
  const percent = findPercent(html)
  const dealEndsAt = findDealEndsAt(html)
  if (!code && percent === null && !dealEndsAt) return null
  return { code: code ?? undefined, percent: percent ?? undefined, dealEndsAt: dealEndsAt ?? undefined, status: 'OK' }
}

function requireHtml(parse: (html: string) => ScanResult | null) {
  return parse
}

const SCANNERS: Record<string, ScannerConfig> = {
  'tradeify': { slug: 'tradeify', urls: ['https://tradeify.com', 'https://tradeify.com/promo'], parse: requireHtml(genericParse) },
  'lucid-trading': { slug: 'lucid-trading', urls: ['https://www.lucidtrading.co', 'https://www.lucidtrading.co/promo'], parse: requireHtml(genericParse) },
  'takeprofit-trader': { slug: 'takeprofit-trader', urls: ['https://takeprofittrader.com', 'https://takeprofittrader.com/promo'], parse: requireHtml(genericParse) },
  'apex-trader-funding': { slug: 'apex-trader-funding', urls: ['https://apextraderfunding.com'], parse: requireHtml(genericParse) },
  'fundednext-futures': { slug: 'fundednext-futures', urls: ['https://fundednext.com'], parse: requireHtml(genericParse) },
  'tradeday': { slug: 'tradeday', urls: ['https://tradeday.com'], parse: requireHtml(genericParse) },
  'legends-trading': { slug: 'legends-trading', urls: ['https://legendstrading.com'], parse: requireHtml(genericParse) },
  'funded-futures-network': { slug: 'funded-futures-network', urls: ['https://fundedfuturesnetwork.com/promo', 'https://fundedfuturesnetwork.com'], parse: requireHtml(genericParse) },
  'bulenox': { slug: 'bulenox', urls: ['https://bulenox.com'], parse: requireHtml(genericParse) },
  'toponefutures': { slug: 'toponefutures', urls: ['https://toponefutures.com'], parse: requireHtml(genericParse) },
  'daytraders': { slug: 'daytraders', urls: ['https://daytradersfunding.com'], parse: requireHtml(genericParse) },
  'earn2trade': { slug: 'earn2trade', urls: ['https://www.e2t.co', 'https://earn2trade.com'], parse: requireHtml(genericParse) },
  'e8-markets-futures': { slug: 'e8-markets-futures', urls: ['https://e8markets.com'], parse: requireHtml(genericParse) },
  'goat-funded-trader': { slug: 'goat-funded-trader', urls: ['https://goatfundedtrader.com'], parse: requireHtml(genericParse) },
  'ftmo': { slug: 'ftmo', urls: ['https://ftmo.com'], parse: requireHtml(genericParse) },
  'the5ers': { slug: 'the5ers', urls: ['https://the5ers.com'], parse: requireHtml(genericParse) },
  'fundednext-fx': { slug: 'fundednext-fx', urls: ['https://fundednext.com'], parse: requireHtml(genericParse) },
  'e8-markets-fx': { slug: 'e8-markets-fx', urls: ['https://e8markets.com'], parse: requireHtml(genericParse) },
  'aquafunded': { slug: 'aquafunded', urls: ['https://aquafunded.com'], parse: requireHtml(genericParse) },
  'funded-trading-plus': { slug: 'funded-trading-plus', urls: ['https://fundedtradingplus.com'], parse: requireHtml(genericParse) },
}

export async function scanFirm(firm: { id: string; slug: string; name: string; promoSourceUrl: string | null }): Promise<{
  changed: boolean
  status: string
}> {
  const config = SCANNERS[firm.slug]
  if (!config) {
    await applyScanResult(firm.id, { status: 'MANUAL', checkedAt: new Date() })
    return { changed: false, status: 'MANUAL' }
  }

  const urls = config.urls
  const sourceUrl = firm.promoSourceUrl
  const candidates = [...(sourceUrl ? [sourceUrl] : []), ...urls].filter(
    (u, i, arr) => arr.indexOf(u) === i
  )

  for (const url of candidates) {
    const html = await fetchHtml(url)
    if (!html) continue
    const result = config.parse(html)
    if (result) {
      const prev = await prisma.propFirm.findUnique({ where: { id: firm.id } })
      const changed = !!(
        prev &&
        ((result.code !== undefined && prev.promoCode !== result.code) ||
          (result.percent !== undefined && prev.discountPercent !== result.percent) ||
          (result.dealEndsAt !== undefined && prev.dealEndsAt?.getTime() !== result.dealEndsAt.getTime()))
      )
      await applyScanResult(firm.id, { ...result, checkedAt: new Date() })

      if (changed) {
        const adminUser = await prisma.user.findFirst({
          where: { role: 'ADMIN' },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        })
        if (adminUser) {
          await logAction(adminUser.id, 'PROP_FIRM_CODE_UPDATED', 'PROP_FIRM', firm.id, {
            name: firm.name,
            source: url,
            newCode: result.code ?? null,
            newPercent: result.percent ?? null,
          })
        }
        console.log(`[promo-scan] ${firm.name}: code/discount changed (source: ${url})`)
      }
      return { changed, status: 'OK' }
    }
  }

  await applyScanResult(firm.id, { status: 'STALE', checkedAt: new Date() })
  console.warn(`[promo-scan] ${firm.name}: no code found — marked STALE, keeping last known values`)
  return { changed: false, status: 'STALE' }
}

export async function scanAllPropFirms() {
  const targets = await listScanTargets()
  const results = { ok: 0, stale: 0, manual: 0, changed: 0 }
  for (const firm of targets) {
    try {
      const res = await scanFirm(firm)
      if (res.status === 'OK') results.ok++
      else if (res.status === 'STALE') results.stale++
      else results.manual++
      if (res.changed) results.changed++
    } catch (err) {
      console.error(`[promo-scan] ${firm.name}: scan error:`, err)
      results.stale++
    }
  }
  console.log(
    `[promo-scan] scan complete — ${targets.length} firms: OK=${results.ok} STALE=${results.stale} MANUAL=${results.manual} CHANGED=${results.changed}`
  )
  return results
}