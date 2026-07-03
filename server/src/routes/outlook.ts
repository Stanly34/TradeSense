import { Router } from 'express'
import * as outlookController from '../controllers/outlook.js'
import { authenticate } from '../middlewares/auth.js'
import { upload } from '../middlewares/upload.js'

const router = Router()

router.use(authenticate)

router.get('/list', outlookController.listOutlooks)
router.get('/', outlookController.getOutlook)
router.post('/', upload.fields([
  { name: 'beforeImage', maxCount: 1 },
  { name: 'afterImage', maxCount: 1 },
]), outlookController.saveOutlook)
router.delete('/:id', outlookController.deleteOutlook)
router.post('/batch-delete', outlookController.batchDeleteOutlooks)

export default router
