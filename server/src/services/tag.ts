import { prisma } from '../lib/prisma.js'
import { getUserPlan } from './subscription.js'

export async function createTag(userId: string, data: { name: string; color?: string }) {
  const existing = await prisma.tag.findUnique({
    where: { userId_name: { userId, name: data.name } },
  })
  if (existing) throw new Error('Tag already exists')

  return prisma.tag.create({
    data: { userId, ...data },
    include: { _count: { select: { trades: true } } },
  })
}

export async function listTags(userId: string) {
  return prisma.tag.findMany({
    where: { userId },
    include: { _count: { select: { trades: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function updateTag(userId: string, tagId: string, data: { name?: string; color?: string; content?: string }) {
  const tag = await prisma.tag.findFirst({ where: { id: tagId, userId } })
  if (!tag) throw new Error('Tag not found')

  if (data.name) {
    const existing = await prisma.tag.findFirst({
      where: { userId, name: data.name, id: { not: tagId } },
    })
    if (existing) throw new Error('Tag name already taken')
  }

  if ('content' in data && data.content && JSON.parse(data.content).length > 0) {
    const plan = await getUserPlan(userId)
    if (plan.plan.checklistLimit !== null) {
      const existingCount = await prisma.tag.count({
        where: {
          userId,
          content: { not: null },
          NOT: { content: '' },
          id: { not: tagId },
        },
      })
      if (existingCount >= plan.plan.checklistLimit) {
        throw new Error(`Free plan allows ${plan.plan.checklistLimit} checklist. Upgrade to Pro for unlimited.`)
      }
    }
  }

  return prisma.tag.update({
    where: { id: tagId },
    data,
    include: { _count: { select: { trades: true } } },
  })
}

export async function deleteTag(userId: string, tagId: string) {
  const tag = await prisma.tag.findFirst({ where: { id: tagId, userId } })
  if (!tag) throw new Error('Tag not found')

  await prisma.tag.delete({ where: { id: tagId } })
}

export async function batchDeleteTags(userId: string, ids: string[]) {
  const tags = await prisma.tag.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true },
  })
  if (tags.length !== ids.length) throw new Error('Some tags not found')
  await prisma.tag.deleteMany({
    where: { id: { in: ids }, userId },
  })
}
