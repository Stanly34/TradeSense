import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const accounts = await prisma.account.findMany({
    where: { type: 'PROP_FIRM' },
  })

  let updated = 0
  for (const account of accounts) {
    const dv = (account.defaultValues || {}) as Record<string, unknown>
    let changed = false

    if (!Array.isArray(dv.phaseTargets)) {
      const targetProfit = Number(dv.targetProfit) || 0
      dv.phaseTargets = targetProfit > 0 ? [targetProfit] : []
      changed = true
    }
    if (dv.planSteps === undefined) {
      dv.planSteps = Array.isArray(dv.phaseTargets) && dv.phaseTargets.length > 0 ? dv.phaseTargets.length : 1
      changed = true
    }
    if (!Array.isArray(dv.payouts)) {
      dv.payouts = []
      changed = true
    }

    const manualStatus = dv.manualStatus as string | undefined
    const desiredPhase = manualStatus === 'PASSED' || manualStatus === 'FUNDED' ? 'FUNDED' : 'PHASE1'
    if (account.phase !== desiredPhase) changed = true

    if (changed) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          defaultValues: dv as never,
          phase: desiredPhase,
        },
      })
      updated++
    }
  }

  console.log(`Backfilled ${updated} prop firm accounts`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
