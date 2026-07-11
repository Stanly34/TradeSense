import cron from 'node-cron'
import { prisma } from '../lib/prisma.js'
import { sendEmail } from './email.js'
import { createNotification } from './notification.js'

const UTC5_OFFSET = -5 * 60 * 60 * 1000
const DAY_MS = 86400000

function todayStartUtc(): Date {
  const now = Date.now()
  const utcMinus5Ms = now + UTC5_OFFSET
  const startDayUtcMinus5Ms = Math.floor(utcMinus5Ms / DAY_MS) * DAY_MS
  return new Date(startDayUtcMinus5Ms - UTC5_OFFSET)
}

function daysAgoStartUtc(days: number): Date {
  return new Date(todayStartUtc().getTime() - days * DAY_MS)
}

async function sendWeeklyReports() {
  const weekStart = daysAgoStartUtc(7)

  const users = await prisma.user.findMany({
    where: {
      notificationPreference: { weeklyReports: true },
    },
    select: { id: true, email: true, fullName: true },
  })

  for (const user of users) {
    if (!user.email) continue

    const trades = await prisma.trade.findMany({
      where: {
        userId: user.id,
        isDeleted: false,
        status: 'COMPLETED',
        entryTime: { gte: weekStart },
      },
    })

    await createNotification(user.id, 'Weekly Trade Report', trades.length === 0 ? 'No trades were logged this week.' : `You logged ${trades.length} trades this week.`)

    if (trades.length === 0) {
      await sendEmail(
        user.email,
        'Your Weekly Trade Report',
        `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:#7c3aed;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:20px">Weekly Report</h1>
    </div>
    <div style="padding:24px;text-align:center">
      <p style="color:#374151;margin:0 0 16px">Hi ${user.fullName || 'there'},</p>
      <p style="color:#6b7280;margin:0 0 4px">No trades were logged this week.</p>
      <p style="color:#6b7280;margin:0">See you next week!</p>
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #f3f4f6">
      <p style="margin:0;font-size:12px;color:#9ca3af">TradeSense &bull; Your trading journal</p>
    </div>
  </div>
</body>
</html>`
      )
      continue
    }

    const wins = trades.filter((t) => t.result === 'WIN').length
    const losses = trades.filter((t) => t.result === 'LOSS').length
    const breakEvens = trades.filter((t) => t.result === 'BREAK_EVEN').length
    const total = trades.length
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'
    const fees = trades.reduce((sum, t) => sum + (t.fees || 0), 0)

    await sendEmail(
      user.email,
      `Your Weekly Trade Report - ${winRate}% Win Rate`,
      `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:#7c3aed;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:20px">Weekly Report</h1>
    </div>
    <div style="padding:24px">
      <p style="color:#374151;margin:0 0 16px">Hi ${user.fullName || 'there'},</p>
      <p style="color:#6b7280;margin:0 0 20px">Here's your performance summary for this week.</p>
      <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:20px">
        <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:12px;text-align:center">
          <p style="margin:0;font-size:24px;font-weight:700;color:#16a34a">${wins}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280">Wins</p>
        </div>
        <div style="flex:1;background:#fef2f2;border-radius:8px;padding:12px;text-align:center">
          <p style="margin:0;font-size:24px;font-weight:700;color:#dc2626">${losses}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280">Losses</p>
        </div>
        <div style="flex:1;background:#f8fafc;border-radius:8px;padding:12px;text-align:center">
          <p style="margin:0;font-size:24px;font-weight:700;color:#6b7280">${breakEvens}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#6b7280">B/E</p>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Total Trades</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right">${total}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #f3f4f6">Win Rate</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #f3f4f6">${winRate}%</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #f3f4f6">Total Fees</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #f3f4f6">$${fees.toFixed(2)}</td></tr>
      </table>
      <div style="margin-top:24px;text-align:center">
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/trades" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">Review Your Trades</a>
      </div>
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #f3f4f6">
      <p style="margin:0;font-size:12px;color:#9ca3af">TradeSense &bull; Your trading journal</p>
    </div>
  </div>
</body>
</html>`
    )
  }
}

async function sendTradeReminders() {
  const todayStart = todayStartUtc()

  const users = await prisma.user.findMany({
    where: {
      notificationPreference: { tradeReminders: true },
    },
    select: { id: true, email: true, fullName: true },
  })

  for (const user of users) {
    if (!user.email) continue

    const tradeCount = await prisma.trade.count({
      where: {
        userId: user.id,
        createdAt: { gte: todayStart },
      },
    })

    if (tradeCount > 0) continue

    await createNotification(user.id, 'Trade Reminder', "Don't forget to log your trades today.")

    await sendEmail(
      user.email,
      'Did you log your trades today?',
      `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:#7c3aed;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:20px">Trade Reminder</h1>
    </div>
    <div style="padding:24px;text-align:center">
      <p style="color:#374151;margin:0 0 16px">Hi ${user.fullName || 'there'},</p>
      <p style="color:#6b7280;margin:0 0 4px">You haven't logged any trades today.</p>
      <p style="color:#6b7280;margin:0 0 20px">Don't forget to keep your journal up to date!</p>
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/trades/new" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">Log a Trade</a>
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #f3f4f6">
      <p style="margin:0;font-size:12px;color:#9ca3af">TradeSense &bull; Your trading journal</p>
    </div>
  </div>
</body>
</html>`
    )
  }
}

export function startCronJobs() {
  cron.schedule('0 18 * * 0', () => {
    sendWeeklyReports().catch((err) => console.error('[cron] Weekly report error:', err))
  }, { timezone: 'Etc/GMT+5' })

  cron.schedule('0 11 * * *', () => {
    sendTradeReminders().catch((err) => console.error('[cron] Trade reminder error:', err))
  }, { timezone: 'Etc/GMT+5' })

  console.log('[cron] Weekly report: Sunday 18:00 UTC-5')
  console.log('[cron] Journal reminder: Daily 11:00 UTC-5')
}
