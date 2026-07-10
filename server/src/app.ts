import express from 'express'
import path from 'path'
import fs from 'fs'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { handleWebhook } from './controllers/stripe.js'

const app = express()

app.post('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }), handleWebhook)

app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', limiter)

import { maintenanceCheck } from './middlewares/maintenance.js'
app.use('/api', maintenanceCheck)

import authRoutes from './routes/auth.js'
import tradeRoutes from './routes/trade.js'
import tagRoutes from './routes/tag.js'

import uploadRoutes from './routes/upload.js'
import aiRoutes from './routes/ai.js'
import dashboardRoutes from './routes/dashboard.js'
import templateRoutes from './routes/template.js'
import journalRoutes from './routes/journal.js'
import notificationRoutes from './routes/notification.js'
import adminRoutes from './routes/admin.js'
import favoriteInstrumentRoutes from './routes/favoriteInstrument.js'
import subscriptionRoutes from './routes/subscription.js'
import outlookRoutes from './routes/outlook.js'

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/trades', tradeRoutes)
app.use('/api/v1/tags', tagRoutes)

app.use('/api/v1/upload', uploadRoutes)
app.use('/api/v1/ai', aiRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/templates', templateRoutes)
app.use('/api/v1/favorite-instruments', favoriteInstrumentRoutes)
app.use('/api/v1/journals', journalRoutes)
app.use('/api/v1/notifications', notificationRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/subscriptions', subscriptionRoutes)
app.use('/api/v1/outlook', outlookRoutes)

const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
app.use('/uploads', express.static(uploadsDir))

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'TradeSense API is running',
    data: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  })
})

export default app
