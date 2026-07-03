import { prisma } from '../lib/prisma.js'

export async function createNotification(userId: string, title: string, message?: string, type = 'INFO') {
  return prisma.notification.create({
    data: { userId, title, message, type },
  })
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  })
}

export async function markAsRead(notificationId: string, userId: string) {
  const notif = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })
  if (!notif) throw new Error('Notification not found')
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
}

export async function deleteNotification(notificationId: string, userId: string) {
  const notif = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  })
  if (!notif) throw new Error('Notification not found')
  await prisma.notification.delete({ where: { id: notificationId } })
}
