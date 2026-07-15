import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Wiping user data (preserving users, subscriptions, plans) ===')

  console.log('Deleting AIReview...')
  await prisma.aIReview.deleteMany()
  console.log('Deleting AIChat...')
  await prisma.aIChat.deleteMany()
  console.log('Deleting AIMessage...')
  await prisma.aIMessage.deleteMany()
  console.log('Deleting JournalEntry...')
  await prisma.journalEntry.deleteMany()
  console.log('Deleting TradeTag...')
  await prisma.tradeTag.deleteMany()
  console.log('Deleting TradeTimeline...')
  await prisma.tradeTimeline.deleteMany()
  console.log('Deleting TradeImage...')
  await prisma.tradeImage.deleteMany()
  console.log('Deleting PartialExit...')
  await prisma.partialExit.deleteMany()
  console.log('Deleting Trade...')
  await prisma.trade.deleteMany()
  console.log('Deleting Tag...')
  await prisma.tag.deleteMany()
  console.log('Deleting FavoriteInstrument...')
  await prisma.favoriteInstrument.deleteMany()
  console.log('Deleting AuditLog...')
  await prisma.auditLog.deleteMany()
  console.log('Deleting Session...')
  await prisma.session.deleteMany()
  console.log('Deleting RefreshToken...')
  await prisma.refreshToken.deleteMany()
  console.log('Deleting NotificationPreference...')
  await prisma.notificationPreference.deleteMany()
  console.log('Deleting Notification...')
  await prisma.notification.deleteMany()
  console.log('Deleting WeeklyOutlook...')
  await prisma.weeklyOutlook.deleteMany()
  console.log('Deleting CouponUsage...')
  await prisma.couponUsage.deleteMany()
  console.log('Deleting Payment...')
  await prisma.payment.deleteMany()
  console.log('Deleting Template...')
  await prisma.template.deleteMany()

  // Clear uploads folder
  const uploadsDir = path.join(process.cwd(), 'uploads')
  if (fs.existsSync(uploadsDir)) {
    console.log('Clearing uploads folder...')
    const files = fs.readdirSync(uploadsDir)
    for (const file of files) {
      const fp = path.join(uploadsDir, file)
      try { fs.unlinkSync(fp) } catch {}
    }
  }

  const remainingUsers = await prisma.user.count()
  const remainingSubs = await prisma.subscription.count()
  const remainingTrades = await prisma.trade.count()
  const remainingTemplates = await prisma.template.count()
  console.log(`\nPreserved: ${remainingUsers} users, ${remainingSubs} subscriptions`)
  console.log(`Remaining: ${remainingTrades} trades, ${remainingTemplates} templates`)
  console.log('=== Wipe complete ===')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
