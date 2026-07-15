import nodemailer from 'nodemailer'
import sgMail from '@sendgrid/mail'
import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'

async function createTransport() {
  if (env.email.host && env.email.user) {
    console.log(`[EMAIL] Creating SMTP transport: host=${env.email.host} port=${env.email.port}`)
    return nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.port === 465,
      auth: { user: env.email.user, pass: env.email.pass },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
    })
  }
  const testAccount = await nodemailer.createTestAccount()
  console.log('[EMAIL] No SMTP configured, using Ethereal test account')
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  })
}

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    if (env.email.sendgridApiKey) {
      sgMail.setApiKey(env.email.sendgridApiKey)
      const from = env.email.from?.match(/<(.+)>/)?.[1] || env.email.from || 'tradesenseapp@gmail.com'
      await sgMail.send({ to, from, subject, html })
    } else {
      const transport = await createTransport()
      const info = await transport.sendMail({
        from: env.email.from || 'TradeSense <noreply@tradesense.app>',
        to,
        subject,
        html,
      })
      const previewUrl = nodemailer.getTestMessageUrl(info)
      if (previewUrl) {
        console.log(`[EMAIL PREVIEW] ${previewUrl}`)
      }
    }
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send "${subject}" to ${to}:`, err instanceof Error ? (err as any).response?.body?.errors?.[0]?.message || err.message : err)
  }
}

export function sendVerificationEmail(to: string, token: string) {
  const url = `${env.clientUrl}/verify-email?token=${token}`
  return sendEmail(
    to,
    'Verify your TradeSense account',
    `<p>Click <a href="${url}">here</a> to verify your email.</p><p>Token: ${token}</p>`
  )
}

export function sendOtpEmail(to: string, otp: string) {
  return sendEmail(to, 'Your TradeSense verification code', `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <tr><td style="padding:32px 32px 0;text-align:center">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#1a1a2e">TradeSense</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#71717a">Verification Code</p>
        </td></tr>
        <tr><td style="padding:24px 32px;text-align:center">
          <p style="margin:0 0 16px;font-size:15px;color:#3f3f46">Use the code below to verify your email address.</p>
          <div style="background:#f4f4f5;border-radius:8px;padding:16px;font-size:32px;font-weight:700;letter-spacing:8px;color:#1a1a2e;font-family:monospace">${otp}</div>
          <p style="margin:16px 0 0;font-size:13px;color:#71717a">This code expires in 10 minutes.</p>
        </td></tr>
        <tr><td style="padding:0 32px 24px;text-align:center;border-top:1px solid #e4e4e7">
          <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa">TradeSense &mdash; Track smarter, trade better.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`)
}

export function sendPasswordResetEmail(to: string, token: string) {
  const url = `${env.clientUrl}/reset-password?token=${token}`
  return sendEmail(to, 'Reset your TradeSense password', `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <tr><td style="padding:32px 32px 0 32px;text-align:center">
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#1a1a2e">TradeSense</h1>
          <p style="margin:8px 0 0 0;font-size:14px;color:#71717a">Password Reset Request</p>
        </td></tr>
        <tr><td style="padding:24px 32px">
          <p style="margin:0 0 16px 0;font-size:15px;color:#3f3f46;line-height:1.5">We received a request to reset your TradeSense password. Click the button below to set a new password.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 16px auto">
            <tr><td style="background:#2563eb;border-radius:8px;padding:0">
              <a href="${url}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">Reset Password</a>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border-radius:8px;padding:16px">
            <tr><td style="font-size:13px;color:#71717a;line-height:1.4">
              <strong style="color:#3f3f46;display:block;margin-bottom:4px">Link expires in 5 minutes</strong>
              This link can only be used once. If you didn't request a password reset, you can safely ignore this email.
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 24px 32px;text-align:center;border-top:1px solid #e4e4e7">
          <p style="margin:16px 0 0 0;font-size:12px;color:#a1a1aa">TradeSense &mdash; Track smarter, trade better.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`)
}

export async function sendTradeSummary(
  userId: string,
  trade: { id: string; instrument: string; direction: string; entryPrice: number | null; exitPrice: number | null; quantity: number | null; result: string | null; tags?: { tag: { name: string } }[] }
) {
  const [user, prefs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } }),
    prisma.notificationPreference.findUnique({ where: { userId } }),
  ])
  if (!user?.email) return
  if (!prefs?.emailNotifications) return

  const direction = trade.direction === 'LONG' ? 'Long' : 'Short'
  const entry = trade.entryPrice ? `$${trade.entryPrice}` : '—'
  const exit = trade.exitPrice ? `$${trade.exitPrice}` : '—'
  const qty = trade.quantity ?? '—'
  const pnl = trade.result === 'WIN' ? 'Profit' : trade.result === 'LOSS' ? 'Loss' : 'Pending'
  const tags = trade.tags?.map((t) => t.tag.name).join(', ') || '—'

  await sendEmail(
    user.email,
    `Trade Logged: ${trade.instrument} ${direction}`,
    `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:#7c3aed;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:20px">Trade Logged</h1>
    </div>
    <div style="padding:24px">
      <p style="color:#374151;margin:0 0 16px">Hi ${user.fullName || 'there'},</p>
      <p style="color:#6b7280;margin:0 0 20px">A new trade has been logged in your journal.</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px">Instrument</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right">${trade.instrument}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #f3f4f6">Direction</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #f3f4f6">${direction}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #f3f4f6">Entry</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #f3f4f6">${entry}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #f3f4f6">Exit</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #f3f4f6">${exit}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #f3f4f6">Quantity</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #f3f4f6">${qty}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #f3f4f6">Result</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #f3f4f6">${pnl}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;border-top:1px solid #f3f4f6">Tags</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #f3f4f6">${tags}</td></tr>
      </table>
      <div style="margin-top:24px;text-align:center">
        <a href="${env.clientUrl}/trades/${trade.id}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">View Trade Details</a>
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
