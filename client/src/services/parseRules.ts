export interface ParsedPropRules {
  phaseTargets: number[]
  maxTotalDrawdown: number
  maxDailyDrawdown: number
  drawdownType: 'STATIC' | 'TRAILING' | 'EOD_TRAILING'
  trailingLock: 'START' | 'START_PLUS_100' | 'NONE'
  dllBreach: 'PAUSE' | 'FAIL'
}

export function parseAccountSizeFromName(sizeName: string): number {
  const s = sizeName.trim().toUpperCase()
  const m = s.match(/(\d+(?:\.\d+)?)\s*M\b/)
  if (m) return Math.round(parseFloat(m[1]) * 1000000)
  const k = s.match(/(\d+(?:\.\d+)?)\s*K\b/)
  if (k) return Math.round(parseFloat(k[1]) * 1000)
  const raw = s.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/)
  if (raw) return Math.round(parseFloat(raw[1].replace(/,/g, '')))
  return 0
}

export function parseMoneyValue(raw: string | undefined, accountSize: number): number {
  if (!raw) return 0
  const s = raw.trim()
  if (!s || /^none(\s*—|\s*-|$)/i.test(s)) return 0
  // compound rules like "2% daily trailing / 5% overall trailing" -> prefer the overall value
  const overallPct = s.match(/([\d.]+)\s*%\s*(?:\([^)]*\)\s*)?overall/i) || s.match(/overall[^%]*?([\d.]+)\s*%/i)
  if (overallPct) return Math.round(accountSize * (parseFloat(overallPct[1]) / 100))
  const overallMoney = s.match(/\$\s*([\d,]+(?:\.\d+)?)\s*overall/i)
  if (overallMoney) return Math.round(parseFloat(overallMoney[1].replace(/,/g, '')))
  const pctMatch = s.match(/(-?\d+(?:\.\d+)?)\s*%/)
  const moneyMatch = s.match(/\$\s*(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?)/)
  if (pctMatch && moneyMatch) {
    // whichever marker appears FIRST in the string wins
    if ((pctMatch.index ?? s.length) < (moneyMatch.index ?? s.length)) {
      return Math.round(accountSize * (parseFloat(pctMatch[1]) / 100))
    }
    return Math.round(parseFloat(moneyMatch[1].replace(/,/g, '')))
  }
  if (pctMatch) return Math.round(accountSize * (parseFloat(pctMatch[1]) / 100))
  return moneyMatch ? Math.round(parseFloat(moneyMatch[1].replace(/,/g, ''))) : 0
}

export function parsePropRules(
  marketType: 'FOREX' | 'FUTURES',
  rules: Array<{ label: string; value: string }> | undefined,
  accountSize: number
): ParsedPropRules {
  const list = rules || []
  const findVal = (...keywords: string[]) => {
    for (const kw of keywords) {
      const hit = list.find((r) => r.label.toLowerCase().includes(kw))
      if (hit) return hit.value
    }
    return undefined
  }

  const stepPattern = /^step\s*(\d+)\s*target/i
  const stepRules = list
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => stepPattern.test(r.label.trim()))
    .sort((a, b) => {
      const na = parseInt(a.r.label.match(stepPattern)?.[1] || '0', 10)
      const nb = parseInt(b.r.label.match(stepPattern)?.[1] || '0', 10)
      return na - nb
    })

  let phaseTargets: number[] = []
  if (stepRules.length > 0) {
    phaseTargets = stepRules.map(({ r }) => parseMoneyValue(r.value, accountSize)).filter((v) => v > 0)
  }
  if (phaseTargets.length === 0) {
    const profit = parseMoneyValue(findVal('profit target'), accountSize)
    if (profit > 0) phaseTargets = [profit]
  }

  const maxLossVal = findVal('max loss', 'max drawdown', 'max total', 'overall loss')
  const maxTotalDrawdown = parseMoneyValue(maxLossVal, accountSize)
  const dailyVal = findVal('daily loss limit', 'daily loss')
  const maxDailyDrawdown = parseMoneyValue(dailyVal, accountSize)

  const lossText = (maxLossVal || '').toLowerCase()
  const drawdownType: 'STATIC' | 'TRAILING' | 'EOD_TRAILING' = lossText.includes('eod trailing')
    ? 'EOD_TRAILING'
    : lossText.includes('trailing')
      ? 'TRAILING'
      : lossText.includes('static')
        ? 'STATIC'
        : marketType === 'FUTURES' && maxTotalDrawdown > 0
          ? 'EOD_TRAILING'
          : 'STATIC'

  const trailingLock: 'START' | 'START_PLUS_100' | 'NONE' = /initial \+ \$100|start \+ \$100|balance at \$100|locks at starting \+/.test(lossText)
    ? 'START_PLUS_100'
    : /locks to balance|locks at starting|locks to initial(?! \+)/.test(lossText)
      ? 'START'
      : drawdownType === 'STATIC'
        ? 'NONE'
        : 'START'

  const dailySoft = (dailyVal || '').toLowerCase()
  const dllBreach: 'PAUSE' | 'FAIL' = /pause|soft/.test(dailySoft)
    ? 'PAUSE'
    : /hard|fail|breach/.test(dailySoft)
      ? 'FAIL'
      : marketType === 'FUTURES'
        ? 'PAUSE'
        : 'FAIL'

  return { phaseTargets, maxTotalDrawdown, maxDailyDrawdown, drawdownType, trailingLock, dllBreach }
}
