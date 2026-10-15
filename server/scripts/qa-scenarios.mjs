import { login, api } from './qa-lib.mjs'
import fs from 'node:fs'

await login()
const { data: accounts } = await api('/accounts')
const find = (n) => accounts.find(x => x.name === n)
const results = []

async function progress(id) {
  return (await api(`/accounts/${id}/progress`)).data
}

async function trade(acct, pnlTarget) {
  const fut = acct.defaultValues?.marketType === 'FUTURES'
  const div = fut ? 20 : 1000
  const body = fut
    ? { instrument: 'NQ1!', direction: 'LONG', entryPrice: 20000, exitPrice: 20000 + pnlTarget / div, quantity: 1, pipSize: 0.25, pipValue: 5, fees: 0, status: 'COMPLETED', result: pnlTarget < 0 ? 'LOSS' : 'WIN', entryTime: '2026-08-21T16:30:00Z', exitTime: '2026-08-21T16:30:00Z', accountId: acct.id }
    : { instrument: 'EURUSD', direction: 'LONG', entryPrice: 1.1, exitPrice: +(1.1 + pnlTarget / div).toFixed(5), quantity: 1, pipSize: 0.0001, pipValue: 10, fees: 0, status: 'COMPLETED', result: pnlTarget < 0 ? 'LOSS' : 'WIN', entryTime: '2026-08-21T16:30:00Z', exitTime: '2026-08-21T16:30:00Z', accountId: acct.id }
  const r = await api('/trades', { method: 'POST', body })
  if (!r.ok) console.log('  TRADE FAIL:', acct.name, r.status, JSON.stringify(r.json).slice(0, 140))
  return r
}

// 1. DLL forex -> FAILED (FTMO 2-Step 100k, dll 5000) - use qty 5 so price stays positive
{
  const a = find('FTMO FTMO Challenge (2-Step) 100k')
  const p0 = await progress(a.id)
  const r = await api('/trades', {
    method: 'POST',
    body: { instrument: 'EURUSD', direction: 'LONG', entryPrice: 1.1, exitPrice: 1.045, quantity: 1, pipSize: 0.0001, pipValue: 10, fees: 0, status: 'COMPLETED', result: 'LOSS', entryTime: '2026-08-21T16:30:00Z', exitTime: '2026-08-21T16:30:00Z', accountId: a.id },
  })
  if (!r.ok) console.log('  TRADE FAIL 1:', r.status, JSON.stringify(r.json).slice(0, 120))
  const p1 = await progress(a.id)
  results.push({ scenario: 'DLL forex breach -> FAILED', acct: a.name, before: p0.status, after: p1.status, pass: p1.status === 'FAILED' })
}
// 2. DLL futures -> DAILY_PAUSED (Goat Futures Sprint 25k, fresh account)
{
  const a = find('Goat Funded Sprint Challenge 25k')
  const p0 = await progress(a.id)
  await trade(a, -p0.balance + 24000)
  const p1 = await progress(a.id)
  results.push({ scenario: 'DLL futures breach -> DAILY_PAUSED', acct: a.name, before: p0.status, after: p1.status, pass: p1.status === 'DAILY_PAUSED' })
}
// 3. Hard floor breach -> FAILED (LucidPro 25k EOD, fresh account)
{
  const a = find('Lucid Trading LucidPro 25k')
  const p0 = await progress(a.id)
  await trade(a, -(p0.balance - p0.floor) - 400)
  const p1 = await progress(a.id)
  results.push({ scenario: 'Hard floor breach -> FAILED', acct: a.name, before: p0.status, after: p1.status, pass: p1.status === 'FAILED' })
}
// 4. 1-step target -> FUNDED (FTMO 1-Step 100k, target 10%)
{
  const a = find('FTMO FTMO Challenge (1-Step) 100k')
  const p0 = await progress(a.id)
  await trade(a, 10500 - (p0.totalPnl || 0))
  const p1 = await progress(a.id)
  results.push({ scenario: '1-step target -> FUNDED', acct: a.name, before: `${p0.status}/${p0.phase}`, after: `${p1.status}/${p1.phase}`, pass: p1.phase === 'FUNDED' })
}
// 5. 2-step target -> PHASE2 (FTMO 2-Step 50k repaired, target 5000)
{
  const a = find('FTMO FTMO Challenge (2-Step) 50k')
  const p0 = await progress(a.id)
  await trade(a, 5500 - (p0.totalPnl || 0))
  const p1 = await progress(a.id)
  results.push({ scenario: '2-step target -> PHASE2', acct: a.name, before: `${p0.status}/${p0.phase}`, after: `${p1.status}/${p1.phase}`, pass: p1.phase === 'PHASE2' })
}
// 6. Idempotency: reconcile twice -> identical state (AquaFunded FUNDED + FTMO 50k PHASE2)
{
  const a1 = find('AquaFunded 1-Step Evaluation 100k')
  const b1 = await progress(a1.id)
  const a2 = find('FTMO FTMO Challenge (2-Step) 50k')
  const b2 = await progress(a2.id)
  const c1 = await progress(a1.id)
  const c2 = await progress(a2.id)
  const stable = (x, y) => x.balance === y.balance && x.phase === y.phase && x.status === y.status
  results.push({ scenario: 'Idempotent reconcile (FUNDED + PHASE2)', acct: 'AquaFunded 100k + FTMO 50k', before: `${b1.balance}/${b2.balance}`, after: `${c1.balance}/${c2.balance}`, pass: stable(b1, c1) && stable(b2, c2) })
}

fs.writeFileSync(new URL('./qa-scenarios.json', import.meta.url), JSON.stringify(results, null, 1))
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.scenario} | ${r.before} -> ${r.after}`)
