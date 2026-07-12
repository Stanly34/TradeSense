import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const FOREX_PLATFORMS = [
  'FTMO',
  'FundedNext',
  'The5ers',
  'FundingPips',
  'Alpha Capital Group',
  'Blue Guardian',
  'E8 Markets',
  'Funded Trading Plus',
  'Goat Funded Trader',
]

const FUTURES_PLATFORMS = [
  'Topstep',
  'Apex Trader Funding',
  'My Funded Futures (MFFU)',
  'Tradeify',
  'Goat Funded Futures',
  'Lucid Trading',
]

async function main() {
  for (const name of FOREX_PLATFORMS) {
    await prisma.platform.upsert({
      where: { name_marketType: { name, marketType: 'FOREX' } },
      update: { isActive: true },
      create: { name, marketType: 'FOREX', isActive: true },
    })
  }

  for (const name of FUTURES_PLATFORMS) {
    await prisma.platform.upsert({
      where: { name_marketType: { name, marketType: 'FUTURES' } },
      update: { isActive: true },
      create: { name, marketType: 'FUTURES', isActive: true },
    })
  }

  console.log(`Seeded ${FOREX_PLATFORMS.length + FUTURES_PLATFORMS.length} platforms`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
