import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const basic = await prisma.plan.upsert({
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

  const pro = await prisma.plan.upsert({
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

  console.log('Plans seeded:', basic.name, pro.name)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
