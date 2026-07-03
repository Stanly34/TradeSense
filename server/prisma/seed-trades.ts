import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const userEmail = process.argv[2] || 'anton@example.com'

  let user = await prisma.user.findUnique({ where: { email: userEmail } })

  if (!user) {
    const hashedPassword = await bcrypt.hash('Password123!', 12)
    user = await prisma.user.create({
      data: {
        fullName: 'Anton',
        username: 'anton',
        email: userEmail,
        password: hashedPassword,
        isVerified: true,
        role: 'USER',
      },
    })
    console.log(`Created user: ${user.email} (ID: ${user.id})`)
  } else {
    console.log(`Found user: ${user.email} (ID: ${user.id})`)
  }

  const trades = [
    {
      date: new Date('2026-06-03T09:39:00'),
      exitDate: new Date('2026-06-03T09:44:00'),
      instrument: 'MNQM2026',
      direction: 'LONG' as const,
      entryPrice: 30721.25,
      exitPrice: 30666.50,
      stopLoss: 30666.50,
      takeProfit: 30832.50,
      quantity: 1,
      result: 'LOSS' as const,
      reason: 'Overall bias was bullish. 4H London low plan, 1H bullish, 1M entry confirmation at London low.',
      notes: 'Clean execution, market just didn\'t follow through after initial move up.',
    },
    {
      date: new Date('2026-06-04T10:11:00'),
      exitDate: new Date('2026-06-04T11:00:00'),
      instrument: 'MNQM2026',
      direction: 'LONG' as const,
      entryPrice: 30232.50,
      exitPrice: 30361.50,
      stopLoss: 30168.25,
      takeProfit: 30361.50,
      quantity: 1,
      result: 'WIN' as const,
      reason: 'Bullish bias after price took current week low. 4H bullish, 1H bullish after previous 4H low taken. 1M sellside liquidity sweep confirmation.',
      notes: 'Clean execution with full TF alignment straight to TP.',
    },
    {
      date: new Date('2026-06-05T10:23:00'),
      exitDate: new Date('2026-06-05T11:21:00'),
      instrument: 'MNQM2026',
      direction: 'SHORT' as const,
      entryPrice: 29866.50,
      exitPrice: 29722.25,
      stopLoss: 29938.25,
      takeProfit: 29722.25,
      quantity: 1,
      result: 'WIN' as const,
      reason: 'Bearish bias targeting previous week low. 4H bearish, 1H bearish, 10 o\'clock PO3 setup. 1M entry confirmation.',
      notes: 'Clean execution with full TF alignment straight to TP.',
    },
    {
      date: new Date('2026-06-09T09:56:00'),
      exitDate: new Date('2026-06-09T10:13:00'),
      instrument: 'MNQM2026',
      direction: 'SHORT' as const,
      entryPrice: 29718.75,
      exitPrice: 29513.75,
      stopLoss: 29818.75,
      takeProfit: 29513.75,
      quantity: 1,
      result: 'WIN' as const,
      reason: 'Bearish bias. 4H bearish, 1H expecting reversal. Price took buyside liquidity and moved lower - confirmed entry.',
      notes: 'Clean execution with full TF alignment straight to TP.',
    },
    {
      date: new Date('2026-06-10T09:58:00'),
      exitDate: new Date('2026-06-10T10:01:00'),
      instrument: 'MNQM2026',
      direction: 'SHORT' as const,
      entryPrice: 28908.75,
      exitPrice: 29014.75,
      stopLoss: 29014.75,
      takeProfit: 28695.00,
      quantity: 1,
      result: 'LOSS' as const,
      reason: 'Bearish bias looking for London high sweep. 4H bearish, 1H bearish. 1M entry confirmation.',
      notes: 'Early entry - should have waited for IFVG to form as entry model. Entered before IFVG confirmed.',
    },
    {
      date: new Date('2026-06-10T10:11:00'),
      exitDate: new Date('2026-06-10T10:35:00'),
      instrument: 'MNQM2026',
      direction: 'SHORT' as const,
      entryPrice: 28892.25,
      exitPrice: 28892.25,
      stopLoss: 29048.75,
      takeProfit: 28577.50,
      quantity: 1,
      result: 'BREAK_EVEN' as const,
      reason: 'Same bearish plan - London high sweep. 4H and 1H bearish. 1M valid entry confirmation.',
      notes: 'Bias mistake - overall bias was bullish but took bearish trade. Closed at BE due to conservative management against HTF bias.',
    },
    {
      date: new Date('2026-06-17T09:51:00'),
      exitDate: new Date('2026-06-17T10:23:00'),
      instrument: 'MNQM2026',
      direction: 'SHORT' as const,
      entryPrice: 30441.50,
      exitPrice: 30510.00,
      stopLoss: 30510.00,
      takeProfit: 30304.25,
      quantity: 1,
      result: 'LOSS' as const,
      reason: 'Bearish bias. 4H bearish, 1H bearish until Monday low. 1M price took 9:30 high - entry confirmation.',
      notes: 'Trade management mistake - price moved close to TP but SL wasn\'t moved to BE because market wasn\'t being watched.',
    },
    {
      date: new Date('2026-06-17T14:32:00'),
      exitDate: new Date('2026-06-17T14:57:00'),
      instrument: 'MNQM2026',
      direction: 'LONG' as const,
      entryPrice: 30312.00,
      exitPrice: 30312.00,
      stopLoss: 30180.50,
      takeProfit: 30576.50,
      quantity: 1,
      result: 'BREAK_EVEN' as const,
      reason: 'Bullish bias after Monday low taken. 4H bullish, 1H bullish. 1M entry confirmation.',
      notes: 'Clean process, trade just didn\'t play out in either direction.',
    },
    {
      date: new Date('2026-06-23T10:33:00'),
      exitDate: new Date('2026-06-23T11:25:00'),
      instrument: 'MNQM2026',
      direction: 'SHORT' as const,
      entryPrice: 29909.00,
      exitPrice: 29720.75,
      stopLoss: 30002.50,
      takeProfit: 29720.75,
      quantity: 1,
      result: 'WIN' as const,
      reason: 'Overall bias was bullish but hadn\'t reversed yet. 4H bearish, 1H bearish. 1M plan confirmation for short.',
      notes: 'Clean execution - 4H and 1H alignment confirmed short before overall bias caught up.',
    },
    {
      date: new Date('2026-06-24T09:51:00'),
      exitDate: new Date('2026-06-24T10:10:00'),
      instrument: 'MNQM2026',
      direction: 'LONG' as const,
      entryPrice: 29723.00,
      exitPrice: 29564.00,
      stopLoss: 29564.00,
      takeProfit: 30046.50,
      quantity: 1,
      result: 'LOSS' as const,
      reason: 'Bullish bias after previous day low taken. 4H bullish, 1H bullish. 1M entry confirmation.',
      notes: 'Sellside liquidity level wasn\'t on radar - price swept SSL before reversing higher, triggering SL.',
    },
    {
      date: new Date('2026-06-24T11:28:00'),
      exitDate: new Date('2026-06-24T11:47:00'),
      instrument: 'MNQM2026',
      direction: 'LONG' as const,
      entryPrice: 29769.00,
      exitPrice: 29704.00,
      stopLoss: 29704.00,
      takeProfit: 29903.00,
      quantity: 1,
      result: 'LOSS' as const,
      reason: 'Bullish bias. 4H bullish, 1H bullish PO3 setup. 1M entry confirmation.',
      notes: 'Same issue as trade 1 - sellside liquidity level not identified. Price continued lower before reversing.',
    },
  ]

  let created = 0
  for (const t of trades) {
    await prisma.trade.create({
      data: {
        userId: user.id,
        instrument: t.instrument,
        direction: t.direction,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        stopLoss: t.stopLoss,
        takeProfit: t.takeProfit,
        quantity: t.quantity,
        status: 'COMPLETED',
        result: t.result,
        entryTime: t.date,
        exitTime: t.exitDate,
        createdAt: t.date,
        reason: t.reason,
        notes: t.notes,
      },
    })
    created++
    console.log(`  [${created}/${trades.length}] ${t.date.toLocaleDateString()} ${t.instrument} ${t.direction} -> ${t.result}`)
  }

  console.log(`\nDone! Created ${created} trades for ${user.fullName} (${user.email})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())