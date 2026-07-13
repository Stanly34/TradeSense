import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'tradesenseapp@gmail.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Martinvimala@34'
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin'

async function seedPlans() {
  await prisma.plan.upsert({
    where: { name: 'BASIC' },
    update: {
      price: 0,
      accountLimit: 2,
      imageLimit: 1,
      checklistLimit: 1,
      monthlyTradeLimit: 10,
      dailyTradeLimit: 2,
      weeklyOutlook: false,
      aiEnabled: false,
      journalLimit: null,
      isActive: true,
    },
    create: {
      name: 'BASIC',
      price: 0,
      accountLimit: 2,
      imageLimit: 1,
      checklistLimit: 1,
      monthlyTradeLimit: 10,
      dailyTradeLimit: 2,
      weeklyOutlook: false,
      aiEnabled: false,
      isActive: true,
    },
  })

  await prisma.plan.upsert({
    where: { name: 'PRO' },
    update: {
      price: 1700,
      accountLimit: null,
      imageLimit: null,
      checklistLimit: null,
      monthlyTradeLimit: null,
      dailyTradeLimit: null,
      weeklyOutlook: true,
      aiEnabled: true,
      journalLimit: null,
      isActive: true,
    },
    create: {
      name: 'PRO',
      price: 1700,
      accountLimit: null,
      imageLimit: null,
      checklistLimit: null,
      monthlyTradeLimit: null,
      dailyTradeLimit: null,
      weeklyOutlook: true,
      aiEnabled: true,
      isActive: true,
    },
  })

  console.log('Plans seeded')
}

async function seedPlatforms() {
  const forexPlatforms = [
    'FTMO', 'FundedNext', 'The5ers', 'FundingPips',
    'Alpha Capital Group', 'Blue Guardian', 'E8 Markets',
    'Funded Trading Plus', 'Goat Funded Trader',
  ]

  const futuresPlatforms = [
    'Topstep', 'Apex Trader Funding', 'My Funded Futures (MFFU)',
    'Tradeify', 'Goat Funded Futures', 'Lucid Trading',
  ]

  for (const name of forexPlatforms) {
    await prisma.platform.upsert({
      where: { name_marketType: { name, marketType: 'FOREX' } },
      update: { isActive: true },
      create: { name, marketType: 'FOREX', isActive: true },
    })
  }

  for (const name of futuresPlatforms) {
    await prisma.platform.upsert({
      where: { name_marketType: { name, marketType: 'FUTURES' } },
      update: { isActive: true },
      create: { name, marketType: 'FUTURES', isActive: true },
    })
  }

  console.log(`Seeded ${forexPlatforms.length + futuresPlatforms.length} platforms`)
}

async function seedAdmin() {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })
  if (existing) {
    console.log('Admin user already exists, skipping')
    return
  }

  const proPlan = await prisma.plan.findUnique({ where: { name: 'PRO' } })
  if (!proPlan) {
    console.error('PRO plan not found — run seedPlans first')
    return
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)

  const user = await prisma.user.create({
    data: {
      fullName: ADMIN_NAME,
      username: 'admin',
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true,
      isActive: true,
    },
  })

  const sub = await prisma.subscription.create({
    data: {
      userId: user.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      autoRenew: false,
    },
  })

  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionId: sub.id },
  })

  console.log(`Admin user created: ${ADMIN_EMAIL}`)
}

async function main() {
  await seedPlans()
  await seedPlatforms()
  await seedAdmin()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
