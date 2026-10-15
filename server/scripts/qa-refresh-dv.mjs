import { login, api } from './qa-lib.mjs'
import fs from 'node:fs'

await login()
const manifest = JSON.parse(fs.readFileSync(new URL('./qa-manifest.json', import.meta.url), 'utf8'))
const affected = manifest.filter(a => (a.evalRules || []).some(r => /overall/i.test(r.value) && (r.label || '').match(/max loss|max drawdown|max total|overall/i)))
const { data: accounts } = await api('/accounts')
let fixed = 0
for (const a of affected) {
  const acct = accounts.find(x => x.name === a.name)
  if (!acct) { console.log('missing', a.name); continue }
  const r = await api(`/accounts/${acct.id}`, {
    method: 'PATCH',
    body: { propFirmId: acct.propFirmId, planName: a.plan, sizeName: a.size, startingBalance: a.sizeNum },
  })
  if (r.ok) {
    fixed++
    const dv = r.data?.defaultValues || {}
    console.log(`${a.name}: dd=${dv.maxTotalDrawdown} type=${dv.drawdownType}`)
  } else {
    console.log('FAIL', a.name, r.status, JSON.stringify(r.json?.message || '').slice(0, 100))
  }
}
console.log('refreshed:', fixed)
