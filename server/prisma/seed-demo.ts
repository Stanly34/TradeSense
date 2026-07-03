import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const email = 'anton@tradesense.demo'

  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    const hashedPassword = await bcrypt.hash('Password123!', 12)
    user = await prisma.user.create({
      data: { fullName: 'Anton', username: 'anton', email, password: hashedPassword, isVerified: true, role: 'USER' },
    })
    console.log(`Created user: ${email}`)
  } else {
    console.log(`Found user: ${email}`)
  }

  // Ensure PRO plan
  const proPlan = await prisma.plan.findUnique({ where: { name: 'PRO' } })
  if (proPlan) {
    const existingSub = await prisma.subscription.findUnique({ where: { userId: user.id } })
    if (!existingSub) {
      const sub = await prisma.subscription.create({
        data: { userId: user.id, planId: proPlan.id, status: 'ACTIVE', endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      })
      await prisma.user.update({ where: { id: user.id }, data: { subscriptionId: sub.id } })
      console.log('Assigned PRO plan')
    }
  }

  // ── Tags ──
  const tagDefs = [
    { name: 'Missed SL', color: '#ef4444', content: 'yes' },
    { name: 'Perfection', color: '#a855f7', content: 'yes' },
    { name: 'Over Trading', color: '#f97316', content: 'yes' },
    { name: 'Early Entry', color: '#eab308', content: 'yes' },
    { name: 'Revenge Trade', color: '#dc2626', content: 'yes' },
    { name: 'Bias Mistake', color: '#f97316', content: 'yes' },
  ]
  const tagMap: Record<string, string> = {}
  for (const t of tagDefs) {
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId: user.id, name: t.name } },
      update: {},
      create: { userId: user.id, name: t.name, color: t.color, content: t.content },
    })
    tagMap[t.name] = tag.id
  }
  console.log(`Created ${tagDefs.length} tags`)

  // ── Templates (Accounts) ──
  const templateDefs = [
    {
      name: 'FTMO 10K',
      type: 'PROP_FIRM' as const,
      description: 'FTMO 10K Challenge',
      defaultValues: { account: 'FTMO 10K' },
    },
    {
      name: 'FTMO 25K',
      type: 'PROP_FIRM' as const,
      description: 'FTMO 25K Challenge',
      defaultValues: { account: 'FTMO 25K' },
    },
    {
      name: 'Topstep 50K',
      type: 'PROP_FIRM' as const,
      description: 'Topstep 50K Combine',
      defaultValues: { account: 'Topstep 50K' },
    },
    {
      name: 'Personal Account',
      type: 'PERSONAL_ACCOUNT' as const,
      description: 'My personal trading account',
      defaultValues: { account: 'Personal', broker: 'Interactive Brokers' },
    },
  ]
  const templateMap: Record<string, string> = {}
  for (const t of templateDefs) {
    const existing = await prisma.template.findFirst({ where: { userId: user.id, name: t.name } })
    if (existing) {
      templateMap[t.name] = existing.id
    } else {
      const tmpl = await prisma.template.create({
        data: { userId: user.id, name: t.name, type: t.type, description: t.description, defaultValues: t.defaultValues },
      })
      templateMap[t.name] = tmpl.id
    }
  }
  console.log(`Created ${templateDefs.length} templates`)

  // ── Favorite Instruments ──
  const favs = ['MNQ', 'ES', 'NQ', 'CL']
  for (const inst of favs) {
    await prisma.favoriteInstrument.upsert({
      where: { userId_instrument: { userId: user.id, instrument: inst } },
      update: {},
      create: { userId: user.id, instrument: inst },
    })
  }
  console.log(`Created ${favs.length} favorite instruments`)

  // ── Trades ──
  const tradeData = [
    {
      instrument: 'MNQM2026', direction: 'LONG' as const, entryPrice: 30721.25, exitPrice: 30666.50,
      stopLoss: 30666.50, takeProfit: 30832.50, quantity: 1, fees: 3.50,
      result: 'LOSS' as const, session: 'LONDON' as const, marketBias: 'BULLISH' as const,
      date: new Date('2026-06-03T09:39:00'), exitDate: new Date('2026-06-03T09:44:00'),
      reason: 'Overall bias was bullish. 4H London low plan, 1H bullish, 1M entry confirmation at London low.',
      notes: 'Clean execution, market just didn\'t follow through after initial move up.',
      mistakes: 'Entered before IFVG confirmed - early entry.',
      tags: ['Early Entry'], template: 'FTMO 10K',
    },
    {
      instrument: 'MNQM2026', direction: 'LONG' as const, entryPrice: 30232.50, exitPrice: 30361.50,
      stopLoss: 30168.25, takeProfit: 30361.50, quantity: 1, fees: 3.50,
      result: 'WIN' as const, session: 'NEW_YORK' as const, marketBias: 'BULLISH' as const,
      date: new Date('2026-06-04T10:11:00'), exitDate: new Date('2026-06-04T11:00:00'),
      reason: 'Bullish bias after price took current week low. 4H bullish, 1H bullish after previous 4H low taken. 1M sellside liquidity sweep confirmation.',
      notes: 'Clean execution with full TF alignment straight to TP.',
      tags: [], template: 'FTMO 10K',
    },
    {
      instrument: 'MNQM2026', direction: 'SHORT' as const, entryPrice: 29866.50, exitPrice: 29722.25,
      stopLoss: 29938.25, takeProfit: 29722.25, quantity: 1, fees: 3.50,
      result: 'WIN' as const, session: 'NEW_YORK' as const, marketBias: 'BEARISH' as const,
      date: new Date('2026-06-05T10:23:00'), exitDate: new Date('2026-06-05T11:21:00'),
      reason: 'Bearish bias targeting previous week low. 4H bearish, 1H bearish, 10 o\'clock PO3 setup. 1M entry confirmation.',
      notes: 'Clean execution with full TF alignment straight to TP.',
      tags: [], template: 'Topstep 50K',
    },
    {
      instrument: 'MNQM2026', direction: 'SHORT' as const, entryPrice: 29718.75, exitPrice: 29513.75,
      stopLoss: 29818.75, takeProfit: 29513.75, quantity: 1, fees: 3.50,
      result: 'WIN' as const, session: 'LONDON' as const, marketBias: 'BEARISH' as const,
      date: new Date('2026-06-09T09:56:00'), exitDate: new Date('2026-06-09T10:13:00'),
      reason: 'Bearish bias. 4H bearish, 1H expecting reversal. Price took buyside liquidity and moved lower - confirmed entry.',
      notes: 'Clean execution with full TF alignment straight to TP.',
      tags: [], template: 'Topstep 50K',
    },
    {
      instrument: 'MNQM2026', direction: 'SHORT' as const, entryPrice: 28908.75, exitPrice: 29014.75,
      stopLoss: 29014.75, takeProfit: 28695.00, quantity: 2, fees: 7.00,
      result: 'LOSS' as const, session: 'LONDON' as const, marketBias: 'BEARISH' as const,
      date: new Date('2026-06-10T09:58:00'), exitDate: new Date('2026-06-10T10:01:00'),
      reason: 'Bearish bias looking for London high sweep. 4H bearish, 1H bearish. 1M entry confirmation.',
      notes: 'Early entry - should have waited for IFVG to form as entry model. Entered before IFVG confirmed.',
      mistakes: 'Early entry - entered before IFVG confirmation.',
      partialExits: [{ quantity: 1, exitPrice: 28950.00 }],
      tags: ['Early Entry'], template: 'FTMO 25K',
    },
    {
      instrument: 'MNQM2026', direction: 'SHORT' as const, entryPrice: 28892.25, exitPrice: 28892.25,
      stopLoss: 29048.75, takeProfit: 28577.50, quantity: 1, fees: 3.50,
      result: 'BREAK_EVEN' as const, session: 'NEW_YORK' as const, marketBias: 'BULLISH' as const,
      date: new Date('2026-06-10T10:11:00'), exitDate: new Date('2026-06-10T10:35:00'),
      reason: 'Same bearish plan - London high sweep. 4H and 1H bearish. 1M valid entry confirmation.',
      notes: 'Bias mistake - overall bias was bullish but took bearish trade. Closed at BE due to conservative management against HTF bias.',
      mistakes: 'Bias mistake - went against HTF bias.',
      tags: ['Bias Mistake'], template: 'FTMO 25K',
    },
    {
      instrument: 'ESM2026', direction: 'LONG' as const, entryPrice: 5495.00, exitPrice: 5510.50,
      stopLoss: 5482.50, takeProfit: 5510.50, quantity: 1, fees: 5.00,
      result: 'WIN' as const, session: 'NEW_YORK' as const, marketBias: 'BULLISH' as const,
      date: new Date('2026-06-12T09:30:00'), exitDate: new Date('2026-06-12T10:15:00'),
      reason: 'Bullish bias on ES after overnight consolidation. 4H bullish, 1H bullish PO3. 1M entry confirmation at 9:30 high.',
      notes: 'First ES trade - good risk management.',
      tags: [], template: 'Personal Account',
    },
    {
      instrument: 'MNQM2026', direction: 'SHORT' as const, entryPrice: 30441.50, exitPrice: 30441.50,
      stopLoss: 30510.00, takeProfit: 30304.25, quantity: 2, fees: 7.00,
      result: 'BREAK_EVEN' as const, session: 'LONDON' as const, marketBias: 'BEARISH' as const,
      date: new Date('2026-06-17T09:51:00'), exitDate: new Date('2026-06-17T10:23:00'),
      reason: 'Bearish bias. 4H bearish, 1H bearish until Monday low. 1M price took 9:30 high - entry confirmation.',
      notes: 'Partial close at 30400 to reduce risk. Remaining position managed to BE.',
      mistakes: 'Should have moved SL to BE sooner on partial.',
      partialExits: [{ quantity: 1, exitPrice: 30400.00 }, { quantity: 1, exitPrice: 30441.50 }],
      tags: [], template: 'FTMO 10K',
    },
    {
      instrument: 'MNQM2026', direction: 'LONG' as const, entryPrice: 30312.00, exitPrice: 30312.00,
      stopLoss: 30180.50, takeProfit: 30576.50, quantity: 1, fees: 3.50,
      result: 'BREAK_EVEN' as const, session: 'NEW_YORK' as const, marketBias: 'BULLISH' as const,
      date: new Date('2026-06-17T14:32:00'), exitDate: new Date('2026-06-17T14:57:00'),
      reason: 'Bullish bias after Monday low taken. 4H bullish, 1H bullish. 1M entry confirmation.',
      notes: 'Clean process, trade just didn\'t play out in either direction.',
      tags: [], template: 'Topstep 50K',
    },
    {
      instrument: 'NQM2026', direction: 'SHORT' as const, entryPrice: 19850.00, exitPrice: 19680.00,
      stopLoss: 19920.00, takeProfit: 19680.00, quantity: 1, fees: 4.50,
      result: 'WIN' as const, session: 'NEW_YORK' as const, marketBias: 'BEARISH' as const,
      date: new Date('2026-06-18T09:45:00'), exitDate: new Date('2026-06-18T10:30:00'),
      reason: 'NQ bearish bias after overnight session high. 4H bearish, 1H bearish. 1M entry.',
      notes: 'Good trade on the regular NQ contract.',
      tags: [], template: 'Personal Account',
    },
    {
      instrument: 'CLQ2026', direction: 'LONG' as const, entryPrice: 73.20, exitPrice: 74.15,
      stopLoss: 72.50, takeProfit: 74.15, quantity: 10, fees: 8.00,
      result: 'WIN' as const, session: 'LONDON' as const, marketBias: 'BULLISH' as const,
      date: new Date('2026-06-22T09:00:00'), exitDate: new Date('2026-06-22T10:45:00'),
      reason: 'Crude oil bullish on supply data. 1H bullish after support held at 72.80.',
      notes: 'Scalped 10 micro contracts for a quick 0.95 move. Good news play.',
      tags: [], template: 'FTMO 25K',
    },
    {
      instrument: 'MNQM2026', direction: 'SHORT' as const, entryPrice: 29909.00, exitPrice: 29720.75,
      stopLoss: 30002.50, takeProfit: 29720.75, quantity: 2, fees: 7.00,
      result: 'WIN' as const, session: 'NEW_YORK' as const, marketBias: 'BULLISH' as const,
      date: new Date('2026-06-23T10:33:00'), exitDate: new Date('2026-06-23T11:25:00'),
      reason: 'Overall bias was bullish but hadn\'t reversed yet. 4H bearish, 1H bearish. 1M plan confirmation for short.',
      notes: 'Partial close half at 29800, ran the rest to full TP.',
      partialExits: [{ quantity: 1, exitPrice: 29800.00 }],
      tags: [], template: 'FTMO 10K',
    },
    {
      instrument: 'MNQM2026', direction: 'LONG' as const, entryPrice: 29723.00, exitPrice: 29564.00,
      stopLoss: 29564.00, takeProfit: 30046.50, quantity: 1, fees: 3.50,
      result: 'LOSS' as const, session: 'LONDON' as const, marketBias: 'BULLISH' as const,
      date: new Date('2026-06-24T09:51:00'), exitDate: new Date('2026-06-24T10:10:00'),
      reason: 'Bullish bias after previous day low taken. 4H bullish, 1H bullish. 1M entry confirmation.',
      notes: 'Sellside liquidity level wasn\'t on radar - price swept SSL before reversing higher, triggering SL.',
      mistakes: 'Missed key SSL level - needs better level identification.',
      tags: ['Missed SL'], template: 'Topstep 50K',
    },
    {
      instrument: 'MNQM2026', direction: 'LONG' as const, entryPrice: 29769.00, exitPrice: 29704.00,
      stopLoss: 29704.00, takeProfit: 29903.00, quantity: 1, fees: 3.50,
      result: 'LOSS' as const, session: 'NEW_YORK' as const, marketBias: 'BULLISH' as const,
      date: new Date('2026-06-24T11:28:00'), exitDate: new Date('2026-06-24T11:47:00'),
      reason: 'Bullish bias. 4H bullish, 1H bullish PO3 setup. 1M entry confirmation.',
      notes: 'Same issue as trade 1 - sellside liquidity level not identified. Price continued lower before reversing.',
      mistakes: 'Revenge trading after first loss - should have stepped away.',
      tags: ['Revenge Trade', 'Missed SL'], template: 'Topstep 50K',
    },
    {
      instrument: 'ESM2026', direction: 'SHORT' as const, entryPrice: 5530.00, exitPrice: 5515.00,
      stopLoss: 5545.00, takeProfit: 5515.00, quantity: 1, fees: 5.00,
      result: 'WIN' as const, session: 'NEW_YORK' as const, marketBias: 'BEARISH' as const,
      date: new Date('2026-06-26T14:00:00'), exitDate: new Date('2026-06-26T14:30:00'),
      reason: 'ES rejection at resistance. 4H bearish candle, 1M short setup with clean entry.',
      notes: 'End of week trade, kept it simple. Good way to end the week.',
      tags: [], template: 'Personal Account',
    },
  ]

  let createdCount = 0
  for (const t of tradeData) {
    const existing = await prisma.trade.findFirst({
      where: { userId: user.id, entryTime: t.date, instrument: t.instrument },
    })
    if (existing) {
      console.log(`  Skipping duplicate: ${t.date.toLocaleDateString()} ${t.instrument}`)
      continue
    }

    const templateId = t.template ? templateMap[t.template] : undefined

    const trade = await prisma.trade.create({
      data: {
        userId: user.id,
        instrument: t.instrument,
        direction: t.direction,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        stopLoss: t.stopLoss,
        takeProfit: t.takeProfit,
        quantity: t.quantity,
        fees: t.fees,
        status: 'COMPLETED',
        result: t.result,
        session: t.session,
        marketBias: t.marketBias,
        entryTime: t.date,
        exitTime: t.exitDate,
        createdAt: t.date,
        reason: t.reason,
        notes: t.notes,
        mistakes: t.mistakes,
        templateId,
      },
    })

    // Partial exits
    if (t.partialExits) {
      for (const pe of t.partialExits) {
        await prisma.partialExit.create({
          data: {
            tradeId: trade.id,
            quantity: pe.quantity,
            exitPrice: pe.exitPrice,
            exitTime: t.exitDate,
          },
        })
      }
    }

    // Timeline entries
    await prisma.tradeTimeline.createMany({
      data: [
        { tradeId: trade.id, eventType: 'ENTRY', title: 'Entry', description: `Entry at $${t.entryPrice}`, eventTime: t.date },
        { tradeId: trade.id, eventType: 'EXIT', title: 'Exit', description: `Exit at $${t.exitPrice}`, eventTime: t.exitDate },
      ],
    })

    // Journal entry
    await prisma.journalEntry.create({
      data: {
        tradeId: trade.id,
        userId: user.id,
        content: `## ${t.result === 'WIN' ? '✅' : t.result === 'LOSS' ? '❌' : '⚪'} ${t.result} - ${t.instrument}\n\n**Direction:** ${t.direction}\n**Entry:** $${t.entryPrice} → **Exit:** $${t.exitPrice}\n**Session:** ${t.session}\n\n### Reason\n${t.reason}\n\n### Notes\n${t.notes}${t.mistakes ? `\n\n### Mistakes\n${t.mistakes}` : ''}`,
      },
    })

    // Tag assignments
    if (t.tags) {
      for (const tagName of t.tags) {
        const tagId = tagMap[tagName]
        if (tagId) {
          await prisma.tradeTag.create({
            data: { tradeId: trade.id, tagId },
          })
        }
      }
    }

    createdCount++
    console.log(`  [${createdCount}] ${t.date.toLocaleDateString()} ${t.instrument} ${t.direction} → ${t.result}${t.partialExits ? ' (partials)' : ''}`)
  }

  // ── Weekly Outlook ──
  const monday = new Date('2026-06-29')
  const outlooks = [
    { instrument: 'MNQ', weekStart: monday, notes: 'Bullish bias heading into new month. Key level at 29500. Watching for London opens for intraday entries.', beforeImage: null },
    { instrument: 'ES', weekStart: monday, notes: 'ES in consolidation between 5480-5530. Expecting breakout this week. FOMC minutes mid-week.', beforeImage: null },
    { instrument: 'CL', weekStart: monday, notes: 'Crude remains volatile. Supply data Wednesday. Range 72-75.', beforeImage: null },
  ]
  for (const o of outlooks) {
    await prisma.weeklyOutlook.upsert({
      where: { userId_weekStart_instrument: { userId: user.id, weekStart: o.weekStart, instrument: o.instrument } },
      update: {},
      create: { userId: user.id, weekStart: o.weekStart, instrument: o.instrument, notes: o.notes },
    })
  }
  console.log(`Created ${outlooks.length} weekly outlooks`)

  console.log(`\nDone! Created ${createdCount} new trades for ${email}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
