import { Router } from 'express'
import * as adminController from '../controllers/admin.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const router = Router()
router.use(authenticate)
router.use(authorize('ADMIN'))

router.get('/stats', adminController.getStats)
router.get('/users', adminController.listUsers)
router.patch('/users/:id', adminController.updateUser)
router.delete('/users/:id', adminController.deleteUser)
router.get('/plans', adminController.listPlans)
router.post('/plans', adminController.createPlan)
router.patch('/plans/:id', adminController.updatePlan)
router.delete('/plans/:id', adminController.deletePlan)
router.get('/subscriptions', adminController.listSubscriptions)

export default router
