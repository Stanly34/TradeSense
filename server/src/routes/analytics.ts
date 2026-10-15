import { Router } from 'express'
import * as analyticsController from '../controllers/analytics.js'
import { authenticate } from '../middlewares/auth.js'

const router = Router()
router.use(authenticate)

router.get('/month-summary', analyticsController.getMonthSummary)
router.get('/timeline', analyticsController.getTimeline)
router.get('/distributions', analyticsController.getDistributions)
router.get('/timing', analyticsController.getTiming)
router.get('/behavior', analyticsController.getBehavior)
router.get('/trends', analyticsController.getTrends)

export default router