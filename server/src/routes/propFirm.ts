import { Router } from 'express'
import * as propFirmController from '../controllers/propFirm.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()

router.get('/', propFirmController.listPropFirms)
router.post('/', authenticate, propFirmController.createCustomPropFirm)
router.get('/:slug', propFirmController.getPropFirm)

export default router
