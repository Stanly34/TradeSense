import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { validate } from '../utils/validate.js'
import { createFavoriteInstrumentSchema } from '../validators/trade.js'
import * as favoriteInstrumentController from '../controllers/favoriteInstrument.js'

const router = Router()

router.use(authenticate)

router.get('/', favoriteInstrumentController.listFavoriteInstruments)
router.post('/', validate(createFavoriteInstrumentSchema), favoriteInstrumentController.createFavoriteInstrument)
router.delete('/:id', favoriteInstrumentController.deleteFavoriteInstrument)

export default router
