import { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import * as subscriptionService from '../services/subscription.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { env } from '../config/env.js'

export async function getPlan(req: Request, res: Response) {
  try {
    const plan = await subscriptionService.getUserPlan(req.user!.userId)
    return sendSuccess(res, plan)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to get plan', 500)
  }
}

export async function selectPlan(req: Request, res: Response) {
  try {
    const { planName } = req.body
    if (!planName || !['BASIC', 'PRO'].includes(planName)) {
      return sendError(res, 'Invalid plan name', 400)
    }
    await subscriptionService.selectPlan(req.user!.userId, planName)
    return sendSuccess(res, null, `Subscribed to ${planName} plan`)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to select plan', 500)
  }
}

export async function upgradeToPro(req: Request, res: Response) {
  try {
    await subscriptionService.upgradeToPro(req.user!.userId)
    return sendSuccess(res, null, 'Upgraded to Pro successfully')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Upgrade failed', 500)
  }
}

export async function createCheckout(req: Request, res: Response) {
  try {
    if (!env.stripe.secretKey) {
      return sendSuccess(res, {
        testMode: true,
        url: null,
        message: 'Stripe not configured. Use dev upgrade endpoint.',
      })
    }

    const stripe = await import('stripe')
    const client = new stripe.default(env.stripe.secretKey)

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) return sendError(res, 'User not found', 404)

    const session = await client.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: env.stripe.priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${env.clientUrl}/plans?upgrade=success`,
      cancel_url: `${env.clientUrl}/plans?upgrade=cancelled`,
    })

    return sendSuccess(res, { testMode: false, url: session.url })
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Checkout creation failed', 500)
  }
}

export async function cancelAutoRenew(req: Request, res: Response) {
  try {
    await subscriptionService.cancelAutoRenew(req.user!.userId)
    return sendSuccess(res, null, 'Auto-renew cancelled')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to cancel', 500)
  }
}

export async function reactivateAutoRenew(req: Request, res: Response) {
  try {
    await subscriptionService.reactivateAutoRenew(req.user!.userId)
    return sendSuccess(res, null, 'Auto-renew reactivated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to reactivate', 500)
  }
}
