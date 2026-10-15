import { login, api, parseSizeK, detectType, ruleVal, pctOf } from './qa-lib.mjs'
import fs from 'node:fs'

const manifest = JSON.parse(fs.readFileSync(new URL('./qa-manifest.json', import.meta.url), 'utf8'))

// ---- deterministic trade sequences (PnL via explicit pip math) ----
const SEQ = {
  FUTURES: { instrument: 'NQ1!', pipSize: 0.25, pipValue: 5, qty: 1, base: 20000 },
  FOREX: { instrument: 'EURUSD', pipSize: 0.0001, pipValue: 10, qty: 1, base: 1.1 },
}
const DAYS = ['2026-08-18T14:30:00Z', '2026-08-19T14:30:00Z', '2026-08-20T14:30:00Z']
// per-day pnl targets: day1 +W, day2 -L, day3 +W
const PLAN = {
  FUTURES: [
    { dir: 'LONG', pts: 20 },   // +400
    { dir: 'LONG', pts: -15 },  // -300
    { dir: 'LONG', pts: 10 },   // +200
  ],
  FOREX: [
    { dir: 'LONG', pips: 50 },   // +500
    { dir: 'LONG', pips: -40 },  // -400
    { dir: 'LONG', pips: 25 },   // +250
  ],
}

function buildTrades(acct) {
  const s = SEQ[acct.market]
  const plan = PLAN[acct.market]
  return plan.map((p, i) => {
    let entry, exit
    if (acct.market === 'FUTURES') {
      entry = s.base + i * 20
      exit = entry + p.pts
    } else {
      entry = +(s.base + i * 0.002).toFixed(4)
      exit = +(entry + p.pips * s.pipSize).toFixed(4)
    }
    return {
      instrument: s.instrument,
      direction: p.dir,
      entryPrice: entry,
      exitPrice: exit,
      quantity: s.qty,
      pipSize: s.pipSize,
      pipValue: s.pipValue,
      fees: 0,
      status: 'COMPLETED',
      result: p.pts > 0 || p.pips > 0 ? 'WIN' : 'LOSS',
      entryTime: DAYS[i],
      exitTime: DAYS[i],
      accountId: acct.id,
    }
  })
}

// ---- independent expected calculator (from PRD rules, not app code) ----
// NOTE: engine groups sessions by trade createdAt (all injected "today" NY) -> single-day model
function expected(acct, trades) {
  const start = acct.sizeNum
  const dd = pctOf(acct.maxTotal, start)
  const dll = pctOf(acct.maxDaily, start)
  const target = pctOf(acct.profitTarget, start)
  const type = acct.type
  const steps = acct.planSteps
  const all = acct.evalRules.map(r => `${r.label} ${r.value}`).join(' ').toLowerCase()
  const lock = /safety net|start \+ \$100|starting balance \+ \$100/.test(all)
    ? start + 100
    : /locks|safety/.test(all) ? start : Infinity

  let balance = start
  let peak = start
  for (const t of trades) {
    const raw = t.direction === 'LONG' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice
    balance += (raw / t.pipSize) * t.pipValue * t.quantity
    if (balance > peak) peak = balance
  }
  const dayEnd = balance
  const dayPnl = balance - start

  let floor
  if (dd > 0) {
    if (type === 'STATIC') floor = start - dd
    else {
      const high = type === 'EOD_TRAILING' ? dayEnd : peak
      floor = Math.min(high - dd, lock)
    }
  } else floor = null

  let status = 'ACTIVE'
  let phaseIdx = 0
  if (dll > 0 && dayPnl <= -dll) status = acct.market === 'FUTURES' ? 'DAILY_PAUSED' : 'FAILED'
  if (status === 'ACTIVE' && balance <= floor) status = 'FAILED'
  if (status === 'ACTIVE' && target > 0 && dayEnd >= start + target) {
    phaseIdx++
    if (phaseIdx >= steps) status = 'PASSED'
  }
  return { status, phaseIdx, balance: Math.round(balance * 100) / 100, floor: floor === null || !isFinite(floor) ? null : Math.round(floor * 100) / 100, totalPnl: Math.round(dayPnl * 100) / 100 }
}

// ---- main ----
await login()
const only = process.argv[3]
let list = manifest
if (only) list = manifest.filter(a => a.slug.includes(only) || a.name.includes(only))

console.log(`injecting trades into ${list.length} accounts...`)
let injected = 0
for (const acct of list) {
  const trades = buildTrades(acct)
  for (const t of trades) {
    const r = await api('/trades', { method: 'POST', body: t })
    if (!r.ok) console.log(`  INJ FAIL ${acct.name}: ${r.status} ${JSON.stringify(r.json?.message || '').slice(0, 100)}`)
    else injected++
  }
}
console.log(`injected ${injected} trades`)

console.log('verifying progress vs independent calculator...')
const mismatches = []
let checked = 0
for (const acct of list) {
  const trades = buildTrades(acct)
  const exp = expected(acct, trades)
  const r = await api(`/accounts/${acct.id}/progress`)
  const p = r.data
  if (!r.ok || !p) { mismatches.push({ acct: acct.name, err: 'progress fetch failed ' + r.status }); continue }
  checked++
  const got = { status: p.status, balance: Math.round((p.balance ?? 0) * 100) / 100, floor: p.floor == null ? null : Math.round(p.floor * 100) / 100, totalPnl: Math.round((p.totalPnl ?? 0) * 100) / 100 }
  const diffs = []
  if (exp.status !== got.status) diffs.push(`status exp=${exp.status} got=${got.status}`)
  if (Math.abs((exp.balance ?? 0) - (got.balance ?? 0)) > 0.01) diffs.push(`balance exp=${exp.balance} got=${got.balance}`)
  if (exp.floor !== null && got.floor !== null && Math.abs(exp.floor - got.floor) > 0.01) diffs.push(`floor exp=${exp.floor} got=${got.floor}`)
  if (Math.abs(exp.totalPnl - got.totalPnl) > 0.01) diffs.push(`pnl exp=${exp.totalPnl} got=${got.totalPnl}`)
  if (diffs.length) mismatches.push({ acct: acct.name, type: acct.type, market: acct.market, diffs })
}
console.log(`checked ${checked}, mismatches: ${mismatches.length}`)
fs.writeFileSync(new URL('./qa-mismatches.json', import.meta.url), JSON.stringify(mismatches, null, 1))
for (const m of mismatches.slice(0, 30)) console.log('  ' + m.acct + ' :: ' + (m.diffs ? m.diffs.join(' ; ') : m.err))
