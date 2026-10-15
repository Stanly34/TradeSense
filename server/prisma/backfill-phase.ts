import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PHASE_NAMES = ['PHASE1', 'PHASE2', 'PHASE3', 'FUNDED']

function calcPnl(t: {
  entryPrice: number | null; exitPrice: number | null; direction: string;
  quantity: number | null; pipSize: number | null; pipValue: number | null; fees: number | null
}): number {
  if (!t.entryPrice || !t.exitPrice) return 0
  const rawDiff = t.direction === 'LONG' ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice
  const diff = t.pipSize && t.pipSize !== 0 ? rawDiff / t.pipSize : rawDiff
  return diff * (t.pipValue || 1) * (t.quantity || 1) - (t.fees || 0)
}

function round2(n: number) { return Math.round(n * 100) / 100 }

async function main() {
  const accounts = await prisma.account.findMany({
    where: { type: 'PROP_FIRM' },
    select: { id: true, name: true, defaultValues: true, createdAt: true },
  })

  console.log(`Found ${accounts.length} prop firm accounts`)

  let totalUpdated = 0

  for (const acct of accounts) {
    const dv = (acct.defaultValues || {}) as Record<string, unknown>
    const accountSize = Number(dv.accountSize) || Number(dv.startingBalance) || 0
    const planSteps = Math.max(1, Number(dv.planSteps) || 1)
    const phaseTargets = (dv.phaseTargets as number[]) || []
    const startPhaseIndex = Number(dv.startPhaseIndex ?? dv.phaseIndex) || 0

    if (accountSize <= 0) {
      console.log(`  Skipping ${acct.name}: no accountSize`)
      continue
    }

    const trades = await prisma.trade.findMany({
      where: { accountId: acct.id, isDeleted: false, status: 'COMPLETED' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, entryPrice: true, exitPrice: true, direction: true,
        fees: true, quantity: true, pipSize: true, pipValue: true, createdAt: true,
      },
    })

    if (trades.length === 0) {
      console.log(`  Skipping ${acct.name}: no trades`)
      continue
    }

    let phaseIndex = startPhaseIndex
    let balance = accountSize
    const fundIdx = planSteps
    const updates: Array<{ id: string; phase: string }> = []

    for (const t of trades) {
      const pnl = calcPnl(t)
      balance = round2(balance + pnl)

      const target = phaseTargets[phaseIndex] ?? 0
      if (target > 0 && balance >= accountSize + target && phaseIndex < fundIdx) {
        phaseIndex++
        balance = accountSize
      }

      const phase = PHASE_NAMES[Math.min(phaseIndex, PHASE_NAMES.length - 1)]
      updates.push({ id: t.id, phase })
    }

    for (const u of updates) {
      await prisma.trade.update({ where: { id: u.id }, data: { phase: u.phase } })
    }

    totalUpdated += updates.length
    console.log(`  ${acct.name}: ${updates.length} trades tagged`)
  }

  console.log(`\nTotal: ${totalUpdated} trades updated with phase`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
