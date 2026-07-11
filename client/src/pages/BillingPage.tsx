import { useState, useEffect } from 'react'
import { CreditCard, DollarSign, CalendarDays, CheckCircle, XCircle, Receipt } from 'lucide-react'
import * as subscriptionsService from '../services/subscriptions'
import type { Payment } from '../services/subscriptions'
import toast from 'react-hot-toast'

export function BillingPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    subscriptionsService.listPayments()
      .then(setPayments)
      .catch(() => toast.error('Failed to load billing history'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Receipt className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Billing History</h1>
          <p className="text-sm text-text-muted">View your past payments and subscriptions</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Receipt className="w-16 h-16 mb-4 text-text-muted/40" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">No payments yet</h3>
          <p className="text-sm">Your payment history will appear here after you subscribe to a paid plan.</p>
        </div>
      ) : (
        <div className="bg-elevated rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-4">Date</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-4">Plan</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-4">Amount</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-4">Provider</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-4">Transaction</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-card/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-text-primary">
                        <CalendarDays className="w-4 h-4 text-text-muted" />
                        {new Date(payment.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-text-primary">{payment.subscription.plan.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm font-semibold text-text-primary">
                        <DollarSign className="w-3.5 h-3.5 text-text-muted" />
                        {payment.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary capitalize">{payment.provider || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-text-muted font-mono text-xs">
                        {payment.transactionId ? payment.transactionId.slice(0, 12) + '...' : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {payment.status === 'PAID' ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <XCircle className="w-4 h-4 text-danger" />
                        )}
                        <span className={`text-sm font-medium ${
                          payment.status === 'PAID' ? 'text-success' : 'text-danger'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
