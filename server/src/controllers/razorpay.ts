import { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import * as razorpayService from '../services/razorpay.js'

export async function handleRazorpayWebhook(req: Request, res: Response) {
  const webhookSignature = req.headers['x-razorpay-signature'] as string

  if (!webhookSignature) {
    return res.status(400).json({ message: 'Missing webhook signature' })
  }

  const isValid = await razorpayService.verifyWebhookSignature(
    JSON.stringify(req.body),
    webhookSignature
  )

  if (!isValid) {
    return res.status(400).json({ message: 'Invalid webhook signature' })
  }

  const event = req.body.event
  const payload = req.body.payload

  switch (event) {
    case 'subscription.activated': {
      const sub = payload.subscription.entity
      const userId = sub.notes?.userId as string | undefined
      if (userId) {
        await prisma.subscription.update({
          where: { userId },
          data: {
            status: 'ACTIVE',
            razorpaySubscriptionId: sub.id,
            autoRenew: true,
            startDate: new Date(sub.current_start * 1000),
            endDate: new Date(sub.current_end * 1000),
          },
        })
      }
      break
    }
    case 'subscription.completed': {
      const sub = payload.subscription.entity
      const userId = sub.notes?.userId as string | undefined
      if (userId) {
        await prisma.subscription.update({
          where: { userId },
          data: { status: 'EXPIRED', autoRenew: false },
        })
      }
      break
    }
    case 'subscription.cancelled': {
      const sub = payload.subscription.entity
      const userId = sub.notes?.userId as string | undefined
      if (userId) {
        await prisma.subscription.update({
          where: { userId },
          data: { autoRenew: false },
        })
      }
      break
    }
    case 'subscription.paused': {
      const sub = payload.subscription.entity
      const userId = sub.notes?.userId as string | undefined
      if (userId) {
        await prisma.subscription.update({
          where: { userId },
          data: { autoRenew: false },
        })
      }
      break
    }
    case 'subscription.resumed': {
      const sub = payload.subscription.entity
      const userId = sub.notes?.userId as string | undefined
      if (userId) {
        await prisma.subscription.update({
          where: { userId },
          data: { autoRenew: true },
        })
      }
      break
    }
    case 'payment.captured': {
      const payment = payload.payment.entity
      const subId = payment.subscription_id
      if (subId) {
        const rzpSub = await razorpayService.getSubscription(subId)
        const userId = rzpSub.notes?.userId as string | undefined
        if (userId) {
          const existing = await prisma.subscription.findUnique({ where: { userId } })
          if (existing) {
            await prisma.payment.create({
              data: {
                userId,
                subscriptionId: existing.id,
                amount: payment.amount / 100,
                status: 'COMPLETED',
                razorpayPaymentId: payment.id,
                razorpayOrderId: payment.order_id,
              },
            })
          }
        }
      }
      break
    }
  }

  res.json({ received: true })
}

export async function getKeyId(_req: Request, res: Response) {
  res.json({ keyId: process.env.RAZORPAY_KEY_ID || '' })
}
