import { Router } from 'express'
import * as adminController from '../controllers/admin.js'
import { authenticate, authorize } from '../middlewares/auth.js'

const router = Router()
router.use(authenticate)

const adminManager = authorize('ADMIN', 'MANAGER')
const adminOnly = authorize('ADMIN')

router.get('/stats', adminManager, adminController.getStats)
router.get('/users', adminManager, adminController.listUsers)
router.patch('/users/:id', adminManager, adminController.updateUser)
router.patch('/users/:id/plan', adminOnly, adminController.changeUserPlan)
router.delete('/users/:id', adminManager, adminController.deleteUser)
router.get('/plans', adminManager, adminController.listPlans)
router.post('/plans', adminOnly, adminController.createPlan)
router.patch('/plans/:id', adminOnly, adminController.updatePlan)
router.delete('/plans/:id', adminOnly, adminController.deletePlan)
router.get('/subscriptions', adminOnly, adminController.listSubscriptions)
router.post('/subscriptions', adminOnly, adminController.createSubscription)
router.patch('/subscriptions/:id', adminOnly, adminController.updateSubscription)
router.get('/settings', adminOnly, adminController.listSettings)
router.patch('/settings', adminOnly, adminController.updateSetting)
router.get('/trades', adminManager, adminController.listAllTrades)
router.get('/journals', adminManager, adminController.listAllJournals)
router.get('/coupons', adminOnly, adminController.listCoupons)
router.post('/coupons', adminOnly, adminController.createCoupon)
router.patch('/coupons/:id', adminOnly, adminController.updateCoupon)
router.delete('/coupons/:id', adminOnly, adminController.deleteCoupon)
router.get('/audit-logs', adminManager, adminController.getAuditLogs)

export default router
