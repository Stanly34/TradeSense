declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance
  }
}

interface RazorpayOptions {
  key: string
  amount?: number
  currency?: string
  name: string
  description: string
  order_id?: string
  subscription_id?: string
  prefill?: { name?: string; email?: string }
  notes?: Record<string, string>
  handler: (response: {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
    razorpay_subscription_id?: string
  }) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: () => void) => void
}

let loadPromise: Promise<void> | null = null

export function loadRazorpayScript(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window.Razorpay !== 'undefined') {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Failed to load Razorpay checkout script'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}
