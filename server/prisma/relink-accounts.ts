import { PrismaClient } from '@prisma/client'
import { resolvePropFirmSnapshot } from '../src/services/account.js'

const prisma = new PrismaClient()

const RELINKS: Array<{
  name: string
  slug: string
  planName: string
  sizeName: string
}> = [
  { name: 'GOAT 5K', slug: 'goat-funded-trader', planName: '2-Step GOAT', sizeName: '5k' },
  { name: 'Lucid', slug: 'lucid-trading', planName: 'LucidPro', sizeName: '50k' },
  { name: 'Lucid 2', slug: 'lucid-trading', planName: 'LucidPro', sizeName: '50k' },
]

async function main() {
  for (const relink of RELINKS) {
    const accounts = await prisma.account.findMany({
      where: { type: 'PROP_FIRM', name: relink.name },
    })
    if (accounts.length === 0) {
      console.log(`No accounts named "${relink.name}"`)
      continue
    }

    const firm = await prisma.propFirm.findUnique({ where: { slug: relink.slug } })
    if (!firm) throw new Error(`Firm ${relink.slug} not found`)

    for (const account of accounts) {
      const snapshot = await resolvePropFirmSnapshot({
        propFirmId: firm.id,
        planName: relink.planName,
        sizeName: relink.sizeName,
      })
      const dv = (account.defaultValues || {}) as Record<string, unknown>
      const next = { ...snapshot.defaultValues }
      if (dv.manualStatus !== undefined) next.manualStatus = dv.manualStatus
      if (Array.isArray(dv.payouts)) next.payouts = dv.payouts

      await prisma.account.update({
        where: { id: account.id },
        data: {
          propFirmId: firm.id,
          phase: account.phase,
          defaultValues: next as never,
        },
      })
      console.log(`Re-linked "${account.name}" (${account.id}) -> ${firm.name} · ${relink.planName} · ${relink.sizeName}`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())