import { useState, useEffect, useRef } from 'react'
import { Shield, X, Plus, Search, User, Mail, Calendar, Activity, Zap, Clock, ChevronRight, CreditCard, Sparkles, Check, Pencil, Trash2, FileText, Image, Tags, Trophy, Brain, CalendarCheck, AlertTriangle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import * as adminService from '../services/admin'
import type { AdminUser, AdminPlan, AdminTrade, AdminJournal, AdminCoupon, AuditLogEntry } from '../services/admin'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'
import { Select } from '../components/ui/Select'
import { SelectionBar } from '../components/ui/SelectionBar'
import { DateTimePicker } from '../components/ui/DateTimePicker'

const ACTION_LABELS: Record<string, string> = {
  USER_ROLE_CHANGED: 'Role Changed',
  USER_ACTIVATED: 'User Activated',
  USER_DEACTIVATED: 'User Deactivated',
  USER_PLAN_CHANGED: 'Plan Changed',
  PLAN_CREATED: 'Plan Created',
  PLAN_EDITED: 'Plan Edited',
  PLAN_DEACTIVATED: 'Plan Deactivated',
  COUPON_CREATED: 'Coupon Created',
  COUPON_EDITED: 'Coupon Edited',
  COUPON_DEACTIVATED: 'Coupon Deactivated',
}

export function AdminPage() {
  const { user } = useAuth()

  if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-text-primary">Access Denied</h1>
        <p className="text-text-secondary mt-1">You do not have permission to view this page.</p>
      </div>
    )
  }

  return <AdminPanel role={user!.role} />
}

function AdminPanel({ role }: { role: string }) {
  const isAdmin = role === 'ADMIN'
  const [users, setUsers] = useState<AdminUser[]>([])
  const [plans, setPlans] = useState<AdminPlan[]>([])

  const [tab, setTab] = useState<'users' | 'plans' | 'trades' | 'journals' | 'coupons' | 'activity'>('users')
  const [isLoading, setIsLoading] = useState(true)
  const [planModal, setPlanModal] = useState<{ mode: 'create' | 'edit'; plan?: AdminPlan } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'user' | 'plan'; id: string; name: string } | null>(null)

  const tabs = [
    { key: 'users' as const, label: 'Users' },
    { key: 'plans' as const, label: 'Plans' },
    { key: 'trades' as const, label: 'Trades' },
    { key: 'journals' as const, label: 'Journals' },
    ...(isAdmin ? [{ key: 'coupons' as const, label: 'Coupons' }] : []),
    { key: 'activity' as const, label: 'Activity Log' },
  ]

  async function loadCore() {
    setIsLoading(true)
    try {
      const [u, p] = await Promise.all([
        adminService.listUsers(1, 50),
        adminService.listPlans(),
      ])
      setUsers(u.users)
      setPlans(p)
    } catch {}
    setIsLoading(false)
  }

  async function refreshCore() {
    try {
      const [u, p] = await Promise.all([
        adminService.listUsers(1, 50),
        adminService.listPlans(),
      ])
      setUsers(u.users)
      setPlans(p)
    } catch {}
  }

  useEffect(() => { loadCore() }, [])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-primary/10">
          <Shield className="w-5 h-5 text-primary-light" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Panel</h1>
          <p className="text-text-secondary mt-1">Manage users, plans, and platform data.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="flex gap-1 bg-card p-1 rounded-lg border border-border w-fit flex-wrap">
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

          {tab === 'users' && (
            <UsersTab
              users={users}
              plans={plans}
              isAdmin={isAdmin}
              onUpdate={async (id, data) => { await adminService.updateUser(id, data); refreshCore() }}
              onChangePlan={isAdmin ? async (id, planId) => { await adminService.changeUserPlan(id, planId); refreshCore() } : undefined}
              onRefresh={refreshCore}
            />
          )}

          {tab === 'plans' && (
            <PlansTab
              plans={plans}
              onCreate={isAdmin ? () => setPlanModal({ mode: 'create' }) : undefined}
              onEdit={isAdmin ? (plan) => setPlanModal({ mode: 'edit', plan }) : undefined}
              onDelete={isAdmin ? (id, name) => setConfirmDelete({ type: 'plan', id, name }) : undefined}
              onRefresh={refreshCore}
            />
          )}

          {tab === 'trades' && <AdminTradesTab />}
          {tab === 'journals' && <AdminJournalsTab />}
          {tab === 'coupons' && isAdmin && <CouponsTab />}
          {tab === 'activity' && <ActivityLogTab />}
        </>
      )}

      {planModal && (
        <PlanModal
          mode={planModal.mode}
          plan={planModal.plan}
          onClose={() => setPlanModal(null)}
          onSave={async (data) => {
            if (planModal.mode === 'create') await adminService.createPlan(data)
            else if (planModal.plan) await adminService.updatePlan(planModal.plan.id, data)
            setPlanModal(null)
            refreshCore()
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          type={confirmDelete.type}
          name={confirmDelete.name}
          onClose={() => setConfirmDelete(null)}
          onConfirm={async () => {
            if (confirmDelete.type === 'user') await adminService.deactivateUser(confirmDelete.id)
            else await adminService.deactivatePlan(confirmDelete.id)
            setConfirmDelete(null)
            refreshCore()
          }}
        />
      )}
    </div>
  )
}

function UsersTab({ users, plans, isAdmin, onUpdate, onChangePlan, onRefresh }: {
  users: AdminUser[]
  plans: AdminPlan[]
  isAdmin: boolean
  onUpdate: (id: string, data: { role?: string; isActive?: boolean }) => Promise<void>
  onChangePlan?: (id: string, planId: string) => Promise<void>
  onRefresh: () => void
}) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  async function handleUserUpdate(id: string, data: { role?: string; isActive?: boolean }) {
    await onUpdate(id, data)
    onRefresh()
  }

  async function handlePlanChange(id: string, planId: string) {
    if (onChangePlan) {
      await onChangePlan(id, planId)
      onRefresh()
    }
  }

  return (
    <>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sidebar/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Role</th>
              {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Plan</th>}
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Trades</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {users.map((u) => (
              <UserRow key={u.id} user={u} plans={plans} isAdmin={isAdmin} onUpdate={handleUserUpdate} onChangePlan={isAdmin ? handlePlanChange : undefined} onSelect={() => setSelectedUser(u)} />
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  )
}

function UserRow({ user: u, plans, isAdmin, onUpdate, onChangePlan, onSelect }: {
  user: AdminUser
  plans: AdminPlan[]
  isAdmin: boolean
  onUpdate: (id: string, data: { role?: string; isActive?: boolean }) => Promise<void>
  onChangePlan?: (id: string, planId: string) => Promise<void>
  onSelect: () => void
}) {
  const [role, setRole] = useState(u.role)
  const [isActive, setIsActive] = useState(u.isActive)
  const [planId, setPlanId] = useState(u.subscription?.plan?.id ?? '')
  const [confirmChange, setConfirmChange] = useState<string | null>(null)
  const [confirmToggle, setConfirmToggle] = useState(false)
  const [confirmPlan, setConfirmPlan] = useState(false)
  const [pendingPlanId, setPendingPlanId] = useState('')
  const [saving, setSaving] = useState(false)

  async function confirmRoleChange() {
    if (!confirmChange) return
    setSaving(true)
    await onUpdate(u.id, { role: confirmChange })
    setRole(confirmChange as 'USER' | 'MANAGER' | 'ADMIN')
    setConfirmChange(null)
    setSaving(false)
  }

  async function handleToggle() {
    setSaving(true)
    await onUpdate(u.id, { isActive: !isActive })
    setIsActive(!isActive)
    setConfirmToggle(false)
    setSaving(false)
  }

  async function handlePlanConfirm() {
    if (!pendingPlanId || !onChangePlan) return
    setSaving(true)
    await onChangePlan(u.id, pendingPlanId)
    setPlanId(pendingPlanId)
    setConfirmPlan(false)
    setSaving(false)
  }

  const roleOptions = isAdmin ? ['USER', 'MANAGER', 'ADMIN'] : ['USER', 'MANAGER']

  return (
    <>
      <tr className="hover:bg-hover cursor-pointer" onClick={onSelect}>
        <td className="px-4 py-3 font-medium text-text-primary hover:text-primary-light transition-colors">{u.fullName}</td>
        <td className="px-4 py-3 text-text-secondary">{u.email}</td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <select
            value={role}
            onChange={(e) => setConfirmChange(e.target.value)}
            className="text-xs bg-card border border-border rounded px-2 py-1 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </td>
        {isAdmin && (
          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
            <select
              value={planId}
              onChange={(e) => { setPendingPlanId(e.target.value); setConfirmPlan(true) }}
              className="text-xs bg-card border border-border rounded px-2 py-1 text-text-primary focus:outline-none focus:ring-1 focus:ring-primary max-w-[130px]"
            >
              {u.subscription ? (
                <option value={u.subscription.plan.id}>{u.subscription.plan.name}</option>
              ) : (
                <option value="">No plan</option>
              )}
              {plans.filter((p) => p.isActive && p.id !== u.subscription?.plan?.id).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </td>
        )}
        <td className="px-4 py-3 text-text-secondary">{u._count.trades}</td>
        <td className="px-4 py-3 text-text-muted text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setConfirmToggle(true)}
            className={`relative w-9 h-5 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-border'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-4' : ''}`} />
          </button>
        </td>
      </tr>

      {confirmChange && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-text-primary">Confirm Role Change</h2>
            <p className="text-sm text-text-secondary mt-2">
              Change <strong>{u.fullName}</strong>'s role to <strong>{confirmChange}</strong>?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmChange(null)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={confirmRoleChange} disabled={saving} className="px-4 py-2 bg-primary text-text-primary rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmToggle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-text-primary">{isActive ? 'Deactivate' : 'Activate'} User</h2>
            <p className="text-sm text-text-secondary mt-2">
              {isActive
                ? <><strong>{u.fullName}</strong> will be unable to access their account.</>
                : <><strong>{u.fullName}</strong> will regain access to their account.</>}
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmToggle(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={handleToggle} disabled={saving} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                isActive
                  ? 'bg-danger text-text-primary hover:bg-danger/80'
                  : 'bg-primary text-text-primary hover:bg-primary-dark'
              }`}>
                {saving ? 'Saving...' : isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-text-primary">Change Plan</h2>
            <p className="text-sm text-text-secondary mt-2">
              Change <strong>{u.fullName}</strong>'s plan to <strong>{plans.find((p) => p.id === pendingPlanId)?.name || 'No plan'}</strong>?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmPlan(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={handlePlanConfirm} disabled={saving} className="px-4 py-2 bg-primary text-text-primary rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function UserDetailModal({ user: u, onClose }: { user: AdminUser; onClose: () => void }) {
  const [trades, setTrades] = useState<AdminTrade[]>([])

  useEffect(() => {
    adminService.listAllTrades(1, 5, { userId: u.id }).then((r) => setTrades(r.trades)).catch(() => {})
  }, [u.id])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-elevated rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-elevated z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-text-inverse" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{u.fullName}</h2>
              <p className="text-xs text-text-muted">@{u.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                <Mail className="w-3.5 h-3.5" />
                Email
              </div>
              <p className="text-sm font-medium text-text-primary">{u.email}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                <Shield className="w-3.5 h-3.5" />
                Role
              </div>
              <p className="text-sm font-medium text-text-primary">{u.role}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                <Activity className="w-3.5 h-3.5" />
                Status
              </div>
              <p className={`text-sm font-medium ${u.isActive ? 'text-success' : 'text-danger'}`}>
                {u.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                <Calendar className="w-3.5 h-3.5" />
                Joined
              </div>
              <p className="text-sm font-medium text-text-primary">{new Date(u.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                <Clock className="w-3.5 h-3.5" />
                Last Login
              </div>
              <p className="text-sm font-medium text-text-primary">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border/50">
              <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                <Zap className="w-3.5 h-3.5" />
                Total Trades
              </div>
              <p className="text-sm font-medium text-text-primary">{u._count.trades}</p>
            </div>
          </div>

          {u.subscription && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Subscription
              </h3>
              <div className="bg-card rounded-xl border border-border/50 divide-y divide-border/50">
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-text-secondary">Plan</span>
                  <span className="font-medium text-text-primary">{u.subscription.plan.name}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-text-secondary">Status</span>
                  <span className={`font-medium ${u.subscription.status === 'ACTIVE' ? 'text-success' : u.subscription.status === 'CANCELLED' ? 'text-warning' : 'text-danger'}`}>
                    {u.subscription.status}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-text-secondary">Started</span>
                  <span className="text-text-primary">{new Date(u.subscription.startDate).toLocaleDateString()}</span>
                </div>
                {u.subscription.endDate && (
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-text-secondary">Ends</span>
                    <span className="text-text-primary">{new Date(u.subscription.endDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {trades.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Recent Trades
              </h3>
              <div className="bg-card rounded-xl border border-border/50 divide-y divide-border/50">
                {trades.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-text-primary">{t.instrument}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        t.direction === 'LONG' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}>
                        {t.direction}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted text-xs">{t.entryTime ? new Date(t.entryTime).toLocaleDateString() : '—'}</span>
                      <span className={`text-xs font-medium ${t.result === 'WIN' ? 'text-success' : t.result === 'LOSS' ? 'text-danger' : 'text-text-muted'}`}>
                        {t.result || '—'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

const PLAN_FEATURES = [
  { key: 'journalLimit' as const, label: 'Journals', icon: FileText },
  { key: 'imageLimit' as const, label: 'Images', icon: Image },
  { key: 'accountLimit' as const, label: 'Accounts', icon: Zap },
  { key: 'checklistLimit' as const, label: 'Checklists', icon: Tags },
  { key: 'monthlyTradeLimit' as const, label: 'Monthly Trades', icon: Trophy },
  { key: 'dailyTradeLimit' as const, label: 'Daily Trades', icon: Clock },
] as const

function PlansTab({ plans, onCreate, onEdit, onDelete, onRefresh }: {
  plans: AdminPlan[]
  onCreate?: () => void
  onEdit?: (plan: AdminPlan) => void
  onDelete?: (id: string, name: string) => void
  onRefresh?: () => Promise<void>
}) {
  const activeCount = plans.filter((p) => p.isActive).length
  const [selectMode, setSelectMode] = useState(false)
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTarget = useRef<string | null>(null)
  const wasLongPress = useRef(false)

  useEffect(() => {
    if (selectMode && selectedPlans.size === 0) {
      setSelectMode(false)
    }
  }, [selectedPlans, selectMode])

  function toggleSelect(id: string) {
    if (!selectMode) return
    const plan = plans.find((p) => p.id === id)
    if (!plan || !plan.isActive) return
    setSelectedPlans((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const activeIds = plans.filter((p) => p.isActive).map((p) => p.id)
    if (activeIds.every((id) => selectedPlans.has(id))) {
      setSelectedPlans(new Set())
    } else {
      setSelectedPlans(new Set(activeIds))
    }
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedPlans(new Set())
  }

  async function handleBulkDelete() {
    setBulkLoading(true)
    try {
      const activeSelected = plans.filter((p) => p.isActive && selectedPlans.has(p.id))
      if (activeSelected.length === 0) {
        toast.error('No active plans selected')
        setShowBulkConfirm(false)
        setBulkLoading(false)
        return
      }
      await Promise.all(activeSelected.map((p) => adminService.deactivatePlan(p.id)))
      toast.success(`${activeSelected.length} plan${activeSelected.length !== 1 ? 's' : ''} deactivated`)
      exitSelectMode()
      setShowBulkConfirm(false)
      await onRefresh?.()
    } catch {
      toast.error('Failed to deactivate some plans')
    } finally {
      setBulkLoading(false)
    }
  }

  function startLongPress(id: string) {
    if (selectMode) return
    const plan = plans.find((p) => p.id === id)
    if (!plan || !plan.isActive) return
    longPressTarget.current = id
    wasLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      if (longPressTarget.current) {
        wasLongPress.current = true
        setSelectMode(true)
        setSelectedPlans(new Set([longPressTarget.current]))
        longPressTarget.current = null
      }
    }, 500)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    longPressTarget.current = null
  }

  function handleCardClick(id: string) {
    if (wasLongPress.current) {
      wasLongPress.current = false
      return
    }
    if (selectMode) toggleSelect(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-text-secondary">{plans.length} plan{plans.length !== 1 ? 's' : ''} &bull; {activeCount} active</p>
        </div>
        <div className="flex items-center gap-3">
          {onCreate && (
            <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-text-inverse rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              Create Plan
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...plans].sort((a, b) => a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1).map((plan) => {
          const isSelected = selectedPlans.has(plan.id)
          return (
            <div
              key={plan.id}
              onMouseDown={() => startLongPress(plan.id)}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={() => startLongPress(plan.id)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onClick={() => handleCardClick(plan.id)}
              className={`bg-elevated rounded-2xl border-2 relative transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex flex-col overflow-hidden ${
                isSelected ? 'border-primary ring-2 ring-primary/20' : plan.isActive ? 'border-border' : 'border-danger/30 opacity-70'
              } ${selectMode ? 'cursor-pointer' : ''}`}>
              {!plan.isActive && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-danger text-text-inverse text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Inactive
                </div>
              )}

              {/* Header gradient */}
              <div className={`px-6 pt-6 pb-4 ${plan.isActive ? 'bg-gradient-to-br from-primary/10 via-transparent to-transparent' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-text-primary">${plan.price.toFixed(2)}</span>
                      <span className="text-text-muted text-xs">/month</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectMode && plan.isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(plan.id) }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-primary border-primary' : 'border-border hover:border-primary'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-text-inverse" />}
                      </button>
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.isActive ? 'bg-primary/15' : 'bg-hover'}`}>
                      <Sparkles className={`w-5 h-5 ${plan.isActive ? 'text-primary' : 'text-text-muted'}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature list */}
              <div className="px-6 pb-6 flex-1">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 mt-2">Limits</p>
                <div className="space-y-2.5">
                  {PLAN_FEATURES.map(({ key, label, icon: Icon }) => {
                    const val = plan[key]
                    return (
                      <div key={key} className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                        <span className="text-text-secondary">{label}</span>
                        <span className="ml-auto text-text-primary font-medium tabular-nums">
                          {val !== null ? val : <span className="text-text-muted font-normal">Unlimited</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 space-y-2.5">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Features</p>
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center shrink-0">
                      <CalendarCheck className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                    <span className="text-text-secondary">Weekly Outlook</span>
                    <span className="ml-auto">{plan.weeklyOutlook ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-text-muted" />}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center shrink-0">
                      <Brain className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                    <span className="text-text-secondary">AI Analysis</span>
                    <span className="ml-auto">{plan.aiEnabled ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-text-muted" />}</span>
                  </div>
                </div>
              </div>

              {plan.isActive && (onEdit || onDelete) && (
                <div className="px-6 pb-5 flex items-center gap-2 border-t border-border/50 pt-4 mt-auto">
                  {onEdit && (
                    <button onClick={(e) => { e.stopPropagation(); onEdit(plan) }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary hover:text-primary-light hover:bg-primary/10 rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={(e) => { e.stopPropagation(); onDelete(plan.id, plan.name) }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                      Deactivate
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-text-primary">Deactivate Plans</h2>
            <p className="text-sm text-text-secondary mt-2">
              Deactivate <strong>{selectedPlans.size}</strong> plan{selectedPlans.size !== 1 ? 's' : ''}? Users on these plans will be affected.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowBulkConfirm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={handleBulkDelete} disabled={bulkLoading} className="px-4 py-2 bg-danger text-text-inverse rounded-lg text-sm font-medium hover:bg-danger/80 transition-colors disabled:opacity-50">
                {bulkLoading ? 'Deactivating...' : `Deactivate ${selectedPlans.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {!showBulkConfirm && (
        <SelectionBar
          count={selectedPlans.size}
          onDelete={() => setShowBulkConfirm(true)}
          onCancel={exitSelectMode}
          allSelected={selectedPlans.size === plans.filter((p) => p.isActive).length}
          onToggleSelectAll={toggleSelectAll}
        />
      )}
    </div>
  )
}

function PlanModal({ mode, plan, onClose, onSave }: {
  mode: 'create' | 'edit'
  plan?: AdminPlan
  onClose: () => void
  onSave: (data: Record<string, unknown>) => Promise<void>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    price: plan?.price ?? '',
    journalLimit: plan?.journalLimit,
    imageLimit: plan?.imageLimit,
    accountLimit: plan?.accountLimit,
    checklistLimit: plan?.checklistLimit,
    monthlyTradeLimit: plan?.monthlyTradeLimit,
    dailyTradeLimit: plan?.dailyTradeLimit,
    weeklyOutlook: plan?.weeklyOutlook ?? false,
    aiEnabled: plan?.aiEnabled ?? false,
    isActive: plan?.isActive ?? true,
  })
  const limitFields = ['journalLimit', 'imageLimit', 'accountLimit', 'checklistLimit', 'monthlyTradeLimit', 'dailyTradeLimit'] as const
  const [unlimited, setUnlimited] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const key of limitFields) {
      init[key] = plan ? plan[key] === null : false
    }
    return init
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (form.price === '' || form.price <= 0) newErrors.price = 'Price must be greater than 0'
    for (const key of limitFields) {
      if (!unlimited[key] && (form[key] === null || form[key] === undefined)) {
        newErrors[key] = 'Set a limit or toggle ∞'
      }
    }
    if (Object.keys(newErrors).length) { setErrors(newErrors); scrollRef.current?.scrollTo(0,0); return }
    setErrors({})
    setSaving(true)
    try {
      const data = { ...form }
      for (const key of limitFields) {
        data[key] = unlimited[key] ? null : form[key]
      }
      await onSave(data as unknown as Record<string, unknown>)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save plan'
      toast.error(msg)
      setSaving(false)
    }
  }

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div ref={scrollRef} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto" onClick={onClose}>
      <div className="bg-elevated rounded-2xl border border-border w-full max-w-lg my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{mode === 'create' ? 'Create Plan' : 'Edit Plan'}</h2>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
            </div>
            <Input label="Price" type="number" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)} error={errors.price} endAdornment={<span className="text-text-muted">$</span>} />
            {limitFields.map((key) => (
              <div key={key} className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                    type="number"
                    value={unlimited[key] ? '' : (form[key] ?? '')}
                    onChange={(e) => set(key, e.target.value ? parseInt(e.target.value) : (unlimited[key] ? null : null))}
                    error={errors[key]}
                    disabled={unlimited[key]}
                    placeholder={unlimited[key] ? 'Unlimited' : ''}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUnlimited((prev) => ({ ...prev, [key]: !prev[key] }))
                    if (!unlimited[key]) set(key, null)
                  }}
                  className={`mb-0.5 px-2.5 py-2 rounded-lg text-sm font-mono transition-colors ${
                    unlimited[key] ? 'bg-primary text-text-primary' : 'bg-card text-text-muted hover:text-text-primary border border-border'
                  }`}
                  title="Toggle unlimited"
                >
                  ∞
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" checked={form.weeklyOutlook} onChange={(e) => set('weeklyOutlook', e.target.checked)} className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-brand/30" />
              Weekly Outlook
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" checked={form.aiEnabled} onChange={(e) => set('aiEnabled', e.target.checked)} className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-brand/30" />
              AI Enabled
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-brand/30" />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-text-inverse rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50">
              {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmModal({ type, name, onClose, onConfirm }: {
  type: 'user' | 'plan'
  name: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-elevated rounded-2xl border border-border w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-text-primary">Deactivate {type === 'user' ? 'User' : 'Plan'}</h2>
        <p className="text-sm text-text-secondary mt-2">
          Are you sure you want to deactivate <strong>{name}</strong>? This action can be reversed later.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
          <button onClick={async () => { setSaving(true); await onConfirm(); setSaving(false) }} disabled={saving} className="px-4 py-2 bg-danger text-text-primary rounded-lg text-sm font-medium hover:bg-danger/80 transition-colors disabled:opacity-50">
            {saving ? 'Deactivating...' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminTradesTab() {
  const [trades, setTrades] = useState<AdminTrade[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load(pageNum: number) {
    setIsLoading(true)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      const result = await adminService.listAllTrades(pageNum, 20, params)
      setTrades(result.trades)
      setTotalPages(result.totalPages)
      setPage(pageNum)
    } catch {}
    setIsLoading(false)
  }

  useEffect(() => { load(1) }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(1) }}
            placeholder="Search by user..."
            className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button onClick={() => load(1)} className="px-4 py-2 bg-primary text-text-primary rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">Search</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sidebar/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Instrument</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Direction</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Result</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Loading...</td></tr>
            ) : trades.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">No trades found</td></tr>
            ) : trades.map((t) => (
              <tr key={t.id} className="hover:bg-hover">
                <td className="px-4 py-3 font-medium text-text-primary">{t.user.fullName}</td>
                <td className="px-4 py-3 text-text-secondary">{t.instrument}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${t.direction === 'LONG' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {t.direction}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{t.result || '—'}</td>
                <td className="px-4 py-3 text-text-secondary">{t.status}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{t.entryTime ? new Date(t.entryTime).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => load(p)}
              className={`px-3 py-1 text-sm rounded-md ${p === page ? 'bg-primary text-text-primary' : 'bg-card text-text-secondary hover:text-text-primary'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminJournalsTab() {
  const [journals, setJournals] = useState<AdminJournal[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  async function load(pageNum: number) {
    setIsLoading(true)
    try {
      const result = await adminService.listAllJournals(pageNum, 20)
      setJournals(result.journals)
      setTotalPages(result.totalPages)
      setPage(pageNum)
    } catch {}
    setIsLoading(false)
  }

  useEffect(() => { load(1) }, [])

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sidebar/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Trade</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Content</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">Loading...</td></tr>
            ) : journals.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">No journals found</td></tr>
            ) : journals.map((j) => (
              <tr key={j.id} className="hover:bg-hover">
                <td className="px-4 py-3 font-medium text-text-primary">{j.user.fullName}</td>
                <td className="px-4 py-3 text-text-secondary">{j.trade.instrument} ({j.trade.direction})</td>
                <td className="px-4 py-3 text-text-secondary max-w-xs truncate">{j.content}</td>
                <td className="px-4 py-3 text-text-muted text-xs">{new Date(j.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => load(p)}
              className={`px-3 py-1 text-sm rounded-md ${p === page ? 'bg-primary text-text-primary' : 'bg-card text-text-secondary hover:text-text-primary'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CouponsTab() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; coupon?: AdminCoupon } | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedCoupons, setSelectedCoupons] = useState<Set<string>>(new Set())
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTarget = useRef<string | null>(null)
  const wasLongPress = useRef(false)

  async function load() {
    try {
      const c = await adminService.listCoupons()
      setCoupons(c)
    } catch {}
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (selectMode && selectedCoupons.size === 0) {
      setSelectMode(false)
    }
  }, [selectedCoupons, selectMode])

  function toggleSelect(id: string) {
    if (!selectMode) return
    const c = coupons.find((c) => c.id === id)
    if (!c || !c.isActive) return
    setSelectedCoupons((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const activeIds = coupons.filter((c) => c.isActive).map((c) => c.id)
    if (activeIds.every((id) => selectedCoupons.has(id))) {
      setSelectedCoupons(new Set())
    } else {
      setSelectedCoupons(new Set(activeIds))
    }
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedCoupons(new Set())
  }

  function startLongPress(id: string) {
    if (selectMode) return
    const c = coupons.find((c) => c.id === id)
    if (!c || !c.isActive) return
    longPressTarget.current = id
    wasLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      if (longPressTarget.current) {
        wasLongPress.current = true
        setSelectMode(true)
        setSelectedCoupons(new Set([longPressTarget.current]))
        longPressTarget.current = null
      }
    }, 500)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    longPressTarget.current = null
  }

  function handleCardClick(id: string) {
    if (wasLongPress.current) {
      wasLongPress.current = false
      return
    }
    if (selectMode) toggleSelect(id)
  }

  async function handleBulkDeactivate() {
    setBulkLoading(true)
    try {
      const activeSelected = coupons.filter((c) => c.isActive && selectedCoupons.has(c.id))
      if (activeSelected.length === 0) {
        toast.error('No active coupons selected')
        setShowBulkConfirm(false)
        setBulkLoading(false)
        return
      }
      await Promise.all(activeSelected.map((c) => adminService.deactivateCoupon(c.id)))
      toast.success(`${activeSelected.length} coupon${activeSelected.length !== 1 ? 's' : ''} deactivated`)
      exitSelectMode()
      setShowBulkConfirm(false)
      await load()
    } catch {
      toast.error('Failed to deactivate some coupons')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-text-secondary">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''} &bull; {coupons.filter((c) => c.isActive).length} active</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setModal({ mode: 'create' })} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-text-inverse rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Create Coupon
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...coupons].sort((a, b) => a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1).map((c) => {
          const isSelected = selectedCoupons.has(c.id)
          return (
            <div
              key={c.id}
              onMouseDown={() => startLongPress(c.id)}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={() => startLongPress(c.id)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onClick={() => handleCardClick(c.id)}
              className={`bg-elevated rounded-2xl border-2 relative transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 flex flex-col overflow-hidden ${
                isSelected ? 'border-primary ring-2 ring-primary/20' : c.isActive ? 'border-border' : 'border-danger/30 opacity-70'
              } ${selectMode ? 'cursor-pointer' : ''}`}
            >
              {!c.isActive && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-danger text-text-inverse text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Inactive
                </div>
              )}

              {/* Header gradient */}
              <div className={`px-6 pt-6 pb-4 ${c.isActive ? 'bg-gradient-to-br from-primary/10 via-transparent to-transparent' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">{c.code}</h3>
                    <p className="text-sm text-text-muted mt-1">{c.description || 'No description'}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-text-primary">
                        {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `$${c.discountValue.toFixed(2)}`}
                      </span>
                      <span className="text-text-muted text-xs">off</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectMode && c.isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(c.id) }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-primary border-primary' : 'border-border hover:border-primary'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-text-inverse" />}
                      </button>
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.isActive ? 'bg-primary/15' : 'bg-hover'}`}>
                      <Sparkles className={`w-5 h-5 ${c.isActive ? 'text-primary' : 'text-text-muted'}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Details section */}
              <div className="px-6 pb-6 flex-1">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 mt-2">Usage</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center shrink-0">
                      <Zap className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                    <span className="text-text-secondary">Used</span>
                    <span className="ml-auto text-text-primary font-medium tabular-nums">
                      {c.usedCount}{c.maxUsage ? ` / ${c.maxUsage}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                    <span className="text-text-secondary">Expires</span>
                    <span className="ml-auto text-text-primary font-medium tabular-nums">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : <span className="text-text-muted font-normal">Never</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center shrink-0">
                      <Shield className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                    <span className="text-text-secondary">Discount</span>
                    <span className="ml-auto text-text-primary font-medium tabular-nums">
                      {c.discountType === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {!selectMode && (
                <div className="px-6 pb-5 flex items-center gap-2 border-t border-border/50 pt-4">
                  {c.isActive && (
                    <button onClick={(e) => { e.stopPropagation(); setModal({ mode: 'edit', coupon: c }) }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary hover:text-primary-light hover:bg-primary/10 rounded-lg transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  )}
                  {c.isActive && (
                    <button onClick={(e) => { e.stopPropagation(); adminService.deactivateCoupon(c.id).then(() => load()) }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                      Deactivate
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-text-primary">Deactivate Coupons</h2>
            <p className="text-sm text-text-secondary mt-2">
              Deactivate <strong>{selectedCoupons.size}</strong> coupon{selectedCoupons.size !== 1 ? 's' : ''}?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowBulkConfirm(false)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={handleBulkDeactivate} disabled={bulkLoading} className="px-4 py-2 bg-danger text-text-inverse rounded-lg text-sm font-medium hover:bg-danger/80 transition-colors disabled:opacity-50">
                {bulkLoading ? 'Deactivating...' : `Deactivate ${selectedCoupons.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {!showBulkConfirm && (
        <SelectionBar
          count={selectedCoupons.size}
          onDelete={() => setShowBulkConfirm(true)}
          onCancel={exitSelectMode}
          allSelected={selectedCoupons.size === coupons.filter((c) => c.isActive).length}
          onToggleSelectAll={toggleSelectAll}
        />
      )}

      {modal && (
        <CouponModal
          mode={modal.mode}
          coupon={modal.coupon}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            try {
              if (modal.mode === 'create') await adminService.createCoupon(data)
              else if (modal.coupon) await adminService.updateCoupon(modal.coupon.id, data)
            } catch {}
            setModal(null)
            load()
          }}
        />
      )}
    </div>
  )
}

type CouponFormData = {
  code: string
  description?: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  maxUsage?: number | null
  expiresAt?: string | null
}

function CouponModal({ mode, coupon, onClose, onSave }: {
  mode: 'create' | 'edit'
  coupon?: AdminCoupon
  onClose: () => void
  onSave: (data: CouponFormData) => Promise<void>
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState({
    code: coupon?.code ?? '',
    description: coupon?.description ?? '',
    discountType: coupon?.discountType ?? 'PERCENTAGE',
    discountValue: coupon?.discountValue ?? '',
    maxUsage: coupon?.maxUsage ?? null,
    expiresAt: coupon?.expiresAt ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!form.code.trim()) newErrors.code = 'Code is required'
    if (!form.discountValue || form.discountValue <= 0) newErrors.discountValue = 'Value must be greater than 0'
    else if (form.discountType === 'PERCENTAGE' && form.discountValue > 100) newErrors.discountValue = 'Percentage cannot exceed 100'
    if (Object.keys(newErrors).length) { setErrors(newErrors); scrollRef.current?.scrollTo(0,0); return }
    setErrors({})
    setSaving(true)
    const data: CouponFormData = {
      ...form,
      expiresAt: form.expiresAt || null,
      maxUsage: form.maxUsage || null,
    }
    if (mode === 'edit') delete (data as Record<string, unknown>).code
    try {
      await onSave(data)
    } catch {
      setSaving(false)
    }
  }

  return (
    <div ref={scrollRef} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-20 overflow-y-auto" onClick={onClose}>
      <div className="bg-elevated rounded-2xl border border-border w-full max-w-lg my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{mode === 'create' ? 'Create Coupon' : 'Edit Coupon'}</h2>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} error={errors.code} disabled={mode === 'edit'} />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Discount Type" value={form.discountType} onChange={(v) => setForm({ ...form, discountType: v as 'PERCENTAGE' | 'FIXED' })} options={[
              { value: 'PERCENTAGE', label: 'Percentage' },
              { value: 'FIXED', label: 'Fixed' },
            ]} />
            <Input label="Value" type="number" step="0.01" min={form.discountType === 'PERCENTAGE' ? 1 : 0} max={form.discountType === 'PERCENTAGE' ? 100 : undefined} value={form.discountValue} onChange={(e) => {
              const raw = e.target.value
              if (raw === '') { setForm({ ...form, discountValue: '' }); return }
              const val = parseFloat(raw) || 0
              if (form.discountType === 'PERCENTAGE' && val > 100) return
              setForm({ ...form, discountValue: val })
            }} error={errors.discountValue} startAdornment={form.discountType === 'FIXED' ? <span className="text-text-muted">$</span> : undefined} endAdornment={form.discountType === 'PERCENTAGE' ? <span className="text-text-muted">%</span> : undefined} />
          </div>
          <Input label="Max Uses" type="number" value={form.maxUsage ?? ''} onChange={(e) => setForm({ ...form, maxUsage: e.target.value ? parseInt(e.target.value) : null })} />
          <DateTimePicker label="Expires At" value={form.expiresAt || undefined} onChange={(iso) => setForm({ ...form, expiresAt: iso })} disableFuture={false} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-text-inverse rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all disabled:opacity-50">
              {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ActivityLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')

  async function load(pageNum: number, filter?: string) {
    setIsLoading(true)
    try {
      const params: { action?: string } = {}
      if (filter) params.action = filter
      const result = await adminService.listAuditLogs(pageNum, 30, params)
      setLogs(result.logs)
      setTotalPages(result.totalPages)
      setPage(pageNum)
    } catch {}
    setIsLoading(false)
  }

  useEffect(() => { load(1, actionFilter) }, [actionFilter])

  const actions = Object.keys(ACTION_LABELS)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select
          value={actionFilter}
          onChange={setActionFilter}
          options={[
            { value: '', label: 'All actions' },
            ...actions.map((a) => ({ value: a, label: ACTION_LABELS[a] })),
          ]}
          placeholder="All actions"
          className="text-sm py-2"
        />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sidebar/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Target</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">No activity found</td></tr>
            ) : logs.map((l) => (
              <tr key={l.id} className="hover:bg-hover">
                <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-text-primary font-medium">{l.user.fullName}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary-light">
                    {ACTION_LABELS[l.action] || l.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-secondary">{l.targetType}</td>
                <td className="px-4 py-3 text-text-secondary text-xs max-w-xs truncate">
                  {l.metadata ? JSON.stringify(l.metadata) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => load(p)}
              className={`px-3 py-1 text-sm rounded-md ${p === page ? 'bg-primary text-text-primary' : 'bg-card text-text-secondary hover:text-text-primary'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


