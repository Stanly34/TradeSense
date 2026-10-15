import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

// repair accounts corrupted by the old phase-runaway bug (currentAccountSize = 0)
const accounts = await p.account.findMany({ where: { type: 'PROP_FIRM' } })
let repaired = 0
for (const a of accounts) {
  const dv = { ...(a.defaultValues || {}) }
  const size = Number(dv.accountSize) || Number(dv.startingBalance) || 0
  const cur = Number(dv.currentAccountSize) || 0
  if (cur === 0 && size > 0) {
    dv.currentAccountSize = size
    await p.account.update({ where: { id: a.id }, data: { defaultValues: dv } })
    repaired++
    console.log('repaired:', a.name, '->', size)
  }
}
console.log('repaired:', repaired)
await p.$disconnect()
