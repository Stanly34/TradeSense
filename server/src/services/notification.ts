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

export async function getPreferences(userId: string) {
  let prefs = await prisma.notificationPreference.findUnique({ where: { userId } })
  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId },
    })
  }
  return prefs
}

export async function updatePreferences(
  userId: string,
  data: { emailNotifications?: boolean; weeklyReports?: boolean; tradeReminders?: boolean }
) {
  const prefs = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  })
  return prefs
}
