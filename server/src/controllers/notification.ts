import { Request, Response } from 'express'
import * as notificationService from '../services/notification.js'
import { sendSuccess, sendError } from '../utils/response.js'

export async function listNotifications(req: Request, res: Response) {
  try {
    const notifications = await notificationService.listNotifications(req.user!.userId)
    return sendSuccess(res, notifications)
  } catch {
    return sendError(res, 'Failed to list notifications', 500)
  }
}

export async function getUnreadCount(req: Request, res: Response) {
  try {
    const count = await notificationService.getUnreadCount(req.user!.userId)
    return sendSuccess(res, { count })
  } catch {
    return sendError(res, 'Failed to get unread count', 500)
  }
}

export async function markAsRead(req: Request, res: Response) {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user!.userId)
    return sendSuccess(res, notification, 'Marked as read')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to mark as read', 400)
  }
}

export async function markAllAsRead(req: Request, res: Response) {
  try {
    await notificationService.markAllAsRead(req.user!.userId)
    return sendSuccess(res, null, 'All marked as read')
  } catch {
    return sendError(res, 'Failed to mark all as read', 500)
  }
}

export async function deleteNotification(req: Request, res: Response) {
  try {
    await notificationService.deleteNotification(req.params.id, req.user!.userId)
    return sendSuccess(res, null, 'Notification deleted')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to delete notification', 400)
  }
}
