import { Router } from 'express'
import * as journalController from '../controllers/journal.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()
router.use(authenticate)

router.get('/', journalController.listJournals)
router.put('/:tradeId', journalController.upsertJournal)
router.get('/:tradeId', journalController.getJournal)
router.delete('/:tradeId', journalController.deleteJournal)

export default router
