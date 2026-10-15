import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const accounts = await p.account.findMany({ where: { type: 'PROP_FIRM' } })
let backfilled = 0
for (const a of accounts) {
  const dv = { ...(a.defaultValues || {}) }
  if (dv.startPhaseIndex !== undefined) continue
  const planSteps = Number(dv.planSteps) || 1
  const isInstant = /instant/i.test(`${a.name} ${dv.planName || ''}`)
  // instant accounts start FUNDED; evaluations start at phase 0 (advances are re-derived from trades)
  dv.startPhaseIndex = isInstant ? planSteps : 0
  // repair known runaway corruption: phaseIndex beyond legit advance gets re-derived on next reconcile
  await p.account.update({ where: { id: a.id }, data: { defaultValues: dv } })
  backfilled++
}
console.log('backfilled startPhaseIndex:', backfilled)

// repair the corrupted FTMO 2-Step 50k (phaseIndex had runaway to 2)
const ftmo = accounts.find(a => a.name === 'FTMO FTMO Challenge (2-Step) 50k')
if (ftmo) {
  const dv = { ...(ftmo.defaultValues || {}) }
  dv.phaseIndex = 0
  dv.startPhaseIndex = 0
  dv.currentAccountSize = 50000
  dv.phaseStartBalance = 50000
  await p.account.update({ where: { id: ftmo.id }, data: { defaultValues: dv, phase: 'PHASE1' } })
  await p.accountEvent.deleteMany({ where: { accountId: ftmo.id, type: { in: ['PHASE_COMPLETED', 'FUNDED'] } } })
  console.log('repaired FTMO 2-Step 50k -> phaseIndex 0, balance 50000')
}
await p.$disconnect()
