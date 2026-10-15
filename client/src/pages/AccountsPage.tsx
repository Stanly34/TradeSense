import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Terminal, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { SelectionBar } from '../components/ui/SelectionBar'
import { UpgradeDialog } from '../components/ui/UpgradeDialog'
import { AccountCard } from '../components/accounts/AccountCard'
import { useCountUp } from '../hooks/useCountUp'
import { AccountDetailModal } from '../components/accounts/AccountDetailModal'
import { AccountFormModal } from '../components/accounts/AccountFormModal'
import { usePlan } from '../hooks/usePlan'
import * as accountService from '../services/accounts'
import * as propFirmService from '../services/propFirms'
import * as tradeService from '../services/trades'
import type { Account, ChallengeProgress } from '../services/accounts'
import type { PropFirm } from '../services/propFirms'
import { PageHeader } from '../components/ui/PageHeader'
import { cn } from '../lib/utils'
import { eventBus } from '../lib/eventBus'

const MARQUEE_DOT: Record<string, string> = {
  ACTIVE: 'bg-success',
  DAILY_PAUSED: 'bg-warning',
  PASSED: 'bg-sky-400',
  FAILED: 'bg-danger',
  FUNDED: 'bg-violet-400',
}

export function AccountsPage() {
  const { isPro, plan } = usePlan()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [firms, setFirms] = useState<PropFirm[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteWithTrades, setDeleteWithTrades] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteTarget, setBatchDeleteTarget] = useState(0)
  const [batchDeleteWithTrades, setBatchDeleteWithTrades] = useState(false)
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [progressMap, setProgressMap] = useState<Record<string, ChallengeProgress>>({})
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)

  const firmById = useMemo(() => new Map(firms.map((f) => [f.id, f])), [firms])

  function loadAccounts() {
    accountService.listAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]))
  }

  useEffect(() => {
    Promise.all([accountService.listAccounts(), propFirmService.listPropFirms()])
      .then(([a, f]) => { setAccounts(a); setFirms(f) })
      .catch(() => { setAccounts([]); setFirms([]) })
    const off = eventBus.on('accounts:changed', () => {
      accountService.listAccounts().then(setAccounts).catch(() => {})
    })
    const offPayouts = eventBus.on('payouts:changed', ({ accountId }) => {
      if (accountId) accountService.getChallengeProgress(accountId).then((p) => setProgressMap((prev) => ({ ...prev, [accountId]: p }))).catch(() => {})
    })
    const offTrades = eventBus.on('trades:changed', ({ accountId }) => {
      if (accountId) accountService.getChallengeProgress(accountId).then((p) => setProgressMap((prev) => ({ ...prev, [accountId]: p }))).catch(() => {})
    })
    return () => { off(); offPayouts(); offTrades() }
  }, [])

  useEffect(() => {
    const propAccounts = accounts.filter((a) => a.type === 'PROP_FIRM')
    if (propAccounts.length === 0) return
    propAccounts.forEach(async (a) => {
      try {
        const progress = await accountService.getChallengeProgress(a.id)
        setProgressMap((prev) => ({ ...prev, [a.id]: progress }))
      } catch {}
    })
  }, [accounts])

  useEffect(() => {
    if (!selectedAccount) return
    accountService.getChallengeProgress(selectedAccount.id)
      .then((progress) => setProgressMap((prev) => ({ ...prev, [selectedAccount.id]: progress })))
      .catch(() => {})
  }, [selectedAccount])

  function openCreateForm() {
    if (!isPro && accounts.length >= (plan?.accountLimit ?? 2)) {
      setShowUpgradeDialog(true)
      return
    }
    setEditAccount(null)
    setShowForm(true)
  }

  function openEditForm(account: Account) {
    if (account.type === 'PERSONAL_ACCOUNT') {
      toast('Personal accounts are managed from the detail view')
      return
    }
    setEditAccount(account)
    setShowForm(true)
  }

  async function handleSaved() {
    loadAccounts()
  }

  async function handleToggleFavorite(id: string) {
    try {
      const updated = await accountService.toggleFavorite(id)
      setAccounts((prev) => {
        const next = prev.map((p) => p.id === id ? { ...p, isFavorite: updated.isFavorite } : p)
        next.sort((a, b) => (a.isFavorite === b.isFavorite ? 0 : a.isFavorite ? -1 : 1))
        return next
      })
    } catch {}
  }

  function openDeleteDialog(id: string) {
    setDeleteTarget(id)
    setDeleteWithTrades(false)
    setShowDeleteDialog(true)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    try {
      if (deleteWithTrades) {
        const trades = await tradeService.listTrades({ accountId: deleteTarget, limit: 1000 })
        for (const t of trades.trades) {
          await tradeService.deleteTrade(t.id)
        }
      }
      await accountService.deleteAccount(deleteTarget)
      setAccounts((prev) => prev.filter((a) => a.id !== deleteTarget))
      setProgressMap((prev) => {
        const next = { ...prev }
        delete next[deleteTarget]
        return next
      })
      setSelectedAccount(null)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget)
        return next
      })
      toast.success('Account deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setShowDeleteDialog(false)
      setDeleteTarget(null)
    }
  }

  async function handleBatchDelete() {
    setBatchDeleteLoading(true)
    try {
      if (batchDeleteWithTrades) {
        for (const id of selectedIds) {
          const trades = await tradeService.listTrades({ accountId: id, limit: 1000 })
          for (const t of trades.trades) {
            await tradeService.deleteTrade(t.id)
          }
        }
      }
      await accountService.batchDeleteAccounts([...selectedIds])
      setAccounts((prev) => prev.filter((a) => !selectedIds.has(a.id)))
      setProgressMap((prev) => {
        const next = { ...prev }
        selectedIds.forEach((id) => delete next[id])
        return next
      })
      setSelectedIds(new Set())
      setSelecting(false)
      setBatchDeleteTarget(0)
      toast.success(`${selectedIds.size} account${selectedIds.size > 1 ? 's' : ''} deleted`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete accounts')
    } finally {
      setBatchDeleteLoading(false)
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
    if (next.size === 0) setSelecting(false)
  }

  const stats = useMemo(() => {
    let active = 0
    let funded = 0
    let paused = 0
    let failed = 0
    let totalBalance = 0
    let dayPnl = 0
    for (const a of accounts) {
      const p = progressMap[a.id]
      const status = p?.status ?? a.status ?? 'ACTIVE'
      if (a.type === 'PROP_FIRM') {
        if (status === 'ACTIVE') active++
        if (status === 'FUNDED') funded++
        if (status === 'DAILY_PAUSED') paused++
        if (status === 'FAILED') failed++
        totalBalance += p?.balance ?? (Number((a.defaultValues as Record<string, unknown>)?.currentAccountSize) || 0)
        if (p) dayPnl += p.dailyPnlToday
      } else {
        totalBalance += Number((a.defaultValues as Record<string, unknown>)?.currentAccountSize) || 0
      }
    }
    return { active, funded, paused, failed, totalBalance, dayPnl }
  }, [accounts, progressMap])

  const sortedAccounts = useMemo(
    () => [...accounts]
      .sort((a, b) => (a.isFavorite === b.isFavorite ? 0 : a.isFavorite ? -1 : 1))
      .sort((a, b) => {
        const sa = progressMap[a.id]?.status ?? a.status ?? 'ACTIVE'
        const sb = progressMap[b.id]?.status ?? b.status ?? 'ACTIVE'
        return (sa === 'FAILED' ? 1 : 0) - (sb === 'FAILED' ? 1 : 0)
      }),
    [accounts, progressMap]
  )

  const liveAccounts = useMemo(() => sortedAccounts.filter((a) => (progressMap[a.id]?.status ?? a.status ?? 'ACTIVE') !== 'FAILED'), [sortedAccounts, progressMap])
  const failedAccounts = useMemo(() => sortedAccounts.filter((a) => (progressMap[a.id]?.status ?? a.status ?? 'ACTIVE') === 'FAILED'), [sortedAccounts, progressMap])

  const heroEquity = useCountUp(stats.totalBalance, 1100)
  const marqueeItems = useMemo(
    () => sortedAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      status: (progressMap[a.id]?.status ?? a.status ?? 'ACTIVE') as string,
      balance: a.type === 'PROP_FIRM'
        ? progressMap[a.id]?.balance ?? (Number((a.defaultValues as Record<string, unknown>)?.currentAccountSize) || 0)
        : Number((a.defaultValues as Record<string, unknown>)?.currentAccountSize) || 0,
    })),
    [sortedAccounts, progressMap]
  )

  const displayItems = useMemo(() => {
    if (marqueeItems.length === 0) return []
    if (marqueeItems.length >= 10) return [...marqueeItems, ...marqueeItems]
    const out: typeof marqueeItems = []
    while (out.length < 20) out.push(...marqueeItems)
    return [...out, ...out].slice(0, Math.max(20, marqueeItems.length * 4))
  }, [marqueeItems])

  const tickerDuration = useMemo(() => Math.max(45, marqueeItems.length * 4), [marqueeItems.length])

  function fmtMoney(n: number, cents = true) {
    return '$' + Number(n).toLocaleString(undefined, cents ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  function fmtMoneyLocal(n: number) {
    return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function fmtDateLocal(d: string) {
    const date = new Date(d)
    if (isNaN(date.getTime())) return d
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <PageHeader title="Accounts" subtitle="Your funded army at a glance." />
        <Button onClick={openCreateForm}>
          <Plus className="w-4 h-4" /> New Account
        </Button>
      </div>

      <div className="relative mb-5 rounded-2xl border border-border bg-input/60 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative px-6 py-5 flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.35em] text-success uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live
            </div>
            <p className="font-mono font-bold tabular-nums text-4xl sm:text-5xl text-text-primary mt-2">
              {fmtMoney(heroEquity)}
            </p>
            <p className="font-mono text-xs text-text-muted mt-2">
              {stats.totalBalance !== heroEquity && <span className="text-text-muted/80">SYNC… </span>}
              TOTAL EQUITY · {accounts.length} ACCOUNT{accounts.length === 1 ? '' : 'S'} · TODAY{' '}
              <span className={stats.dayPnl >= 0 ? 'text-success' : 'text-danger'}>
                {stats.dayPnl >= 0 ? '+' : '−'}{fmtMoney(Math.abs(stats.dayPnl))}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-[10px] tracking-widest">
            {[
              { label: 'ACTIVE', value: stats.active, cls: 'text-success border-success/25' },
              { label: 'FUNDED', value: stats.funded, cls: 'text-violet-400 border-violet-400/25' },
              { label: 'PAUSED', value: stats.paused, cls: 'text-warning border-warning/25' },
              { label: 'BLOWN', value: stats.failed, cls: 'text-danger border-danger/25' },
            ].map((chip) => (
              <span key={chip.label} className={cn('px-2.5 py-1 rounded-full border bg-input/60', chip.cls)}>
                {chip.label} <span className="font-bold">{chip.value}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {marqueeItems.length > 0 && (
        <div className="mb-5 rounded-xl border border-border bg-input/40 overflow-hidden">
          <div className="ticker-track py-2 px-7 gap-10" style={{ animationDuration: `${tickerDuration}s` }}>
            {displayItems.map((item, i) => (
              <span key={`${item.id}-${i}`} className="flex items-center gap-2 font-mono text-[11px] text-text-muted whitespace-nowrap">
                <span className={cn('w-1.5 h-1.5 rounded-full', MARQUEE_DOT[item.status] || 'bg-border')} />
                <span className="text-text-primary">{item.name}</span>
                <span className="uppercase tracking-widest text-[9px]">{item.status}</span>
                <span className="text-text-secondary">{fmtMoney(item.balance)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="card p-14 text-center font-mono">
          <Terminal className="w-8 h-8 mx-auto mb-4 opacity-40" />
          <p className="text-text-muted tracking-[0.3em]">NO CONNECTIONS</p>
          <p className="text-text-muted/80 text-xs mt-3">create your first account to open a terminal <span className="animate-pulse">▌</span></p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {liveAccounts.map((acc, i) => (
            <motion.div
              key={acc.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(0.24, i * 0.06), duration: 0.35, ease: 'easeOut' }}
            >
              <AccountCard
                account={acc}
                progress={progressMap[acc.id] || null}
                firm={firmById.get(acc.propFirmId || '') || null}
                selected={selectedIds.has(acc.id)}
                selectionMode={selecting}
                onToggleSelect={() => toggleSelect(acc.id)}
                onOpen={() => setSelectedAccount(acc)}
                onEdit={() => openEditForm(acc)}
                onDelete={() => openDeleteDialog(acc.id)}
                onFavorite={() => handleToggleFavorite(acc.id)}
                onLongPress={() => {
                  setSelecting(true)
                  setSelectedIds((prev) => {
                    const next = new Set(prev)
                    next.add(acc.id)
                    return next
                  })
                }}
              />
            </motion.div>
          ))}
          </div>

          {failedAccounts.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3 font-mono text-[10px] tracking-[0.35em] uppercase text-danger">
                <X className="w-3.5 h-3.5" /> Blown accounts — log
              </div>
              <div className="space-y-3">
                {failedAccounts.map((acc) => {
                  const p = progressMap[acc.id]
                  const f = firmById.get(acc.propFirmId || '')
                  const events = p?.events || []
                  const failEvent = [...events].reverse().find((e) => e.type === 'BREACH' || e.type === 'PHASE_FAILED')
                  return (
                    <div key={acc.id} className="rounded-2xl border border-danger/25 bg-danger/[0.03] overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-danger/15">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                          <span className="font-semibold text-text-primary truncate">{acc.name}</span>
                          <span className="text-xs text-text-muted truncate font-mono">
                            {f?.name || (acc.defaultValues as Record<string, unknown>)?.firmName as string || 'PROP FIRM'}
                            {((acc.defaultValues as Record<string, unknown>)?.sizeName as string) && <> / {(acc.defaultValues as Record<string, unknown>)?.sizeName as string}</>}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 font-mono text-[11px]">
                          <span className="text-danger font-bold">{p ? fmtMoneyLocal(p.balance) : '—'}</span>
                          <span className="text-text-muted">final balance</span>
                          {failEvent && <span className="text-text-muted">{fmtDateLocal(failEvent.createdAt)}</span>}
                        </div>
                      </div>
                      {events.length > 0 && (
                        <div className="px-5 py-2 divide-y divide-border/60">
                          {events.map((ev, i) => (
                            <div key={i} className="flex items-baseline justify-between gap-3 py-1.5 text-xs">
                              <span className="text-text-secondary truncate">{ev.title}{ev.message && <span className="text-text-muted"> — {ev.message}</span>}</span>
                              <span className="text-[10px] text-text-muted whitespace-nowrap shrink-0">{fmtDateLocal(ev.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <SelectionBar
        count={selectedIds.size}
        onDelete={() => { setBatchDeleteTarget(selectedIds.size); setBatchDeleteWithTrades(false) }}
        onCancel={() => { setSelectedIds(new Set()); setSelecting(false) }}
        deleteLabel="Delete"
      />

      {showForm && (
        <AccountFormModal
          open={showForm}
          onClose={() => { setShowForm(false); setEditAccount(null) }}
          firms={firms}
          accounts={accounts}
          initial={editAccount}
          onSaved={handleSaved}
          onFirmCreated={(firm) => setFirms((prev) => (prev.some((f) => f.id === firm.id) ? prev : [...prev, firm]))}
        />
      )}

      {selectedAccount && (
        <AccountDetailModal
          key={selectedAccount.id}
          account={selectedAccount}
          progress={progressMap[selectedAccount.id] || null}
          firm={firmById.get(selectedAccount.propFirmId || '') || null}
          onClose={() => setSelectedAccount(null)}
          onEdit={() => openEditForm(selectedAccount)}
          onChanged={(updated) => {
            setAccounts((prev) => prev.map((a) => a.id === updated.id ? updated : a))
            setSelectedAccount(updated)
            loadAccounts()
          }}
          onProgress={(progress) => setProgressMap((prev) => ({ ...prev, [selectedAccount.id]: progress }))}
        />
      )}

      {showDeleteDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-md">
            <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">Delete Account</h2>
              <button onClick={() => setShowDeleteDialog(false)} className="p-1 text-text-muted hover:text-text-primary rounded-lg hover:bg-hover transition-colors" aria-label="Close">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="text-sm text-text-secondary">This account will be deleted. What about its trades?</div>
              {[
                { key: false, title: 'Keep journaled trades', desc: 'Trades remain in your journal without this account.' },
                { key: true, title: 'Delete trades too', desc: 'All trades linked to this account will also be deleted.' },
              ].map((opt) => (
                <button
                  key={String(opt.key)}
                  onClick={() => setDeleteWithTrades(opt.key)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors',
                    deleteWithTrades === opt.key ? 'border-primary/40 bg-primary/10' : 'border-border bg-input hover:bg-hover'
                  )}
                >
                  <CheckCircle2 className={cn('w-4 h-4 mt-0.5', deleteWithTrades === opt.key ? 'text-primary' : 'text-text-muted')} />
                  <span>
                    <span className="block text-sm font-medium text-text-primary">{opt.title}</span>
                    <span className="block text-xs text-text-muted mt-0.5">{opt.desc}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button className="bg-danger hover:bg-danger/90" onClick={handleConfirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {batchDeleteTarget > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-md">
            <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">Delete Accounts</h2>
              <button onClick={() => { if (!batchDeleteLoading) setBatchDeleteTarget(0) }} className="p-1 text-text-muted hover:text-text-primary rounded-lg hover:bg-hover transition-colors" aria-label="Close">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="text-sm text-text-secondary">{batchDeleteTarget} accounts will be deleted. What about their trades?</div>
              {[
                { key: false, title: 'Keep journaled trades', desc: 'Trades remain in your journal without these accounts.' },
                { key: true, title: 'Delete trades too', desc: 'All trades linked to these accounts will also be deleted.' },
              ].map((opt) => (
                <button
                  key={String(opt.key)}
                  onClick={() => setBatchDeleteWithTrades(opt.key)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors',
                    batchDeleteWithTrades === opt.key ? 'border-primary/40 bg-primary/10' : 'border-border bg-input hover:bg-hover'
                  )}
                >
                  <CheckCircle2 className={cn('w-4 h-4 mt-0.5', batchDeleteWithTrades === opt.key ? 'text-primary' : 'text-text-muted')} />
                  <span>
                    <span className="block text-sm font-medium text-text-primary">{opt.title}</span>
                    <span className="block text-xs text-text-muted mt-0.5">{opt.desc}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <Button variant="secondary" onClick={() => setBatchDeleteTarget(0)} disabled={batchDeleteLoading}>Cancel</Button>
              <Button className="bg-danger hover:bg-danger/90" onClick={handleBatchDelete} disabled={batchDeleteLoading}>
                {batchDeleteLoading ? 'Deleting...' : `Delete ${batchDeleteTarget}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      <UpgradeDialog
        open={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
      />

      {selecting && selectedIds.size === 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 rounded-full border border-border bg-input/90 backdrop-blur px-5 py-2.5 shadow-xl">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm text-text-secondary">Long-press a card to select accounts</span>
            <button onClick={() => setSelecting(false)} className="p-1 text-text-muted hover:text-text-primary rounded-lg hover:bg-hover transition-colors" aria-label="Cancel selection">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
