import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Shield, X, Plus, Search, User, Mail, Calendar, Activity, Zap, Clock, ChevronRight, CreditCard, Sparkles, Check, Pencil, Trash2, FileText, Image, Tags, Trophy, Brain, CalendarCheck, AlertTriangle, ChevronDown, RefreshCw } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import * as adminService from '../services/admin'
import type { AdminUser, AdminPlan, AdminTrade, AdminCoupon, AuditLogEntry, AdminPlatform, AdminPropFirm, AdminPropFirmInput, AdminPropFirmPlan, AdminPropFirmPrice, AdminRuleRow } from '../services/admin'
import { Input } from '../components/ui/Input'
import toast from 'react-hot-toast'
import { Select } from '../components/ui/Select'
import { SelectionBar } from '../components/ui/SelectionBar'
import { DateTimePicker } from '../components/ui/DateTimePicker'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { getCurrencySymbol, SUPPORTED_CURRENCIES } from '../lib/currency'

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
  PLATFORM_CREATED: 'Platform Created',
  PLATFORM_EDITED: 'Platform Edited',
  PLATFORM_DELETED: 'Platform Deleted',
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

  const [tab, setTab] = useState<'users' | 'plans' | 'trades' | 'platforms' | 'coupons' | 'propFirms' | 'activity'>('users')
  const [planModal, setPlanModal] = useState<{ mode: 'create' | 'edit'; plan?: AdminPlan } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'user' | 'plan'; id: string; name: string } | null>(null)

  const tabs = [
    { key: 'users' as const, label: 'Users' },
    { key: 'plans' as const, label: 'Plans' },
    { key: 'trades' as const, label: 'Trades' },
    { key: 'activity' as const, label: 'Activity Log' },
    ...(isAdmin ? [{ key: 'platforms' as const, label: 'Platforms' }] : []),
    ...(isAdmin ? [{ key: 'coupons' as const, label: 'Coupons' }] : []),
    ...(isAdmin ? [{ key: 'propFirms' as const, label: 'Prop Firms' }] : []),
  ]

  async function loadCore() {
    try {
      const [u, p] = await Promise.all([
        adminService.listUsers(1, 50),
        adminService.listPlans(),
      ])
      setUsers(u.users)
      setPlans(p)
    } catch {}
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

          <div className={tab === 'users' ? '' : 'hidden'}>
            <UsersTab
              users={users}
              plans={plans}
              isAdmin={isAdmin}
              onUpdate={async (id, data) => { await adminService.updateUser(id, data); refreshCore() }}
              onChangePlan={isAdmin ? async (id, planId) => { await adminService.changeUserPlan(id, planId); refreshCore() } : undefined}
              onRefresh={refreshCore}
            />
          </div>

          <div className={tab === 'plans' ? '' : 'hidden'}>
            <PlansTab
              plans={plans}
              onCreate={isAdmin ? () => setPlanModal({ mode: 'create' }) : undefined}
              onEdit={isAdmin ? (plan) => setPlanModal({ mode: 'edit', plan }) : undefined}
              onDelete={isAdmin ? (id, name) => setConfirmDelete({ type: 'plan', id, name }) : undefined}
              onRefresh={refreshCore}
            />
          </div>

          <div className={tab === 'trades' ? '' : 'hidden'}><AdminTradesTab /></div>

          {isAdmin && <div className={tab === 'platforms' ? '' : 'hidden'}><ErrorBoundary><PlatformsTab /></ErrorBoundary></div>}
          {isAdmin && <div className={tab === 'coupons' ? '' : 'hidden'}><CouponsTab /></div>}
          {isAdmin && <div className={tab === 'propFirms' ? '' : 'hidden'}><ErrorBoundary><PropFirmsTab /></ErrorBoundary></div>}
          <div className={tab === 'activity' ? '' : 'hidden'}><ActivityLogTab /></div>
        </>

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

function Dropdown({ value, options, onChange, small }: {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  small?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 120 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node) &&
          menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  const selected = options.find(o => o.value === value)
  return (
    <>
      <button ref={btnRef} type="button" onClick={() => {
        const r = btnRef.current!.getBoundingClientRect()
        setPos({ top: r.bottom + 6, left: r.left, width: r.width })
        setOpen(o => !o)
      }}
        className={`flex items-center gap-1.5 ${small ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'} rounded-lg border border-border/80 bg-input/60 backdrop-blur-sm transition-all duration-200 hover:border-primary/40 ${open ? 'border-primary shadow-[0_0_0_2px_rgba(79,70,229,0.12)]' : ''}`}>
        <span className="text-text-primary">{selected ? selected.label : value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div ref={menuRef} style={{ position: 'fixed', top: pos.top, left: pos.left - 1, minWidth: Math.max(pos.width + 6, 130), zIndex: 9999 }}
          className="bg-elevated border border-border rounded-xl shadow-2xl shadow-black/30 py-1 overflow-hidden">
          {options.map((opt) => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3.5 py-2.5 ${small ? 'text-xs' : 'text-sm'} transition-colors ${opt.value === value ? 'bg-primary/15 text-primary-light font-semibold' : 'text-text-secondary hover:bg-card'}`}>
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
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
    if (!onChangePlan) return
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
        <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
          <Dropdown value={role} options={roleOptions.map(r => ({ value: r, label: r }))} onChange={(v) => setConfirmChange(v)} small />
        </td>
        {isAdmin && (
          <td className="px-4 py-3 relative" onClick={(e) => e.stopPropagation()}>
            <Dropdown value={planId} options={[
              ...plans.filter((p) => p.isActive).map(p => ({ value: p.id, label: p.name }))
            ]} onChange={(v) => { setPendingPlanId(v); setConfirmPlan(true) }} small />
          </td>
        )}
        <td className="px-4 py-3 text-text-secondary">{u._count.trades}</td>
        <td className="px-4 py-3 text-text-muted text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={() => setConfirmToggle(true)} className="sr-only peer" />
            <div className="w-9 h-5 bg-hover rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
        </td>
      </tr>

      {confirmChange && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-sm p-6 mx-4">
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
        </div>,
        document.body
      )}

      {confirmToggle && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-sm p-6 mx-4">
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
        </div>,
        document.body
      )}

      {confirmPlan && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-sm p-6 mx-4">
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
        </div>,
        document.body
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
      <div className="bg-elevated rounded-2xl ring-1 ring-border w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
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

        <div className="flex-1 overflow-y-auto scrollbar-thin">
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
  const [defaultCurrency, setDefaultCurrency] = useState('INR')
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const currencyRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTarget = useRef<string | null>(null)
  const wasLongPress = useRef(false)

  useEffect(() => {
    if (selectMode && selectedPlans.size === 0) {
      setSelectMode(false)
    }
  }, [selectedPlans, selectMode])

  useEffect(() => {
    adminService.listSettings().then((settings) => {
      const c = settings.find((s) => s.key === 'default_currency')
      if (c) setDefaultCurrency(c.value)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setCurrencyOpen(false)
    }
    if (currencyOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [currencyOpen])

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
          <div className="relative" ref={currencyRef}>
            <button type="button" onClick={() => setCurrencyOpen(!currencyOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-border/80 bg-input/60 hover:border-primary/40 transition-all">
              <span className="text-text-muted text-xs">Currency:</span>
              <span className="font-medium text-text-primary">{getCurrencySymbol(defaultCurrency)}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${currencyOpen ? 'rotate-180' : ''}`} />
            </button>
            {currencyOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-elevated border border-border/50 rounded-xl shadow-2xl py-1 w-36">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <button key={c} type="button"
                    onClick={async () => {
                      setDefaultCurrency(c)
                      setCurrencyOpen(false)
                      await adminService.updateSetting('default_currency', c)
                      onRefresh?.()
                    }}
                    className={`w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center gap-2 ${
                      c === defaultCurrency ? 'bg-primary/15 text-primary-light' : 'text-text-secondary hover:bg-card'
                    }`}>
                    <span className="w-5 text-center">{getCurrencySymbol(c)}</span>
                    <span>{c}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
                      <span className="text-3xl font-bold text-text-primary">{getCurrencySymbol(plan.currency)}{plan.price.toFixed(2)}</span>
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
    if (form.price === '' || Number(form.price) <= 0) newErrors.price = 'Price must be greater than 0'
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
            <Input label="Price" type="number" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)} error={errors.price} endAdornment={<span className="text-text-muted">{getCurrencySymbol('INR')}</span>} />
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
  const [search, setSearch] = useState('')

  async function load(pageNum: number) {
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      const result = await adminService.listAllTrades(pageNum, 20, params)
      setTrades(result.trades)
      setTotalPages(result.totalPages)
      setPage(pageNum)
    } catch {}
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
            {trades.length === 0 ? (
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


function PlatformsTab() {
  const [platforms, setPlatforms] = useState<AdminPlatform[]>([])
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; platform?: AdminPlatform } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminPlatform | null>(null)

  async function load() {
    try {
      const p = await adminService.listPlatforms()
      setPlatforms(p)
    } catch {}
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{platforms.length} platform{platforms.length !== 1 ? 's' : ''} &bull; {platforms.filter((p) => p.isActive).length} active</p>
        <button onClick={() => setModal({ mode: 'create' })} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-text-inverse rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          Add Platform
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sidebar/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Market Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {platforms.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">No platforms found</td></tr>
            ) : platforms.map((p) => (
              <tr key={p.id} className="hover:bg-hover">
                <td className="px-4 py-3 font-medium text-text-primary">{p.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    p.marketType === 'FUTURES' ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'
                  }`}>
                    {p.marketType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={p.isActive} onChange={(e) => {
                      e.stopPropagation()
                      const prev = p.isActive
                      setPlatforms((prevList) => prevList.map((x) => x.id === p.id ? { ...x, isActive: !prev } : x))
                      adminService.updatePlatform(p.id, { isActive: !prev }).catch(() => {
                        setPlatforms((prevList) => prevList.map((x) => x.id === p.id ? { ...x, isActive: prev } : x))
                      })
                    }} className="sr-only peer" />
                    <div className="w-9 h-5 bg-hover rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setModal({ mode: 'edit', platform: p })} className="p-1.5 text-text-muted hover:text-primary-light hover:bg-primary/10 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(p)} className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <PlatformModal
          mode={modal.mode}
          platform={modal.platform}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            try {
              if (modal.mode === 'create') await adminService.createPlatform(data)
              else if (modal.platform) await adminService.updatePlatform(modal.platform.id, data)
              setModal(null)
              load()
            } catch (err: any) {
              const errorObj = err?.response?.data?.error
              const msg = typeof errorObj === 'string' ? errorObj : (errorObj?.message || err?.message || 'Failed to save platform')
              toast.error(msg)
            }
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-text-primary">Delete Platform</h2>
            <p className="text-sm text-text-secondary mt-2">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={async () => {
                await adminService.deletePlatform(confirmDelete.id)
                setConfirmDelete(null)
                load()
              }} className="px-4 py-2 bg-danger text-text-inverse rounded-lg text-sm font-medium hover:bg-danger/80 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlatformModal({ mode, platform, onClose, onSave }: {
  mode: 'create' | 'edit'
  platform?: AdminPlatform
  onClose: () => void
  onSave: (data: { name: string; marketType: string }) => Promise<void>
}) {
  const [name, setName] = useState(platform?.name ?? '')
  const [marketType, setMarketType] = useState(platform?.marketType ?? 'FOREX')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Name is required'
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }
    setErrors({})
    setSaving(true)
    await onSave({ name: name.trim(), marketType })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-elevated rounded-2xl border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{mode === 'create' ? 'Add Platform' : 'Edit Platform'}</h2>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g., FTMO" />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">Market Type</label>
            <div className="flex gap-2">
              {(['FOREX', 'FUTURES'] as const).map((type) => (
                <button key={type} type="button" onClick={() => setMarketType(type)}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                    marketType === type
                      ? type === 'FOREX' ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                      : 'bg-input border-border text-text-secondary hover:bg-hover'
                  }`}>
                  {type === 'FOREX' ? 'Forex' : 'Futures'}
                </button>
              ))}
            </div>
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
    if (!form.discountValue || Number(form.discountValue) <= 0) newErrors.discountValue = 'Value must be greater than 0'
    else if (form.discountType === 'PERCENTAGE' && Number(form.discountValue) > 100) newErrors.discountValue = 'Percentage cannot exceed 100'
    if (Object.keys(newErrors).length) { setErrors(newErrors); scrollRef.current?.scrollTo(0,0); return }
    setErrors({})
    setSaving(true)
    const data: CouponFormData = {
      ...form,
      discountValue: Number(form.discountValue),
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
  const [actionFilter, setActionFilter] = useState('')

  async function load(pageNum: number, filter?: string) {
    try {
      const params: { action?: string } = {}
      if (filter) params.action = filter
      const result = await adminService.listAuditLogs(pageNum, 30, params)
      setLogs(result.logs)
      setTotalPages(result.totalPages)
      setPage(pageNum)
    } catch {}
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
            {logs.length === 0 ? (
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

function PropFirmsTab() {
  const [firms, setFirms] = useState<AdminPropFirm[]>([])
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; firm?: AdminPropFirm } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminPropFirm | null>(null)
  const [scanning, setScanning] = useState(false)

  async function load() {
    try {
      const p = await adminService.listPropFirms()
      setFirms(p)
    } catch {}
  }

  useEffect(() => { load() }, [])

  function toggleFlag(firm: AdminPropFirm, key: 'isFeatured' | 'isActive' | 'dailyPayouts' | 'noActivationFee' | 'oneTimeFee' | 'instantFunding') {
    const prev = firm[key] as boolean
    setFirms((prevList) => prevList.map((x) => x.id === firm.id ? { ...x, [key]: !prev } : x))
    adminService.updatePropFirm(firm.id, { [key]: !prev }).catch(() => {
      setFirms((prevList) => prevList.map((x) => x.id === firm.id ? { ...x, [key]: prev } : x))
    })
  }

  function toggleAutomation(firm: AdminPropFirm) {
    const next = firm.codeStatus === 'MANUAL' ? 'OK' : 'MANUAL'
    setFirms((prevList) => prevList.map((x) => x.id === firm.id ? { ...x, codeStatus: next } : x))
    adminService.updatePropFirm(firm.id, { codeStatus: next }).catch(() => load())
  }

  async function scanNow() {
    setScanning(true)
    try {
      const result = await adminService.scanPropFirms()
      toast.success(`Scan done — ${result.ok} verified, ${result.stale} stale, ${result.changed} changed`)
      load()
    } catch (err: any) {
      const errorObj = err?.response?.data?.error
      toast.error(typeof errorObj === 'string' ? errorObj : (errorObj?.message || err?.message || 'Failed to scan prop firms'))
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-text-secondary">
          {firms.length} firms &bull; {firms.filter((f) => f.isFeatured).length} featured &bull; {firms.filter((f) => f.codeStatus === 'OK').length} auto-tracked
        </p>
        <div className="flex items-center gap-2">
          <button onClick={scanNow} disabled={scanning} className="flex items-center gap-2 px-4 py-2.5 bg-input border border-border text-text-primary rounded-xl text-sm font-semibold hover:border-primary/40 transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning…' : 'Scan Codes Now'}
          </button>
          <button onClick={() => setModal({ mode: 'create' })} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-text-inverse rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Add Prop Firm
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-sidebar/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Firm</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Rating</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Discount / Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Auto-Track</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Country</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Featured</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {firms.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-text-muted">No prop firms found</td></tr>
            ) : firms.map((f) => (
              <tr key={f.id} className="hover:bg-hover">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-text-inverse text-xs font-bold" style={{ backgroundColor: f.logoColor }}>
                      {f.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">{f.name}</div>
                      <div className="text-xs text-text-muted">{f.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-secondary">⭐ {f.rating}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      {f.discountPercent > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-500/10 text-green-400">{f.discountPercent}%</span>
                      )}
                      {f.promoCode && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary-light">{f.promoCode}</span>}
                    </div>
                    {f.codeStatus !== 'MANUAL' && (
                      <span className={`text-[10px] font-medium ${f.codeStatus === 'OK' ? 'text-green-400' : 'text-amber-400'}`}>
                        {f.codeStatus === 'OK' && f.lastCodeCheckAt ? `Verified ${new Date(f.lastCodeCheckAt).toLocaleString()}` : 'Re-checking…'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <label className="relative inline-flex items-center cursor-pointer" title={f.codeStatus === 'MANUAL' ? 'Automation off — code set manually' : 'Automation on — code re-verified every 6h'}>
                    <input type="checkbox" checked={f.codeStatus !== 'MANUAL'} onChange={() => toggleAutomation(f)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-hover rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                </td>
                <td className="px-4 py-3 text-text-secondary">{f.country}</td>
                <td className="px-4 py-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={f.isFeatured} onChange={() => toggleFlag(f, 'isFeatured')} className="sr-only peer" />
                    <div className="w-9 h-5 bg-hover rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                </td>
                <td className="px-4 py-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={f.isActive} onChange={(e) => { e.stopPropagation(); toggleFlag(f, 'isActive') }} className="sr-only peer" />
                    <div className="w-9 h-5 bg-hover rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setModal({ mode: 'edit', firm: f })} className="p-1.5 text-text-muted hover:text-primary-light hover:bg-primary/10 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(f)} className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <PropFirmModal
          mode={modal.mode}
          firm={modal.firm}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            try {
              if (modal.mode === 'create') await adminService.createPropFirm(data)
              else if (modal.firm) await adminService.updatePropFirm(modal.firm.id, data)
              setModal(null)
              load()
            } catch (err: any) {
              const errorObj = err?.response?.data?.error
              const msg = typeof errorObj === 'string' ? errorObj : (errorObj?.message || err?.message || 'Failed to save prop firm')
              toast.error(msg)
            }
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-text-primary">Delete Prop Firm</h2>
            <p className="text-sm text-text-secondary mt-2">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={async () => {
                try {
                  await adminService.deletePropFirm(confirmDelete.id)
                  setConfirmDelete(null)
                  load()
                } catch (err: any) {
                  const errorObj = err?.response?.data?.error
                  const msg = typeof errorObj === 'string' ? errorObj : (errorObj?.message || err?.message || 'Failed to delete prop firm')
                  toast.error(msg)
                }
              }} className="px-4 py-2 bg-danger text-text-inverse rounded-lg text-sm font-medium hover:bg-danger/80 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RuleSetEditor({ title, rules, onChange }: {
  title: string
  rules: AdminRuleRow[]
  onChange: (rules: AdminRuleRow[]) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{title}</span>
        <button type="button" onClick={() => onChange([...rules, { label: '', value: '' }])} className="flex items-center gap-1 text-[11px] text-primary-light hover:bg-primary/10 rounded px-1.5 py-0.5 transition-colors">
          <Plus className="w-3 h-3" /> Add row
        </button>
      </div>
      {rules.map((rule, ri) => (
        <div key={ri} className="flex items-center gap-2">
          <input value={rule.label} onChange={(e) => onChange(rules.map((x, i) => i === ri ? { ...x, label: e.target.value } : x))} placeholder="Label (e.g. Profit target)" className="w-40 bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <input value={rule.value} onChange={(e) => onChange(rules.map((x, i) => i === ri ? { ...x, value: e.target.value } : x))} placeholder="Value (e.g. $5,000)" className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40" />
          <button type="button" onClick={() => onChange(rules.filter((_, i) => i !== ri))} className="p-2 text-text-muted hover:text-danger"><X className="w-4 h-4" /></button>
        </div>
      ))}
      {rules.length === 0 && <p className="text-xs text-text-muted">No rows — add the rules shown on the firm's page.</p>}
    </div>
  )
}

function PropFirmModal({ mode, firm, onClose, onSave }: {
  mode: 'create' | 'edit'
  firm?: AdminPropFirm
  onClose: () => void
  onSave: (data: AdminPropFirmInput) => Promise<void>
}) {
  const [name, setName] = useState(firm?.name ?? '')
  const [slug, setSlug] = useState(firm?.slug ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(firm?.websiteUrl ?? '')
  const [description, setDescription] = useState(firm?.description ?? '')
  const [rating, setRating] = useState(firm?.rating ?? 4.5)
  const [country, setCountry] = useState(firm?.country ?? 'United States')
  const [instruments, setInstruments] = useState(firm?.instruments ?? '')
  const [profitSplit, setProfitSplit] = useState(firm?.profitSplit ?? 80)
  const [payoutSpeed, setPayoutSpeed] = useState(firm?.payoutSpeed ?? '')
  const [logoColor, setLogoColor] = useState(firm?.logoColor ?? '#2563eb')
  const [discountPercent, setDiscountPercent] = useState(firm?.discountPercent ?? 0)
  const [promoCode, setPromoCode] = useState(firm?.promoCode ?? '')
  const [promoSourceUrl, setPromoSourceUrl] = useState(firm?.promoSourceUrl ?? '')
  const [dealEndsAt, setDealEndsAt] = useState(() => {
    if (!firm?.dealEndsAt) return ''
    const d = new Date(firm.dealEndsAt)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [codeStatus, setCodeStatus] = useState(firm?.codeStatus ?? 'MANUAL')
  const [rulesSourceUrl, setRulesSourceUrl] = useState(firm?.rulesSourceUrl ?? '')
  const [rulesStatus, setRulesStatus] = useState(firm?.rulesStatus ?? 'MANUAL')
  const [openRules, setOpenRules] = useState<Record<string, boolean>>({})
  const [plans, setPlans] = useState<AdminPropFirmPlan[]>(firm?.accountPrices ?? [])
  const [dailyPayouts, setDailyPayouts] = useState(firm?.dailyPayouts ?? false)
  const [noActivationFee, setNoActivationFee] = useState(firm?.noActivationFee ?? false)
  const [oneTimeFee, setOneTimeFee] = useState(firm?.oneTimeFee ?? false)
  const [instantFunding, setInstantFunding] = useState(firm?.instantFunding ?? false)
  const [isFeatured, setIsFeatured] = useState(firm?.isFeatured ?? false)
  const [isActive, setIsActive] = useState(firm?.isActive ?? true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function slugify(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = 'Name is required'
    if (!slug.trim()) newErrors.slug = 'Slug is required'
    if (!websiteUrl.trim()) newErrors.websiteUrl = 'Website URL is required'
    if (Object.keys(newErrors).length) { setErrors(newErrors); return }
    setErrors({})
    setSaving(true)
    await onSave({
      name: name.trim(),
      slug: slugify(slug),
      websiteUrl: websiteUrl.trim(),
      description: description.trim() || null,
      rating: Number(rating) || 0,
      country: country.trim() || 'United States',
      instruments: instruments.trim(),
      profitSplit: Number(profitSplit) || 0,
      payoutSpeed: payoutSpeed.trim(),
      logoColor,
      discountPercent: Number(discountPercent) || 0,
      promoCode: promoCode.trim() || null,
      promoSourceUrl: promoSourceUrl.trim() || null,
      dealEndsAt: dealEndsAt ? new Date(dealEndsAt).toISOString() : null,
      codeStatus,
      rulesSourceUrl: rulesSourceUrl.trim() || null,
      rulesStatus,
      accountPrices: plans.length ? plans : null,
      dailyPayouts,
      noActivationFee,
      oneTimeFee,
      instantFunding,
      isFeatured,
      isActive,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-elevated rounded-2xl border border-border w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">{mode === 'create' ? 'Add Prop Firm' : 'Edit Prop Firm'}</h2>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); if (mode === 'create' && !firm) setSlug(slugify(e.target.value)) }} error={errors.name} placeholder="e.g., Tradeify" />
            <Input label="Slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} error={errors.slug} placeholder="tradeify" />
          </div>
          <Input label="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} error={errors.websiteUrl} placeholder="https://www.tradeify.com" />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-secondary">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input label="Rating" type="number" step="0.1" min="0" max="5" value={String(rating)} onChange={(e) => setRating(parseFloat(e.target.value))} placeholder="4.5" />
            <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
            <Input label="Instruments" value={instruments} onChange={(e) => setInstruments(e.target.value)} placeholder="Futures" />
            <Input label="Profit Split %" type="number" min="0" max="100" value={String(profitSplit)} onChange={(e) => setProfitSplit(parseInt(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input label="Payout Speed" value={payoutSpeed} onChange={(e) => setPayoutSpeed(e.target.value)} placeholder="14 days" />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-secondary">Logo Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={logoColor} onChange={(e) => setLogoColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-input border border-border" />
                <input value={logoColor} onChange={(e) => setLogoColor(e.target.value)} className="w-full bg-input border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <Input label="Discount %" type="number" min="0" max="100" value={String(discountPercent)} onChange={(e) => setDiscountPercent(parseInt(e.target.value))} />
            <Input label="Promo Code" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="TAKE45" />
          </div>
          <Input label="Promo Source URL (scanner watches this page)" value={promoSourceUrl} onChange={(e) => setPromoSourceUrl(e.target.value)} placeholder="https://firm.com/promo" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Deal Ends At (leave empty to clear)" type="datetime-local" value={dealEndsAt} onChange={(e) => setDealEndsAt(e.target.value)} />
            <div className="flex items-end">
              <button type="button" onClick={() => setDealEndsAt('')} className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-secondary hover:text-text-primary">Clear Deal End</button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Select
              label="Code Automation"
              value={codeStatus}
              onChange={setCodeStatus}
              options={[
                { value: 'OK', label: 'Auto-track (re-verified every 6h)' },
                { value: 'MANUAL', label: 'Manual (scanner skips this firm)' },
                { value: 'STALE', label: 'Stale (keep last known until scan succeeds)' },
              ]}
            />
            <p className="text-xs text-text-muted">When auto-tracking is on and the firm's code changes on its site, this site updates itself automatically.</p>
          </div>
          <Input label="Rules Source URL (scanner watches this page)" value={rulesSourceUrl} onChange={(e) => setRulesSourceUrl(e.target.value)} placeholder="https://firm.com/rules" />
          <div className="space-y-1.5">
            <Select
              label="Rules Automation"
              value={rulesStatus}
              onChange={setRulesStatus}
              options={[
                { value: 'OK', label: 'Auto-track (re-verified every 6h)' },
                { value: 'MANUAL', label: 'Manual (scanner skips this firm)' },
                { value: 'STALE', label: 'Stale (keep last known until scan succeeds)' },
              ]}
            />
            <p className="text-xs text-text-muted">The scanner reads the firm's rules tables and updates every size automatically. If it can't parse the page, it keeps the last known rules and flags STALE.</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text-secondary">Account Plans & Sizes</label>
              <button type="button" onClick={() => setPlans([...plans, { plan: '', sizes: [{ size: '', price: 0, discounted: 0 }] }])} className="flex items-center gap-1.5 text-sm text-primary-light hover:bg-primary/10 rounded-lg px-2 py-1 transition-colors">
                <Plus className="w-4 h-4" /> Add plan
              </button>
            </div>
            {plans.length === 0 && (
              <p className="text-xs text-text-muted">No plans yet — add an account plan (e.g. "2-Step Evaluation") with its sizes and prices.</p>
            )}
            {plans.map((pl, pi) => (
              <div key={pi} className="rounded-xl border border-border bg-input/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input value={pl.plan} onChange={(e) => setPlans(plans.map((x, j) => j === pi ? { ...x, plan: e.target.value } : x))} placeholder="Plan name (e.g. 2-Step Evaluation)" className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  <button type="button" onClick={() => setPlans(plans.filter((_, j) => j !== pi))} className="p-2 text-text-muted hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                </div>
                <input value={pl.planDesc ?? ''} onChange={(e) => setPlans(plans.map((x, j) => j === pi ? { ...x, planDesc: e.target.value } : x))} placeholder="One-line description shown under the plan (e.g. 1-step, 90% split, no daily loss)" className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40" />
                {pl.sizes.map((s, si) => {
                  const openKey = `${pi}:${si}`
                  const patchSize = (patch: Partial<AdminPropFirmPrice>) =>
                    setPlans(plans.map((x, j) => j === pi ? { ...x, sizes: x.sizes.map((y, k) => k === si ? { ...y, ...patch } : y) } : x))
                  const patchRules = (kind: 'evalRules' | 'fundedRules', rules: AdminRuleRow[]) =>
                    patchSize({ [kind]: rules } as Partial<AdminPropFirmPrice>)
                  return (
                    <div key={si} className="rounded-lg border border-border bg-elevated/50 p-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <input value={s.size} onChange={(e) => patchSize({ size: e.target.value })} placeholder="50k" className="w-20 bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        <input type="number" value={String(s.price)} onChange={(e) => patchSize({ price: parseInt(e.target.value) })} placeholder="145" className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        <input type="number" value={String(s.discounted)} onChange={(e) => patchSize({ discounted: parseInt(e.target.value) })} placeholder="87" className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40" />
                        <button type="button" onClick={() => setPlans(plans.map((x, j) => j === pi ? { ...x, sizes: x.sizes.filter((_, k) => k !== si) } : x))} className="p-2 text-text-muted hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setOpenRules({ ...openRules, [openKey]: !openRules[openKey] })} className={`p-2 transition-all ${openRules[openKey] ? 'text-primary rotate-180' : 'text-text-muted hover:text-text-primary'}`} title="Edit rules"><ChevronDown className="w-4 h-4" /></button>
                      </div>
                      {openRules[openKey] && (
                        <div className="space-y-3 pt-1">
                          <RuleSetEditor
                            title="Evaluation Rules"
                            rules={s.evalRules ?? []}
                            onChange={(rules) => patchRules('evalRules', rules)}
                          />
                          <RuleSetEditor
                            title="Funded Account Rules"
                            rules={s.fundedRules ?? []}
                            onChange={(rules) => patchRules('fundedRules', rules)}
                          />
                          <p className="text-[11px] text-text-muted">Shown on the public page for this exact size. When rules automation is auto-track, the scanner refreshes these from the firm's site every 6h.</p>
                        </div>
                      )}
                    </div>
                  )
                })}
                <button type="button" onClick={() => setPlans(plans.map((x, j) => j === pi ? { ...x, sizes: [...x.sizes, { size: '', price: 0, discounted: 0 }] } : x))} className="flex items-center gap-1.5 text-xs text-primary-light hover:bg-primary/10 rounded-lg px-2 py-1 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add size
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ToggleRow label="Daily Payouts" value={dailyPayouts} onChange={setDailyPayouts} />
            <ToggleRow label="No Activation Fee" value={noActivationFee} onChange={setNoActivationFee} />
            <ToggleRow label="One-Time Fee" value={oneTimeFee} onChange={setOneTimeFee} />
            <ToggleRow label="Instant Funding" value={instantFunding} onChange={setInstantFunding} />
            <ToggleRow label="Featured" value={isFeatured} onChange={setIsFeatured} />
            <ToggleRow label="Active" value={isActive} onChange={setIsActive} />
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

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${value ? 'bg-primary/10 border-primary/30 text-text-primary' : 'bg-input border-border text-text-secondary hover:bg-hover'}`}>
      <span className="font-medium">{label}</span>
      <span className={`w-8 h-4.5 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-hover'}`} />
    </button>
  )
}


