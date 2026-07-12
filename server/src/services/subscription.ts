import { prisma } from '../lib/prisma.js'
import { createNotification } from './notification.js'
import * as razorpayService from './razorpay.js'
import { env } from '../config/env.js'

export async function getUserPlan(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: {
        include: { plan: true },
      },
    },
  })
  if (!user) throw new Error('User not found')

  const sub = user.subscription
  const plan = sub?.plan || await prisma.plan.findUnique({ where: { name: 'BASIC' } })

  const currencySetting = await prisma.setting.findUnique({ where: { key: 'default_currency' } })
  const defaultCurrency = currencySetting?.value || 'INR'

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const [tradesThisMonth, tradesToday, accountsUsed, checklistsUsed] = await Promise.all([
    prisma.trade.count({
      where: {
        userId,
        isDeleted: false,
        entryTime: { gte: startOfMonth },
      },
    }),
    prisma.trade.count({
      where: {
        userId,
        isDeleted: false,
        entryTime: { gte: startOfToday },
      },
    }),
    prisma.template.count({
      where: { userId },
    }),
    prisma.tag.count({
      where: {
        userId,
        content: { not: null },
        NOT: { content: '' },
      },
    }),
  ])

  return {
    plan: {
      id: plan!.id,
      name: plan!.name,
      price: plan!.price,
      currency: defaultCurrency,
      accountLimit: plan!.accountLimit,
      imageLimit: plan!.imageLimit,
      checklistLimit: plan!.checklistLimit,
      monthlyTradeLimit: plan!.monthlyTradeLimit,
      dailyTradeLimit: plan!.dailyTradeLimit,
      weeklyOutlook: plan!.weeklyOutlook,
      aiEnabled: plan!.aiEnabled,
    },
    status: sub?.status || 'ACTIVE',
    endDate: sub?.endDate || null,
    autoRenew: sub?.autoRenew ?? true,
    usage: {
      tradesThisMonth,
      tradesToday,
      accountsUsed,
      checklistsUsed,
    },
  }
}

export async function selectPlan(userId: string, planName: string, couponId?: string) {
  const plan = await prisma.plan.findFirst({ where: { name: planName, isActive: true } })
  if (!plan) throw new Error('Plan not found')

  const existing = await prisma.subscription.findUnique({ where: { userId } })
  let subId: string
  if (existing) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        planId: plan.id,
        status: 'ACTIVE',
        endDate: plan.price > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      },
    })
    subId = existing.id
  } else {
    const sub = await prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: 'ACTIVE',
        endDate: plan.price > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      },
    })
    subId = sub.id
  }

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionId: subId },
  })

  if (plan.price > 0) {
    await prisma.payment.create({
      data: {
        userId,
        subscriptionId: subId,
        amount: couponId ? 0 : plan.price,
        status: 'PAID',
      },
    })

    if (couponId) {
      await prisma.couponUsage.create({
        data: {
          couponId,
          userId,
          subscriptionId: subId,
          discountApplied: plan.price,
        },
      })
      await prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      })
    }

    await createNotification(userId, 'Payment Confirmed', `Subscribed to ${plan.name} plan — ${couponId ? 'Redeemed with coupon' : `₹${plan.price}`}`)
  }
}

export async function upgradeToPro(userId: string) {
  const plan = await prisma.plan.findUnique({ where: { name: 'PRO' } })
  if (!plan) throw new Error('PRO plan not found')

  const sub = await prisma.subscription.upsert({
    where: { userId },
    update: {
      planId: plan.id,
      status: 'ACTIVE',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoRenew: true,
    },
    create: {
      userId,
      planId: plan.id,
      status: 'ACTIVE',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoRenew: true,
    },
  })

  await prisma.payment.create({
    data: {
      userId,
      subscriptionId: sub.id,
      amount: plan.price,
      status: 'PAID',
    },
  })
  await createNotification(userId, 'Payment Confirmed', `Upgraded to PRO plan — ₹${plan.price}`)
}

export async function cancelAutoRenew(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub) throw new Error('No active subscription found')

  if (sub.razorpaySubscriptionId && razorpayService.isConfigured()) {
    try {
      await razorpayService.pauseSubscription(sub.razorpaySubscriptionId)
    } catch (err) {
      console.error('[Razorpay] Failed to pause subscription:', err)
    }
  }

  await prisma.subscription.update({
    where: { userId },
    data: { autoRenew: false },
  })
}

export async function reactivateAutoRenew(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub) throw new Error('No active subscription found')

  if (sub.razorpaySubscriptionId && razorpayService.isConfigured()) {
    try {
      await razorpayService.resumeSubscription(sub.razorpaySubscriptionId)
    } catch (err) {
      console.error('[Razorpay] Failed to resume subscription:', err)
    }
  }

  await prisma.subscription.update({
    where: { userId },
    data: { autoRenew: true },
  })
}

export async function checkExpiredSubscriptions() {
  const basicPlan = await prisma.plan.findUnique({ where: { name: 'BASIC' } })
  if (!basicPlan) return []

  const expired = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      endDate: { lt: new Date() },
      plan: { name: 'PRO' },
    },
  })

  for (const sub of expired) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planId: basicPlan.id,
        status: 'EXPIRED',
      },
    })
    console.log(`[Subscription] Downgraded user ${sub.userId} from PRO to BASIC (expired)`)
  }

  return expired
}
