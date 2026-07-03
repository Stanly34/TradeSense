import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

const transporter = nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  secure: env.email.port === 465,
  auth: {
    user: env.email.user,
    pass: env.email.pass,
  },
})

export async function sendEmail(to: string, subject: string, html: string) {
  if (env.nodeEnv === 'development') {
    console.log(`[DEV EMAIL] To: ${to}, Subject: ${subject}`)
    return
  }

  await transporter.sendMail({
    from: env.email.from,
    to,
    subject,
    html,
  })
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
  return sendEmail(
    to,
    'Reset your TradeSense password',
    `<p>Click <a href="${url}">here</a> to reset your password.</p><p>Token: ${token}</p>`
  )
}
