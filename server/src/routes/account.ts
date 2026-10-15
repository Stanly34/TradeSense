import { Router } from 'express'
import * as accountController from '../controllers/account.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()
router.use(authenticate)

router.get('/', accountController.listAccounts)
router.post('/', accountController.createAccount)
router.post('/batch-delete', accountController.batchDelete)
router.get('/progress/statuses', accountController.getAllProgressStatuses)
router.get('/:id', accountController.getAccount)
router.patch('/:id', accountController.updateAccount)
router.delete('/:id', accountController.deleteAccount)
router.patch('/:id/favorite', accountController.toggleFavorite)
router.get('/:id/progress', accountController.getChallengeProgress)
router.patch('/:id/status', accountController.overrideStatus)
router.post('/:id/reset', accountController.resetAccount)
router.post('/:id/payouts', accountController.addPayout)
router.delete('/:id/payouts/:idx', accountController.removePayout)

export default router