import { prisma } from '../lib/prisma.js'

export async function listFavoriteInstruments(userId: string) {
  return prisma.favoriteInstrument.findMany({
    where: { userId },
    orderBy: { instrument: 'asc' },
  })
}

export async function createFavoriteInstrument(userId: string, instrument: string) {
  return prisma.favoriteInstrument.create({
    data: { userId, instrument },
  })
}

export async function deleteFavoriteInstrument(userId: string, id: string) {
  const existing = await prisma.favoriteInstrument.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    throw new Error('Not found')
  }
  await prisma.favoriteInstrument.delete({ where: { id } })
}
