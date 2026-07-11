import { Request, Response } from 'express'
import { env } from '../config/env.js'
import { selectPlan } from '../services/subscription.js'

export async function handleWebhook(req: Request, res: Response) {
  if (!env.stripe.webhookSecret || !env.stripe.secretKey) {
    return res.status(200).json({ received: true })
  }

  try {
    const stripe = await import('stripe')
    const client = new stripe.default(env.stripe.secretKey)

    const sig = req.headers['stripe-signature'] as string
    const event = client.webhooks.constructEvent(
      req.body,
      sig,
      env.stripe.webhookSecret
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { client_reference_id: string; metadata: Record<string, string> }
      if (session.client_reference_id) {
        const planName = session.metadata?.planName || 'PRO'
        await selectPlan(session.client_reference_id, planName)
      }
    }

    res.status(200).json({ received: true })
  } catch (err) {
    console.error('[Stripe Webhook]', err)
    res.status(400).send(`Webhook Error`)
  }
}
