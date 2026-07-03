import { Router } from 'express'
import * as dashboardController from '../controllers/dashboard.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()
router.use(authenticate)

router.get('/stats', dashboardController.getStats)
router.get('/monthly-performance', dashboardController.getMonthlyPerformance)
router.get('/result-distribution', dashboardController.getResultDistribution)
router.get('/recent-trades', dashboardController.getRecentTrades)
router.get('/calendar', dashboardController.getCalendarData)
router.get('/instrument-performance', dashboardController.getInstrumentPerformance)

export default router
