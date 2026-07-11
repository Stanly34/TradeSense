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

export async function listPlans(req: Request, res: Response) {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    })
    return sendSuccess(res, plans)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to list plans', 500)
  }
}

export async function selectPlan(req: Request, res: Response) {
  try {
    const { planName } = req.body
    if (!planName) return sendError(res, 'Plan name is required', 400)
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
    const { planName } = req.body
    if (!planName) return sendError(res, 'planName is required', 400)

    const plan = await prisma.plan.findFirst({ where: { name: planName, isActive: true } })
    if (!plan) return sendError(res, 'Plan not found', 404)
    if (plan.price <= 0) return sendError(res, 'Free plans cannot be checked out', 400)

    if (!env.stripe.secretKey) {
      return sendSuccess(res, {
        testMode: true,
        url: null,
        message: 'Stripe not configured.',
      })
    }

    const priceId = plan.stripePriceId || env.stripe.priceId
    if (!priceId) return sendError(res, 'No Stripe price ID configured for this plan', 400)

    const stripe = await import('stripe')
    const client = new stripe.default(env.stripe.secretKey)

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) return sendError(res, 'User not found', 404)

    const session = await client.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { planName },
      success_url: `${env.clientUrl}/plans?upgrade=success`,
      cancel_url: `${env.clientUrl}/plans?upgrade=cancelled`,
    })

    return sendSuccess(res, { testMode: false, url: session.url })
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Checkout creation failed', 500)
  }
}

export async function listPayments(req: Request, res: Response) {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: { include: { plan: { select: { name: true } } } },
      },
    })
    return sendSuccess(res, payments)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to list payments', 500)
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
