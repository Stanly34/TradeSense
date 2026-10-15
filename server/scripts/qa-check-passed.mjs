import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const names = [
  'AquaFunded 1-Step Evaluation 100k',
  'FTMO FTMO Challenge (2-Step) 50k',
  'E8 FX FX Evaluation (1-Step) 100k',
  'FTMO FTMO Challenge (1-Step) 100k',
]
for (const n of names) {
  const a = await p.account.findFirst({ where: { name: n }, include: { trades: { select: { entryPrice: true, exitPrice: true, direction: true, pipSize: true, pipValue: true, quantity: true, fees: true } } } })
  if (!a) { console.log(n, 'MISSING'); continue }
  const dv = a.defaultValues
  const pnl = a.trades.reduce((s, t) => s + (t.pnl || 0), 0)
  console.log(n)
  console.log('  dv.currentAccountSize=', dv.currentAccountSize, '| phase=', a.phase, '| status=', a.status, '| tradePnlSum=', Math.round(pnl * 100) / 100, '| start=', dv.startingBalance, '| targets=', JSON.stringify(dv.phaseTargets), '| phaseIndex=', dv.phaseIndex)
}
await p.$disconnect()
