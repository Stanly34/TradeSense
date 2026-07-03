import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import * as subscriptionController from '../controllers/subscription.js'

const router = Router()

router.get('/plan', authenticate, subscriptionController.getPlan)
router.post('/select-plan', authenticate, subscriptionController.selectPlan)
router.post('/upgrade', authenticate, subscriptionController.upgradeToPro)
router.post('/create-checkout', authenticate, subscriptionController.createCheckout)
router.post('/cancel', authenticate, subscriptionController.cancelAutoRenew)
router.post('/reactivate', authenticate, subscriptionController.reactivateAutoRenew)

export default router
