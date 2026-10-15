import { login, api, parseSizeK, isFutures, detectType, ruleVal } from './qa-lib.mjs'

const phase = process.argv[2] || 'help'

async function wipe() {
  await login()
  let deletedTrades = 0
  for (let page = 1; page <= 50; page++) {
    const { data } = await api(`/trades?limit=100&page=${page}`)
    const trades = data?.trades || []
    if (!trades.length) break
    for (const t of trades) {
      const r = await api(`/trades/${t.id}`, { method: 'DELETE' })
      if (r.ok) deletedTrades++
    }
    page--
    const check = await api('/trades?limit=1')
    if (!check.data?.trades?.length) break
  }
  const { data: accounts } = await api('/accounts')
  let deletedAccounts = 0
  for (const a of accounts || []) {
    const r = await api(`/accounts/${a.id}`, { method: 'DELETE' })
    if (r.ok) deletedAccounts++
  }
  console.log(`WIPED: ${deletedTrades} trades, ${deletedAccounts} accounts`)
}

async function create() {
  await login()
  const { data: firms } = await api('/prop-firms')
  const manifest = []
  let created = 0, failed = 0
  for (const firm of firms) {
    for (const plan of firm.accountPrices || []) {
      for (const size of plan.sizes || []) {
        const bal = parseSizeK(size.size)
        const name = `${firm.name} ${plan.plan} ${size.size}`
        const body = {
          name,
          type: 'PROP_FIRM',
          propFirmId: firm.id,
          planName: plan.plan,
          sizeName: size.size,
          startingBalance: bal,
          defaultValues: {
            marketType: isFutures(firm.instruments) ? 'FUTURES' : 'FOREX',
          },
        }
        const r = await api('/accounts', { method: 'POST', body })
        if (r.ok && r.data?.id) {
          created++
          manifest.push({
            id: r.data.id,
            name,
            firm: firm.name,
            slug: firm.slug,
            plan: plan.plan,
            size: size.size,
            sizeNum: bal,
            market: isFutures(firm.instruments) ? 'FUTURES' : 'FOREX',
            type: detectType(size.evalRules),
            maxTotal: ruleVal(size.evalRules, 'max loss', 'max drawdown', 'max total', 'overall'),
            maxDaily: ruleVal(size.evalRules, 'daily loss', 'daily loss limit'),
            profitTarget: ruleVal(size.evalRules, 'profit target', 'target'),
            planSteps: /2-step|two-step|2 step/i.test(plan.plan) ? 2 : /3-step|three-step/i.test(plan.plan) ? 3 : 1,
            evalRules: size.evalRules,
          })
        } else {
          failed++
          console.log(`  FAIL ${name}: ${r.status} ${JSON.stringify(r.json?.message || '').slice(0, 120)}`)
        }
      }
    }
  }
  const fs = await import('node:fs')
  fs.writeFileSync(new URL('./qa-manifest.json', import.meta.url), JSON.stringify(manifest, null, 1))
  console.log(`CREATED: ${created}, FAILED: ${failed}, manifest entries: ${manifest.length}`)
}

const commands = { wipe, create }
if (commands[phase]) await commands[phase]()
else console.log('usage: node scripts/qa-sweep.mjs <wipe|create>')
