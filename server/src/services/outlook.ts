import { prisma } from '../lib/prisma.js'

export async function listOutlooks(userId: string) {
  return prisma.weeklyOutlook.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getByWeek(userId: string, weekStart: Date, instrument: string) {
  return prisma.weeklyOutlook.findUnique({
    where: { userId_weekStart_instrument: { userId, weekStart, instrument } },
  })
}

export async function upsert(
  userId: string,
  weekStart: Date,
  instrument: string,
  data: { direction?: string | null; beforeImage?: string | null; afterImage?: string | null; notes?: string | null }
) {
  return prisma.weeklyOutlook.upsert({
    where: { userId_weekStart_instrument: { userId, weekStart, instrument } },
    create: { userId, weekStart, instrument, ...data },
    update: data,
  })
}

export async function batchDeleteOutlooks(userId: string, ids: string[]) {
  const entries = await prisma.weeklyOutlook.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true },
  })
  if (entries.length !== ids.length) throw new Error('Some outlooks not found')
  await prisma.weeklyOutlook.deleteMany({
    where: { id: { in: ids }, userId },
  })
}
