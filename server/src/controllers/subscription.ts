import { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import * as subscriptionService from '../services/subscription.js'
import * as razorpayService from '../services/razorpay.js'
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
    const [plans, currencySetting] = await Promise.all([
      prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
      }),
      prisma.setting.findUnique({ where: { key: 'default_currency' } }),
    ])
    const defaultCurrency = currencySetting?.value || 'INR'
    const withCurrency = plans.map((p) => ({ ...p, currency: defaultCurrency }))
    return sendSuccess(res, withCurrency)
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

export async function validateCoupon(req: Request, res: Response) {
  try {
    const { couponCode, planName } = req.body
    if (!couponCode || !planName) return sendError(res, 'couponCode and planName are required', 400)

    const plan = await prisma.plan.findFirst({ where: { name: planName, isActive: true } })
    if (!plan) return sendError(res, 'Plan not found', 404)
    if (plan.price <= 0) return sendError(res, 'Free plans cannot be discounted', 400)

    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } })
    if (!coupon || !coupon.isActive) return sendError(res, 'Invalid coupon code', 400)
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return sendError(res, 'Coupon has expired', 400)
    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) return sendError(res, 'Coupon usage limit reached', 400)

    const discountPercent = coupon.discountType === 'PERCENTAGE' ? coupon.discountValue : 0
    const finalAmount = plan.price * (1 - discountPercent / 100)

    return sendSuccess(res, {
      valid: true,
      couponId: coupon.id,
      discountPercent,
      originalAmount: plan.price,
      finalAmount: Math.round(finalAmount * 100) / 100,
    })
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Coupon validation failed', 400)
  }
}

export async function createRazorpayOrder(req: Request, res: Response) {
  try {
    const { planName, couponCode } = req.body
    if (!planName) return sendError(res, 'planName is required', 400)

    const plan = await prisma.plan.findFirst({ where: { name: planName, isActive: true } })
    if (!plan) return sendError(res, 'Plan not found', 404)
    if (plan.price <= 0) return sendError(res, 'Free plans cannot be purchased', 400)

    if (!razorpayService.isConfigured()) {
      return sendError(res, 'Razorpay is not configured', 400)
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) return sendError(res, 'User not found', 404)

    let effectivePrice = plan.price
    let couponId: string | undefined
    let couponDiscount: number | undefined

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } })
      if (!coupon || !coupon.isActive) return sendError(res, 'Invalid coupon code', 400)
      if (coupon.expiresAt && coupon.expiresAt < new Date()) return sendError(res, 'Coupon has expired', 400)
      if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) return sendError(res, 'Coupon usage limit reached', 400)
      couponDiscount = coupon.discountType === 'PERCENTAGE' ? coupon.discountValue : 0
      effectivePrice = plan.price * (1 - couponDiscount / 100)
      couponId = coupon.id
    }

    let razorpayPlanId: string

    if (couponCode && couponDiscount) {
      const discountedPlanName = `${plan.name}-${couponCode.toUpperCase()}`
      razorpayPlanId = await razorpayService.getOrCreateDiscountedPlan(discountedPlanName, effectivePrice)
    } else {
      razorpayPlanId = plan.razorpayPlanId || ''
      if (!razorpayPlanId) {
        const rzpPlan = await razorpayService.createPlan(plan.name, plan.price)
        razorpayPlanId = rzpPlan.id as string
        await prisma.plan.update({
          where: { id: plan.id },
          data: { razorpayPlanId },
        })
      }
    }

    const existingSub = await prisma.subscription.findUnique({ where: { userId: user.id } })
    if (existingSub?.razorpaySubscriptionId) {
      try {
        await razorpayService.cancelSubscription(existingSub.razorpaySubscriptionId)
      } catch { }
    }

    const rzpSubscription = await razorpayService.createSubscription(
      razorpayPlanId,
      user.id,
      plan.name,
      user.email,
      user.fullName,
    )

    return sendSuccess(res, {
      keyId: process.env.RAZORPAY_KEY_ID || '',
      subscriptionId: rzpSubscription.id,
      amount: Math.round(effectivePrice * 100),
      currency: 'INR',
      couponId,
    })
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to create order', 500)
  }
}

export async function verifyRazorpayPayment(req: Request, res: Response) {
  try {
    const { razorpayPaymentId, razorpaySubscriptionId, planName, couponId, amount } = req.body
    if (!razorpayPaymentId || !planName) {
      return sendError(res, 'Missing payment verification fields', 400)
    }

    const payment = await razorpayService.fetchPayment(razorpayPaymentId)
    if (payment.status !== 'captured') {
      return sendError(res, 'Payment not captured', 400)
    }

    const plan = await prisma.plan.findFirst({ where: { name: planName, isActive: true } })
    if (!plan) return sendError(res, 'Plan not found', 404)

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) return sendError(res, 'User not found', 404)

    const paidAmount = amount ? amount / 100 : plan.price

    const updateData: any = {
      planId: plan.id,
      status: 'ACTIVE',
      autoRenew: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }
    if (razorpaySubscriptionId) updateData.razorpaySubscriptionId = razorpaySubscriptionId

    const sub = await prisma.subscription.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        planId: plan.id,
        status: 'ACTIVE',
        autoRenew: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        razorpaySubscriptionId: razorpaySubscriptionId || null,
      },
    })

    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionId: sub.id },
    })

    await prisma.payment.create({
      data: {
        userId: user.id,
        subscriptionId: sub.id,
        amount: paidAmount,
        status: 'PAID',
        razorpayPaymentId,
      },
    })

    if (couponId) {
      await prisma.couponUsage.create({
        data: {
          couponId,
          userId: user.id,
          subscriptionId: sub.id,
          discountApplied: plan.price,
        },
      })
      await prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      })
    }

    return sendSuccess(res, null, 'Payment verified and subscription activated')
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Payment verification failed', 500)
  }
}

export async function redeemCoupon(req: Request, res: Response) {
  try {
    const { couponCode, planName } = req.body
    if (!couponCode || !planName) return sendError(res, 'couponCode and planName are required', 400)

    const plan = await prisma.plan.findFirst({ where: { name: planName, isActive: true } })
    if (!plan) return sendError(res, 'Plan not found', 404)
    if (plan.price <= 0) return sendError(res, 'Free plans cannot be discounted', 400)

    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } })
    if (!coupon || !coupon.isActive) return sendError(res, 'Invalid coupon code', 400)
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return sendError(res, 'Coupon has expired', 400)
    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) return sendError(res, 'Coupon usage limit reached', 400)

    const discountPercent = coupon.discountType === 'PERCENTAGE' ? coupon.discountValue : 0
    const finalAmount = plan.price * (1 - discountPercent / 100)

    if (finalAmount > 0) {
      return sendError(res, 'Coupon does not fully cover the plan price. Please use the regular checkout.', 400)
    }

    await subscriptionService.selectPlan(req.user!.userId, planName, coupon.id)

    return sendSuccess(res, null, `Redeemed ${coupon.code} — ${planName} plan activated`)
  } catch (err) {
    return sendError(res, err instanceof Error ? err.message : 'Failed to redeem coupon', 500)
  }
}

export async function getRazorpayKey(_req: Request, res: Response) {
  res.json({ keyId: process.env.RAZORPAY_KEY_ID || '' })
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
