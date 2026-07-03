import api from './api'

export interface Notification {
  id: string
  title: string
  message: string | null
  type: string
  isRead: boolean
  createdAt: string
}

export async function listNotifications(): Promise<Notification[]> {
  const { data } = await api.get('/notifications')
  return data.data
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get('/notifications/unread-count')
  return data.data.count
}

export async function markAsRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`)
}

export async function markAllAsRead(): Promise<void> {
  await api.patch('/notifications/read-all')
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`)
}
