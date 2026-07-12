import Razorpay from 'razorpay'
import crypto from 'crypto'
import { env } from '../config/env.js'

function getClient(): Razorpay {
  return new Razorpay({
    key_id: env.razorpay.keyId,
    key_secret: env.razorpay.keySecret,
  })
}

export function isConfigured(): boolean {
  return !!(env.razorpay.keyId && env.razorpay.keySecret)
}

export async function createPlan(name: string, amount: number) {
  const client = getClient()
  const plan = await client.plans.create({
    period: 'monthly',
    interval: 1,
    item: {
      name,
      amount: Math.round(amount * 100),
      currency: 'INR',
      description: `${name} plan — monthly recurring`,
    },
  })
  return plan
}

export async function createSubscription(planId: string, userId: string, planName: string, userEmail: string, userFullName: string, couponDiscount?: number) {
  const client = getClient()
  const subscription = await client.subscriptions.create({
    plan_id: planId,
    total_count: 12,
    customer_notify: true,
    quantity: 1,
    notes: {
      userId,
      planName,
      userEmail,
      userFullName,
    },
  })
  return subscription
}

export async function getSubscription(razorpaySubscriptionId: string) {
  const client = getClient()
  return client.subscriptions.fetch(razorpaySubscriptionId)
}

export async function cancelSubscription(razorpaySubscriptionId: string) {
  const client = getClient()
  await client.subscriptions.cancel(razorpaySubscriptionId)
}

export async function pauseSubscription(razorpaySubscriptionId: string) {
  const client = getClient()
  await client.subscriptions.pause(razorpaySubscriptionId)
}

export async function resumeSubscription(razorpaySubscriptionId: string) {
  const client = getClient()
  await client.subscriptions.resume(razorpaySubscriptionId)
}

export function verifyPayment(orderId: string, paymentId: string, signature: string): boolean {
  const body = orderId + '|' + paymentId
  const expected = crypto.createHmac('sha256', env.razorpay.keySecret).update(body).digest('hex')
  return expected === signature
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const expected = crypto.createHmac('sha256', env.razorpay.webhookSecret).update(body).digest('hex')
  return expected === signature
}

export async function fetchPayment(paymentId: string) {
  const client = getClient()
  return client.payments.fetch(paymentId)
}

export async function getOrCreateDiscountedPlan(name: string, discountedAmount: number) {
  const client = getClient()
  const plan = await client.plans.create({
    period: 'monthly',
    interval: 1,
    item: {
      name,
      amount: Math.round(discountedAmount * 100),
      currency: 'INR',
      description: `${name} — discounted plan`,
    },
  })
  return plan.id as string
}
