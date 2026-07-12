import { prisma } from '../lib/prisma.js'

export async function listPlatforms() {
  return prisma.platform.findMany({ orderBy: { name: 'asc' } })
}

export async function listActivePlatforms() {
  return prisma.platform.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
}

export async function createPlatform(data: { name: string; marketType: string }) {
  const existing = await prisma.platform.findUnique({ where: { name_marketType: { name: data.name, marketType: data.marketType } } })
  if (existing) throw new Error('Platform "' + data.name + '" already exists for ' + data.marketType)

  return prisma.platform.create({ data: { name: data.name, marketType: data.marketType } })
}

export async function updatePlatform(id: string, data: { name?: string; marketType?: string; isActive?: boolean }) {
  const platform = await prisma.platform.findUnique({ where: { id } })
  if (!platform) throw new Error('Platform not found')

  const newName = data.name ?? platform.name
  const newMarketType = data.marketType ?? platform.marketType
  if (newName !== platform.name || newMarketType !== platform.marketType) {
    const existing = await prisma.platform.findUnique({ where: { name_marketType: { name: newName, marketType: newMarketType } } })
    if (existing) throw new Error('Platform "' + newName + '" already exists for ' + newMarketType)
  }

  return prisma.platform.update({ where: { id }, data })
}

export async function deletePlatform(id: string) {
  const platform = await prisma.platform.findUnique({ where: { id } })
  if (!platform) throw new Error('Platform not found')

  return prisma.platform.delete({ where: { id } })
}
