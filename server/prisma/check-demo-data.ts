import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'demo@tradesense.app' } })
  if (!user) { console.log('User not found'); return }
  console.log('User:', user.id, user.email)

  const counts = {
    trades: await prisma.trade.count({ where: { userId: user.id } }),
    accounts: await prisma.account.count({ where: { userId: user.id } }),
    outlooks: await prisma.weeklyOutlook.count({ where: { userId: user.id } }),
    journals: await prisma.journalEntry.count({ where: { userId: user.id } }),
    tags: await prisma.tag.count({ where: { userId: user.id } }),
    favorites: await prisma.favoriteInstrument.count({ where: { userId: user.id } }),
    aiChats: await prisma.aIChat.count({ where: { userId: user.id } }),
    notifications: await prisma.notification.count({ where: { userId: user.id } }),
    partialExits: await prisma.partialExit.count({ where: { trade: { userId: user.id } } }),
    tradeTimelines: await prisma.tradeTimeline.count({ where: { trade: { userId: user.id } } }),
    tradeTags: await prisma.tradeTag.count({ where: { trade: { userId: user.id } } }),
    tradeImages: await prisma.tradeImage.count({ where: { trade: { userId: user.id } } }),
    accountEvents: await prisma.accountEvent.count({ where: { account: { userId: user.id } } }),
    accountSnapshots: await prisma.accountDaySnapshot.count({ where: { account: { userId: user.id } } }),
  }
  console.log('Data:', JSON.stringify(counts, null, 2))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
