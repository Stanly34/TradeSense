import { Router } from 'express'
import * as aiController from '../controllers/ai.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()

router.use(authenticate)

router.post('/reviews/:tradeId', aiController.generateReview)
router.get('/reviews/:tradeId', aiController.getReview)

router.get('/chats', aiController.listChats)
router.post('/chats', aiController.createChat)
router.get('/chats/:id', aiController.getChat)
router.post('/chats/:id/messages', aiController.sendMessage)
router.delete('/chats/:id', aiController.deleteChat)
router.patch('/chats/:id/pin', aiController.togglePinChat)
router.patch('/chats/:id/archive', aiController.archiveChat)

export default router
