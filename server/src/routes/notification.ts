import { Router } from 'express'
import * as notificationController from '../controllers/notification.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()
router.use(authenticate)

router.get('/', notificationController.listNotifications)
router.get('/unread-count', notificationController.getUnreadCount)
router.patch('/:id/read', notificationController.markAsRead)
router.patch('/read-all', notificationController.markAllAsRead)
router.delete('/:id', notificationController.deleteNotification)

export default router
