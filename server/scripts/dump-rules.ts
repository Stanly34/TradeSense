import { FIRMS } from '../prisma/seed-prop-firms.js'
import { parsePropRules, parseAccountSizeFromName } from '../../client/src/services/parseRules.js'

const rows: string[] = []
for (const firm of FIRMS) {
  if (firm.isActive === false) continue
  const market = (firm.instruments || '').toUpperCase().includes('FUTURES') ? 'FUTURES' as const : 'FOREX' as const
  console.log(`\n=== ${firm.name} (${market}) ===`)
  for (const plan of firm.accountPrices) {
    for (const s of plan.sizes) {
      const sizeNum = parseAccountSizeFromName(s.size)
      const p = parsePropRules(market, s.evalRules, sizeNum)
      const line = [
        `${plan.plan} · ${s.size}`.padEnd(46),
        `tgt [${p.phaseTargets.join(', ')}]`.padEnd(20),
        `max ${String(p.maxTotalDrawdown).padStart(6)} ${p.drawdownType}/${p.trailingLock}`.padEnd(34),
        `dll ${p.maxDailyDrawdown} ${p.dllBreach}`,
      ].join(' | ')
      console.log(line)
      rows.push(line)
    }
  }
}
console.log(`\n${rows.length} account rows parsed`)
