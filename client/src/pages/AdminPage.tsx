import { useState, useEffect } from 'react'
import { Shield, Users, CreditCard, Activity, DollarSign } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import * as adminService from '../services/admin'
import type { AdminStats, AdminUser, AdminPlan, AdminSubscription } from '../services/admin'

export function AdminPage() {
  const { user } = useAuth()

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-text-primary">Access Denied</h1>
        <p className="text-text-secondary mt-1">You do not have permission to view this page.</p>
      </div>
    )
  }

  return <AdminPanel />
}

function AdminPanel() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([])
  const [tab, setTab] = useState<'overview' | 'users' | 'plans' | 'subscriptions'>('overview')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminService.getStats(),
      adminService.listUsers(1, 10),
      adminService.listPlans(),
      adminService.listSubscriptions(1, 10),
    ])
      .then(([s, u, p, sub]) => {
        setStats(s)
        setUsers(u.users)
        setPlans(p)
        setSubscriptions(sub.subscriptions)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? '--', icon: Users },
    { label: 'Total Trades', value: stats?.totalTrades ?? '--', icon: Activity },
    { label: 'Active Subs', value: stats?.activeSubscriptions ?? '--', icon: CreditCard },
    { label: 'Revenue', value: stats ? `$${stats.totalRevenue.toFixed(0)}` : '--', icon: DollarSign },
  ]

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'users' as const, label: 'Users' },
    { key: 'plans' as const, label: 'Plans' },
    { key: 'subscriptions' as const, label: 'Subscriptions' },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <Shield className="w-5 h-5 text-primary-light" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Panel</h1>
          <p className="text-text-secondary mt-1">Manage users, plans, and subscriptions.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s) => (
              <div key={s.label} className="card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-muted uppercase tracking-wider font-medium">{s.label}</p>
                  <s.icon className="w-4 h-4 text-primary-light" />
                </div>
                <p className="mt-3 text-2xl font-bold text-text-primary">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-1 bg-card p-1 rounded-lg border border-border w-fit">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  tab === t.key ? 'bg-primary text-text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {(tab === 'overview') && (
            <div className="card p-6 text-center text-text-muted">
              <p className="text-sm">Select a tab above to view details.</p>
            </div>
          )}

          {tab === 'users' && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-sidebar/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Trades</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-hover">
                      <td className="px-4 py-3 font-medium text-text-primary">{u.fullName}</td>
                      <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${u.role === 'ADMIN' ? 'bg-primary/10 text-primary-light' : 'bg-hover text-text-secondary'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${u.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{u._count.trades}</td>
                      <td className="px-4 py-3 text-text-muted text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'plans' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div key={plan.id} className={`bg-card rounded-xl border p-5 ${plan.isActive ? 'border-border' : 'border-danger/30 opacity-60'}`}>
                  <h3 className="font-semibold text-text-primary">{plan.name}</h3>
                  <p className="text-2xl font-bold text-text-primary mt-2">${plan.price.toFixed(2)}</p>
                  <div className="mt-4 space-y-2 text-sm text-text-secondary">
                    <p>Journal limit: {plan.journalLimit ?? 'Unlimited'}</p>
                    <p>Image limit: {plan.imageLimit ?? 'Unlimited'}</p>
                    <p>AI enabled: {plan.aiEnabled ? 'Yes' : 'No'}</p>
                    <p>Status: {plan.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'subscriptions' && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-sidebar/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Start</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">End</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="hover:bg-hover">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-text-primary">{s.user.fullName}</p>
                          <p className="text-xs text-text-muted">{s.user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{s.plan.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          s.status === 'ACTIVE' ? 'bg-success/10 text-success' :
                          s.status === 'EXPIRED' ? 'bg-danger/10 text-danger' :
                          'bg-hover text-text-secondary'
                        }`}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted">{new Date(s.startDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">{s.endDate ? new Date(s.endDate).toLocaleDateString() : '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
