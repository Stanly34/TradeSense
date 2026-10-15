import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'demo@tradesense.app' } })
  if (!user) { console.log('User not found'); return }

  const trades = await prisma.trade.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      instrument: true,
      entryTime: true,
      exitTime: true,
      createdAt: true,
      result: true,
      entryPrice: true,
      exitPrice: true,
      accountId: true,
    },
  })

  console.log('Last 10 trades:')
  for (const t of trades) {
    const e = t.entryTime ? new Date(t.entryTime) : null
    const utcDate = e ? e.toISOString().slice(0, 10) : 'null'
    const localDate = e ? `${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,'0')}-${String(e.getDate()).padStart(2,'0')}` : 'null'
    const c = new Date(t.createdAt)
    console.log(`  ${t.instrument} | ${t.result} | entry=${t.entryTime} | UTC_date=${utcDate} | local_date=${localDate} | created=${c.toLocaleDateString()} | price=${t.entryPrice}->${t.exitPrice}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
