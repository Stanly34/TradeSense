import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'demo@tradesense.app' } })
  if (!user) { console.log('User not found'); return }
  console.log('Cleaning data for:', user.email)

  const d = (label: string) => console.log(`  Deleted ${label}`)

  await prisma.aIMessage.deleteMany({ where: { chat: { userId: user.id } } })
  d('AIMessages')

  await prisma.aIChat.deleteMany({ where: { userId: user.id } })
  d('AIChats')

  await prisma.aIReview.deleteMany({ where: { trade: { userId: user.id } } })
  d('AIReviews')

  await prisma.journalEntry.deleteMany({ where: { userId: user.id } })
  d('JournalEntries')

  await prisma.tradeTag.deleteMany({ where: { trade: { userId: user.id } } })
  d('TradeTags')

  await prisma.tradeTimeline.deleteMany({ where: { trade: { userId: user.id } } })
  d('TradeTimelines')

  await prisma.tradeImage.deleteMany({ where: { trade: { userId: user.id } } })
  d('TradeImages')

  await prisma.partialExit.deleteMany({ where: { trade: { userId: user.id } } })
  d('PartialExits')

  await prisma.trade.deleteMany({ where: { userId: user.id } })
  d('Trades')

  await prisma.tag.deleteMany({ where: { userId: user.id } })
  d('Tags')

  await prisma.favoriteInstrument.deleteMany({ where: { userId: user.id } })
  d('FavoriteInstruments')

  await prisma.accountDaySnapshot.deleteMany({ where: { account: { userId: user.id } } })
  d('AccountSnapshots')

  await prisma.accountEvent.deleteMany({ where: { account: { userId: user.id } } })
  d('AccountEvents')

  await prisma.account.deleteMany({ where: { userId: user.id } })
  d('Accounts')

  await prisma.weeklyOutlook.deleteMany({ where: { userId: user.id } })
  d('WeeklyOutlooks')

  await prisma.notification.deleteMany({ where: { userId: user.id } })
  d('Notifications')

  await prisma.notificationPreference.deleteMany({ where: { userId: user.id } })
  d('NotificationPreferences')

  console.log('\nDone — all demo data deleted. User account preserved.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
