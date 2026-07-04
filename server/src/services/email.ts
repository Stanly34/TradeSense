import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

async function createTransport() {
  if (env.email.host && env.email.user) {
    return nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.port === 465,
      auth: { user: env.email.user, pass: env.email.pass },
    })
  }
  const testAccount = await nodemailer.createTestAccount()
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  })
}

export async function sendEmail(to: string, subject: string, html: string) {
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

export function sendVerificationEmail(to: string, token: string) {
  const url = `${env.clientUrl}/verify-email?token=${token}`
  return sendEmail(
    to,
    'Verify your TradeSense account',
    `<p>Click <a href="${url}">here</a> to verify your email.</p><p>Token: ${token}</p>`
  )
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
