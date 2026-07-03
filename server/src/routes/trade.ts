import { Router } from 'express'
import * as tradeController from '../controllers/trade.js'
import { authenticate } from '../middlewares/auth.js'
import { validate } from '../utils/validate.js'
import { createTradeSchema, updateTradeSchema } from '../validators/trade.js'

const router = Router()

router.use(authenticate)

router.get('/', tradeController.listTrades)
router.post('/', validate(createTradeSchema), tradeController.createTrade)
router.get('/:id', tradeController.getTrade)
router.patch('/:id', validate(updateTradeSchema), tradeController.updateTrade)
router.delete('/:id', tradeController.deleteTrade)
router.post('/batch-delete', tradeController.batchDelete)
router.post('/:id/tags', tradeController.addTags)
router.delete('/:id/tags/:tagId', tradeController.removeTag)

export default router
