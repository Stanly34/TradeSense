import { Router } from 'express'
import * as templateController from '../controllers/template.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()
router.use(authenticate)

router.get('/', templateController.listTemplates)
router.post('/', templateController.createTemplate)
router.post('/batch-delete', templateController.batchDelete)
router.get('/progress/statuses', templateController.getAllProgressStatuses)
router.get('/:id', templateController.getTemplate)
router.patch('/:id', templateController.updateTemplate)
router.delete('/:id', templateController.deleteTemplate)
router.patch('/:id/favorite', templateController.toggleFavorite)
router.get('/:id/progress', templateController.getChallengeProgress)
router.patch('/:id/status', templateController.overrideStatus)

export default router
