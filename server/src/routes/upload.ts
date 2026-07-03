import { Router } from 'express'
import * as uploadController from '../controllers/upload.js'
import { authenticate } from '../middlewares/auth.js'
import { upload } from '../middlewares/upload.js'

const router = Router()

router.use(authenticate)

router.post('/image', upload.single('image'), uploadController.uploadTradeImage)
router.delete('/image/:id', uploadController.deleteTradeImage)

export default router
