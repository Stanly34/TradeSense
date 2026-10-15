import { PrismaClient } from '@prisma/client'
import { reconcileAccount } from '../src/services/accountEngine.js'

const prisma = new PrismaClient()

async function main() {
  const accounts = await prisma.account.findMany({ where: { type: 'PROP_FIRM' }, select: { id: true, userId: true, name: true } })
  console.log(`Reconciling ${accounts.length} prop firm accounts...`)
  for (const a of accounts) {
    try {
      const outcome = await reconcileAccount(a.userId, a.id)
      console.log(`  ${a.name}: ${outcome?.status} | ${outcome?.phase} | balance $${outcome?.balance.toLocaleString()} | trades ${outcome?.tradesCount}`)
    } catch (err) {
      console.error(`  ${a.name}: FAILED — ${err instanceof Error ? err.message : err}`)
    }
  }
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())