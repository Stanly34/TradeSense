import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function computeDayKey(entryTime: Date | null): string | null {
  if (!entryTime) return null
  const y = entryTime.getFullYear()
  const m = String(entryTime.getMonth() + 1).padStart(2, '0')
  const d = String(entryTime.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function main() {
  const trades = await prisma.trade.findMany({
    where: { dayKey: null, isDeleted: false },
    select: { id: true, entryTime: true },
  })

  console.log(`Found ${trades.length} trades without dayKey`)

  let updated = 0
  for (const t of trades) {
    const dk = computeDayKey(t.entryTime)
    if (dk) {
      await prisma.trade.update({
        where: { id: t.id },
        data: { dayKey: dk },
      })
      updated++
    }
  }

  console.log(`Updated ${updated} trades with dayKey`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
