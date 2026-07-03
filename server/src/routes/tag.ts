import { Router } from 'express'
import * as tagController from '../controllers/tag.js'
import { authenticate } from '../middlewares/auth.js'
import { validate } from '../utils/validate.js'
import { createTagSchema, updateTagSchema } from '../validators/trade.js'

const router = Router()

router.use(authenticate)

router.get('/', tagController.listTags)
router.post('/', validate(createTagSchema), tagController.createTag)
router.patch('/:id', validate(updateTagSchema), tagController.updateTag)
router.delete('/:id', tagController.deleteTag)
router.post('/batch-delete', tagController.batchDeleteTags)

export default router
