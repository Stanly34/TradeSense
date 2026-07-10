import { prisma } from '../lib/prisma.js'

export async function logAction(
  userId: string,
  action: string,
  targetType: string,
  targetId?: string | null,
  metadata?: Record<string, unknown> | null
) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      targetType,
      targetId: targetId ?? undefined,
      metadata: metadata as never,
    },
  })
}

export async function listAuditLogs(page = 1, limit = 50, filters?: { action?: string; userId?: string }) {
  const skip = (page - 1) * limit
  const where: Record<string, unknown> = {}
  if (filters?.action) where.action = filters.action
  if (filters?.userId) where.userId = filters.userId

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) }
}
