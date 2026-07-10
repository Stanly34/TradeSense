import app from './app.js'
import { checkExpiredSubscriptions } from './services/subscription.js'
import { startCronJobs } from './services/cron.js'

const PORT = process.env.PORT || 5000

startCronJobs()

app.listen(PORT, () => {
  console.log(`TradeSense server running on port ${PORT}`)
})

setInterval(async () => {
  try {
    const count = await checkExpiredSubscriptions()
    if (count && count > 0) {
      console.log(`[Cron] Downgraded ${count} expired PRO subscription(s)`)
    }
  } catch (err) {
    console.error('[Cron] Subscription expiry check failed:', err)
  }
}, 60 * 60 * 1000)
