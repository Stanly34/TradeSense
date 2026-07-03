import { prisma } from '../lib/prisma.js'

export async function createOrUpdateJournal(tradeId: string, userId: string, content: string) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId, isDeleted: false },
  })
  if (!trade) throw new Error('Trade not found')

  return prisma.journalEntry.upsert({
    where: { tradeId },
    update: { content, userId },
    create: { tradeId, userId, content },
  })
}

export async function getJournalForTrade(tradeId: string, userId: string) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId, isDeleted: false },
  })
  if (!trade) throw new Error('Trade not found')

  return prisma.journalEntry.findUnique({
    where: { tradeId },
  })
}

export async function listJournals(userId: string) {
  return prisma.journalEntry.findMany({
    where: { userId },
    include: {
      trade: {
        select: { instrument: true, direction: true, result: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function deleteJournal(tradeId: string, userId: string) {
  const journal = await prisma.journalEntry.findFirst({
    where: { tradeId, userId },
  })
  if (!journal) throw new Error('Journal entry not found')
  await prisma.journalEntry.delete({ where: { tradeId } })
}
