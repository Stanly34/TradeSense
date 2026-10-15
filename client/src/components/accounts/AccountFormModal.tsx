import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Building2, User, ShieldCheck, Lock, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { cn } from '../../lib/utils'
import * as accountService from '../../services/accounts'
import * as propFirmService from '../../services/propFirms'
import type { Account, ChallengeInput } from '../../services/accounts'
import type { PropFirm } from '../../services/propFirms'
import { parseAccountSizeFromName, parsePropRules } from '../../services/accounts'

type FormType = 'PROP_FIRM' | 'PERSONAL_ACCOUNT'
type MarketType = 'FOREX' | 'FUTURES'

const DRAW_DOWN_OPTIONS = [
  { value: 'STATIC', label: 'Static' },
  { value: 'TRAILING', label: 'Trailing' },
  { value: 'EOD_TRAILING', label: 'EOD Trailing' },
] as const
const DLL_BREACH_LABELS: Record<string, string> = {
  PAUSE: 'soft pause',
  FAIL: 'hard fail',
}
const TRAILING_LOCK_OPTIONS = [
  { value: 'START', label: 'Lock at start balance' },
  { value: 'START_PLUS_100', label: 'Lock at start + $100' },
  { value: 'NONE', label: 'No lock (keeps trailing)' },
] as const

function toNum(s: string) {
  const n = Number(String(s).replace(/,/g, ''))
  return isFinite(n) ? n : NaN
}

function fmtMoney(n: number) {
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  open: boolean
  onClose: () => void
  firms: PropFirm[]
  accounts: Account[]
  initial?: Account | null
  onSaved: (account: Account) => void
  onFirmCreated?: (firm: PropFirm) => void
}

export function AccountFormModal({ open, onClose, firms, accounts, initial, onSaved, onFirmCreated }: Props) {
  const [formType, setFormType] = useState<FormType>('PROP_FIRM')
  const [market, setMarket] = useState<MarketType>('FUTURES')
  const [firmId, setFirmId] = useState('')
  const [firmMode, setFirmMode] = useState<'manual' | 'auto'>('auto')
  const [planName, setPlanName] = useState('')
  const [sizeName, setSizeName] = useState('')
  const [startingPhase, setStartingPhase] = useState('PHASE1')
  const [phaseTargets, setPhaseTargets] = useState<string[]>([''])
  const [drawdownType, setDrawdownType] = useState<string>('STATIC')
  const [maxTotalDrawdown, setMaxTotalDrawdown] = useState('')
  const [maxDailyDrawdown, setMaxDailyDrawdown] = useState('')
  const [dllBreach, setDllBreach] = useState<'PAUSE' | 'FAIL'>('FAIL')
  const [trailingLock, setTrailingLock] = useState<'START' | 'START_PLUS_100' | 'NONE'>('START')
  const [startingBalance, setStartingBalance] = useState('')
  const [currentBalance, setCurrentBalance] = useState('')
  const [name, setName] = useState('')
  const [brokerName, setBrokerName] = useState('')
  const [accountLabel, setAccountLabel] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState<null | 'save' | 'cancel'>(null)

  const [extraFirms, setExtraFirms] = useState<PropFirm[]>([])
  const [addFirmOpen, setAddFirmOpen] = useState(false)
  const [addFirmName, setAddFirmName] = useState('')
  const [addFirmMarket, setAddFirmMarket] = useState<MarketType>('FOREX')
  const [addFirmWebsite, setAddFirmWebsite] = useState('')
  const [addingFirm, setAddingFirm] = useState(false)
  const [addFirmError, setAddFirmError] = useState('')

  const isEdit = Boolean(initial)
  const lastAppliedKey = useRef('')
  const nameTouched = useRef(false)
  const snapshotRef = useRef('')

  const allFirms = useMemo(() => [...firms, ...extraFirms], [firms, extraFirms])

  useEffect(() => {
    if (!open) return
    const dv = (initial?.defaultValues || {}) as Record<string, unknown>
    const ft: FormType = (initial?.type as FormType) || 'PROP_FIRM'
    const nm = initial?.name || ''
    const fid = (initial?.propFirmId as string) || ''
    const pn = (dv.planName as string) || ''
    const sn = (dv.sizeName as string) || ''
    const sb = String(dv.startingBalance ?? dv.accountSize ?? '')
    const cb = String(dv.currentAccountSize ?? dv.startingBalance ?? dv.accountSize ?? '')
    const broker = (dv.broker as string) || ''
    const label = (dv.accountLabel as string) || ''

    let m: MarketType = 'FUTURES'
    let tgts: string[] = ['']
    let mtl = ''
    let mdl = ''
    let dd = 'STATIC'
    let tl: typeof TRAILING_LOCK_OPTIONS[number]['value'] = 'START'
    let db: 'PAUSE' | 'FAIL' = 'FAIL'
    let fm: 'manual' | 'auto' = 'auto'
    let sp = 'PHASE1'

    if (ft === 'PROP_FIRM') {
      m = (dv.marketType as MarketType) || 'FUTURES'
      const rawTargets = Array.isArray(dv.phaseTargets) ? (dv.phaseTargets as number[]).map(String) : []
      tgts = rawTargets.length > 0 ? rawTargets : ['']
      mtl = String(dv.maxTotalDrawdown ?? '')
      mdl = String(dv.maxDailyDrawdown ?? '')
      dd = (dv.drawdownType as string) || 'STATIC'
      tl = (dv.trailingLock as typeof TRAILING_LOCK_OPTIONS[number]['value']) || 'START'
      db = (dv.dllBreach as 'PAUSE' | 'FAIL') || (m === 'FUTURES' ? 'PAUSE' : 'FAIL')
      const idx = dv.phaseIndex != null ? Number(dv.phaseIndex) : 0
      sp = rawTargets.length > 0 && idx >= rawTargets.length ? 'FUNDED' : idx > 0 ? `PHASE${idx + 1}` : 'PHASE1'
      if (!fid) { fm = 'manual'; lastAppliedKey.current = '' }
      else if (pn && sn) { fm = 'auto'; lastAppliedKey.current = `${pn}|${sn}` }
      else { fm = 'manual'; lastAppliedKey.current = '' }
    } else {
      setFirmId('')
      setPlanName('')
      setSizeName('')
      setStartingPhase('PHASE1')
      setPhaseTargets([''])
      setMaxTotalDrawdown('')
      setMaxDailyDrawdown('')
      setDrawdownType('STATIC')
      setTrailingLock('START')
      setDllBreach('FAIL')
      setFirmMode('auto')
      lastAppliedKey.current = ''
    }

    setFormType(ft)
    setName(nm)
    nameTouched.current = Boolean(initial)
    setMarket(m)
    setFirmId(fid)
    setPlanName(pn)
    setSizeName(sn)
    setStartingPhase(sp)
    setStartingBalance(sb)
    setCurrentBalance(cb)
    setBrokerName(broker)
    setAccountLabel(label)
    setPhaseTargets(tgts)
    setMaxTotalDrawdown(mtl)
    setMaxDailyDrawdown(mdl)
    setDrawdownType(dd)
    setTrailingLock(tl)
    setDllBreach(db)
    setFirmMode(fm)

    snapshotRef.current = JSON.stringify([m, fid, fm, pn, sn, sp, tgts, dd, mtl, mdl, db, tl, sb, cb, nm, broker, label])
    setErrors({})
  }, [open, initial])

  function serialize() {
    return JSON.stringify([market, firmId, firmMode, planName, sizeName, startingPhase, phaseTargets, drawdownType, maxTotalDrawdown, maxDailyDrawdown, dllBreach, trailingLock, startingBalance, currentBalance, name, brokerName, accountLabel])
  }

  function handleClose() {
    if (isSaving) return
    if (serialize() !== snapshotRef.current) setConfirmAction('cancel')
    else onClose()
  }

  const selectedFirm = useMemo(() => allFirms.find((f) => f.id === firmId) || null, [allFirms, firmId])
  const selectedPlan = useMemo(() => {
    if (!selectedFirm) return null
    return (selectedFirm.accountPrices || []).find((p) => p.plan === planName) || null
  }, [selectedFirm, planName])
  const selectedSize = useMemo(() => {
    return (selectedPlan?.sizes || []).find((s) => s.size === sizeName) || null
  }, [selectedPlan, sizeName])

  const hasCatalog = Boolean(selectedFirm && selectedFirm.accountPrices?.length)
  const isCustom = Boolean(selectedFirm) && !hasCatalog
  const isAuto = formType === 'PROP_FIRM' && hasCatalog && firmMode === 'auto'
  const isAutoLocked = isAuto && Boolean(selectedPlan && selectedSize)
  const showManualFields = formType === 'PROP_FIRM' && Boolean(selectedFirm) && !isAutoLocked && (isCustom || Boolean(selectedPlan && selectedSize))
  const isInstantPlan = hasCatalog && /instant|direct/i.test(planName)

  const phaseCount = Math.min(3, Math.max(1, phaseTargets.filter((t) => toNum(t) > 0).length || 1))
  const planPhases = useMemo(() => Array.from({ length: phaseCount }, (_, i) => `PHASE${i + 1}`), [phaseCount])

  const marketFirms = useMemo(
    () => allFirms.filter((f) => f.isActive !== false && (f.instruments || '').toUpperCase().includes(market)),
    [allFirms, market]
  )

  // Apply catalog rules whenever Type+Size are chosen — auto AND manual get prefilled
  useEffect(() => {
    if (formType !== 'PROP_FIRM' || !selectedFirm || !selectedSize || !hasCatalog) return
    const key = `${planName}|${sizeName}`
    if (key === lastAppliedKey.current) return
    lastAppliedKey.current = key
    const accountSize = parseAccountSizeFromName(selectedSize.size)
    const parsed = parsePropRules(market, selectedSize.evalRules, accountSize)
    setPhaseTargets((parsed.phaseTargets.length > 0 ? parsed.phaseTargets : [0]).map(String))
    setMaxTotalDrawdown(parsed.maxTotalDrawdown > 0 ? String(parsed.maxTotalDrawdown) : '')
    setMaxDailyDrawdown(parsed.maxDailyDrawdown > 0 ? String(parsed.maxDailyDrawdown) : '')
    setDrawdownType(parsed.drawdownType)
    setTrailingLock(parsed.trailingLock)
    setDllBreach(parsed.dllBreach)
    if (!isEdit) {
      setStartingBalance(String(accountSize))
      setCurrentBalance(String(accountSize))
      setStartingPhase(/instant|direct/i.test(planName) ? 'FUNDED' : 'PHASE1')
    }
  }, [formType, selectedFirm, selectedPlan, selectedSize, planName, sizeName, market, hasCatalog, isEdit])

  // Smart account name — only until the user types their own
  useEffect(() => {
    if (!open || isEdit || nameTouched.current) return
    let base = ''
    if (formType === 'PROP_FIRM') {
      if (selectedFirm && planName && sizeName) base = `${selectedFirm.name} ${sizeName} ${planName}`
      else if (selectedFirm) base = selectedFirm.name
    } else {
      base = brokerName.trim() ? `Personal ${brokerName.trim()}` : ''
    }
    if (!base) { setName(''); return }
    const taken = new Set(accounts.map((a) => a.name.trim().toLowerCase()))
    let final = base
    let n = 2
    while (taken.has(final.toLowerCase())) final = `${base} ${n++}`
    setName(final)
  }, [open, isEdit, formType, selectedFirm, planName, sizeName, brokerName, accounts])

  function handleSaveClick() {
    if (!validate()) return
    setConfirmAction('save')
  }

  async function performSave() {
    setIsSaving(true)
    try {
      const payloadBase: Record<string, unknown> = { name: name.trim(), type: formType }
      if (formType === 'PROP_FIRM') {
        const challenge = buildChallenge()
        Object.assign(payloadBase, {
          ...(selectedFirm && selectedPlan && selectedSize
            ? { propFirmId: selectedFirm.id, planName: selectedPlan.plan, sizeName: selectedSize.size }
            : {}),
          startingBalance: toNum(startingBalance),
          currentBalance: toNum(currentBalance),
          challenge,
        })
      }
      if (formType === 'PERSONAL_ACCOUNT') {
        const bal = toNum(currentBalance)
        Object.assign(payloadBase, {
          startingBalance: bal,
          currentBalance: bal,
          defaultValues: { broker: brokerName.trim() || undefined, accountLabel: accountLabel.trim() || undefined },
        })
      }

      if (isEdit && initial) {
        const body: Parameters<typeof accountService.updateAccount>[1] = { name: name.trim() }
        if (initial.type === 'PROP_FIRM') {
          if (payloadBase.propFirmId && payloadBase.planName && payloadBase.sizeName) {
            body.propFirmId = payloadBase.propFirmId as string
            body.planName = payloadBase.planName as string
            body.sizeName = payloadBase.sizeName as string
          }
          body.startingBalance = toNum(startingBalance)
          body.currentBalance = toNum(currentBalance)
          body.challenge = buildChallenge()
        } else {
          body.startingBalance = toNum(currentBalance)
          body.currentBalance = toNum(currentBalance)
          body.defaultValues = { broker: brokerName.trim() || undefined, accountLabel: accountLabel.trim() || undefined }
        }
        const updated = await accountService.updateAccount(initial.id, body)
        onSaved(updated)
        toast.success('Account updated')
      } else {
        const created = await accountService.createAccount(payloadBase as never)
        onSaved(created)
        toast.success('Account created')
      }
      setConfirmAction(null)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save account')
    } finally {
      setIsSaving(false)
    }
  }

  async function submitAddFirm() {
    const nm = addFirmName.trim()
    if (!nm) { setAddFirmError('Firm name is required'); return }
    setAddingFirm(true)
    setAddFirmError('')
    try {
      const created = await propFirmService.createPropFirm({ name: nm, market: addFirmMarket, websiteUrl: addFirmWebsite.trim() || undefined })
      setExtraFirms((prev) => [...prev, created])
      onFirmCreated?.(created)
      setFirmId(created.id)
      setMarket(addFirmMarket)
      setFirmMode('manual')
      setPlanName('')
      setSizeName('')
      lastAppliedKey.current = ''
      setAddFirmOpen(false)
      setAddFirmName('')
      setAddFirmWebsite('')
      toast.success(`"${nm}" added — fill its rules manually`)
    } catch (err) {
      setAddFirmError(err instanceof Error ? err.message : 'Failed to create firm')
    } finally {
      setAddingFirm(false)
    }
  }

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Account name is required'
    if (formType === 'PERSONAL_ACCOUNT') {
      const bal = currentBalance.trim() ? toNum(currentBalance) : NaN
      if (!(bal > 0)) errs.currentBalance = 'Enter a valid balance'
      setErrors(errs)
      return Object.keys(errs).length === 0
    }
    if (!selectedFirm) errs.firmId = 'Choose your prop firm'
    if (hasCatalog && !selectedSize) errs.sizeName = 'Pick an account type and size'

      if (!hasCatalog || firmMode === 'manual') {
        const filled = phaseTargets.filter((t) => t.trim() !== '')
        if (startingPhase !== 'FUNDED' && !isInstantPlan) {
          if (filled.length === 0) errs.phaseTargets = 'Enter at least one phase target'
          else if (filled.some((t) => !(toNum(t) > 0))) errs.phaseTargets = 'Every target must be greater than 0'
        }
      if (!(toNum(maxTotalDrawdown) > 0)) errs.maxTotalDrawdown = 'Max total loss is required'
      if (maxDailyDrawdown.trim() === '' || isNaN(toNum(maxDailyDrawdown)) || toNum(maxDailyDrawdown) < 0) errs.maxDailyDrawdown = 'Required (0 = none)'
      if (!(toNum(startingBalance) > 0)) errs.startingBalance = 'Starting balance is required'
      if (!(toNum(currentBalance) > 0)) errs.currentBalance = 'Current balance is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function buildChallenge(): ChallengeInput {
    const targets = phaseTargets.map((t) => toNum(t)).filter((n) => isFinite(n) && n > 0)
    const maxTotal = toNum(maxTotalDrawdown)
    const maxDaily = toNum(maxDailyDrawdown)
    const ddType = maxTotal > 0 ? drawdownType : 'STATIC'
    const lock = ddType === 'STATIC' ? 'NONE' : trailingLock
    const breach = dllBreach || (market === 'FUTURES' ? 'PAUSE' : 'FAIL')
    return {
      marketType: market,
      startingPhase,
      phaseTargets: targets.length > 0 ? targets : [0],
      maxTotalDrawdown: maxTotal > 0 ? Number(maxTotal.toFixed(2)) : 0,
      maxDailyDrawdown: maxDaily >= 0 && isFinite(maxDaily) ? Number(maxDaily.toFixed(2)) : 0,
      drawdownType: ddType as ChallengeInput['drawdownType'],
      dllBreach: breach,
      trailingLock: lock,
    }
  }

  const ruleSummaryRows: Array<[string, string]> = []
  if (isAutoLocked) {
    const targets = phaseTargets.map((t) => toNum(t)).filter((n) => n > 0)
    ruleSummaryRows.push(['Profit targets', targets.map((t, i) => `P${i + 1} ${fmtMoney(t)}`).join(' · ') || '—'])
    ruleSummaryRows.push([
      'Max loss',
      toNum(maxTotalDrawdown) > 0
        ? `${fmtMoney(toNum(maxTotalDrawdown))}${drawdownType !== 'STATIC' ? ` (${DRAW_DOWN_OPTIONS.find((d) => d.value === drawdownType)?.label})` : ''}`
        : '—',
    ])
    ruleSummaryRows.push([
      'Daily loss limit',
      toNum(maxDailyDrawdown) > 0 ? `${fmtMoney(toNum(maxDailyDrawdown))} · ${DLL_BREACH_LABELS[dllBreach] || ''}` : 'None',
    ])
    if (drawdownType !== 'STATIC') {
      ruleSummaryRows.push(['Trailing lock', TRAILING_LOCK_OPTIONS.find((t) => t.value === trailingLock)?.label || '—'])
    }
  }

  const firmOptions = [
    { value: '', label: 'Choose your prop firm…' },
    ...marketFirms.map((f) => ({ value: f.id, label: f.accountPrices?.length ? `${f.name}` : `${f.name} (custom)` })),
  ]

  return (
    <Modal
      open={open}
      onClose={handleClose}
      zIndex="z-[70]"
      title={isEdit ? 'Edit Account' : 'New Account'}
      subtitle={isEdit ? 'Adjust this account.' : 'Pick a firm for automatic rules, or add your own and fill them manually.'}
      size="xl"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSaveClick} disabled={isSaving}>{isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Account'}</Button>
        </div>
      }
    >
      <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
        {/* Account Type */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Account Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormType('PROP_FIRM')}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl border transition-colors text-left',
                formType === 'PROP_FIRM' ? 'border-primary/40 bg-primary/10' : 'border-border bg-input hover:bg-hover'
              )}
            >
              <Building2 className={cn('w-5 h-5 mt-0.5 shrink-0', formType === 'PROP_FIRM' ? 'text-primary-light' : 'text-text-muted')} />
              <span>
                <span className="block text-sm font-semibold text-text-primary">Prop Firm Challenge</span>
                <span className="block text-xs text-text-muted mt-0.5">Phases, drawdown tracking and payouts.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFormType('PERSONAL_ACCOUNT')}
              className={cn(
                'flex items-start gap-3 p-4 rounded-xl border transition-colors text-left',
                formType === 'PERSONAL_ACCOUNT' ? 'border-primary/40 bg-primary/10' : 'border-border bg-input hover:bg-hover'
              )}
            >
              <User className={cn('w-5 h-5 mt-0.5 shrink-0', formType === 'PERSONAL_ACCOUNT' ? 'text-primary-light' : 'text-text-muted')} />
              <span>
                <span className="block text-sm font-semibold text-text-primary">Personal Account</span>
                <span className="block text-xs text-text-muted mt-0.5">Track a personal live or demo account.</span>
              </span>
            </button>
          </div>
        </div>

        {formType === 'PROP_FIRM' && (
          <>
            {/* Market — only before a firm exists */}
            {!selectedFirm && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Market</label>
                <div className="flex gap-2">
                  {(['FOREX', 'FUTURES'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMarket(m); if (firmId) { setFirmId(''); setPlanName(''); setSizeName(''); lastAppliedKey.current = '' } }}
                      className={cn(
                        'px-4 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                        market === m ? 'bg-primary border-primary text-white' : 'bg-glass border-border text-text-secondary hover:bg-hover'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Firm picker + Add firm */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Prop Firm</label>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Select
                    value={firmId}
                    onChange={(v) => {
                      setFirmId(v)
                      clearError('firmId')
                      setPlanName('')
                      setSizeName('')
                      lastAppliedKey.current = ''
                      const f = allFirms.find((x) => x.id === v)
                      if (f) {
                        const fm: MarketType = (f.instruments || '').toUpperCase().includes('FUTURES') ? 'FUTURES' : 'FOREX'
                        setMarket(fm)
                        setFirmMode(f.accountPrices?.length ? 'auto' : 'manual')
                      }
                    }}
                    options={firmOptions}
                    placeholder="Choose your prop firm…"
                  />
                  {errors.firmId && <p className="text-xs text-danger mt-1">{errors.firmId}</p>}
                </div>
                <Button variant="secondary" onClick={() => { setAddFirmMarket(market); setAddFirmOpen(true) }} className="mt-[0px] shrink-0">
                  <Plus className="w-4 h-4" /> New firm
                </Button>
              </div>
              {isCustom && (
                <p className="text-[11px] text-text-muted mt-2">
                  This is your own firm — no catalog rules exist, so fill the rules manually below.
                </p>
              )}
            </div>

            {/* Mode toggle — catalog firms, always visible so you can flip anytime */}
            {hasCatalog && (
              <div className="flex flex-wrap items-center gap-5 rounded-xl border border-border bg-input px-4 py-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="firmMode" checked={firmMode === 'auto'} onChange={() => setFirmMode('auto')} className="w-4 h-4 accent-[var(--color-primary)]" />
                  <span className="text-sm text-text-primary">Automatic</span>
                  <span className="text-xs text-text-muted">rules locked from catalog</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="firmMode" checked={firmMode === 'manual'} onChange={() => setFirmMode('manual')} className="w-4 h-4 accent-[var(--color-primary)]" />
                  <span className="text-sm text-text-primary">Manual</span>
                  <span className="text-xs text-text-muted">same rules, editable values</span>
                </label>
              </div>
            )}

            {/* Type + Size pickers — catalog firms, both modes, always visible */}
            {hasCatalog && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Account Type</label>
                  <Select
                    value={planName}
                      onChange={(v) => {
                        setPlanName(v)
                        setSizeName('')
                        lastAppliedKey.current = ''
                      }}
                    options={[
                      { value: '', label: 'Select type…' },
                      ...(selectedFirm?.accountPrices || []).map((p) => ({ value: p.plan, label: p.plan })),
                    ]}
                    placeholder="Select type…"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Account Size</label>
                  <Select
                    value={sizeName}
                    onChange={(v) => setSizeName(v)}
                    options={[
                      { value: '', label: 'Select size…' },
                      ...(selectedPlan?.sizes || []).map((s) => ({ value: s.size, label: s.size })),
                    ]}
                    placeholder="Select size…"
                  />
                  {errors.sizeName && <p className="text-xs text-danger mt-1">{errors.sizeName}</p>}
                </div>
              </div>
            )}

            {/* AUTO LOCKED SUMMARY */}
            {isAutoLocked && (
              <div className="rounded-xl border border-success/25 bg-success/[0.04] p-4">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-success" />
                    <p className="text-sm font-semibold text-text-primary">Rules applied automatically</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono text-text-muted">
                    <Lock className="w-3 h-3" /> {sizeName} catalog
                  </span>
                </div>
                <dl className="space-y-1.5">
                  {ruleSummaryRows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-4 text-xs">
                      <dt className="text-text-muted">{k}</dt>
                      <dd className="font-medium text-text-secondary font-mono">{v}</dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <dt className="text-text-muted">Starting point</dt>
                    <dd className="font-medium text-text-secondary font-mono">{startingPhase === 'FUNDED' ? 'Funded' : `Phase ${startingPhase.replace('PHASE', '')}`}</dd>
                  </div>
                </dl>
                <p className="text-[11px] text-text-muted mt-3 leading-relaxed">
                  {isEdit
                    ? 'Catalog rules are fixed. Adjust balances below if needed.'
                    : 'Starts fresh with the exact firm rules. Pass a phase to advance — hit a limit and it fails.'}
                </p>

                {isEdit && (
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Start balance ($)</label>
                      <Input value={startingBalance} onChange={(e) => { setStartingBalance(e.target.value); clearError('startingBalance') }} />
                      {errors.startingBalance && <p className="text-xs text-danger mt-1">{errors.startingBalance}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Current balance ($)</label>
                      <Input value={currentBalance} onChange={(e) => { setCurrentBalance(e.target.value); clearError('currentBalance') }} />
                      {errors.currentBalance && <p className="text-xs text-danger mt-1">{errors.currentBalance}</p>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MANUAL FIELDS */}
            {showManualFields && (
              <>
                {!isInstantPlan && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-text-secondary">Starting Phase</label>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">chips reflect phases below</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {planPhases.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setStartingPhase(p)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                          startingPhase === p ? 'bg-primary border-primary text-white' : 'bg-glass border-border text-text-secondary hover:bg-hover'
                        )}
                      >
                        Phase {p.replace('PHASE', '')}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setStartingPhase('FUNDED')}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                        startingPhase === 'FUNDED' ? 'bg-success/15 border-success/30 text-success' : 'bg-glass border-border text-text-secondary hover:bg-hover'
                      )}
                    >
                      Funded
                    </button>
                  </div>
                  {startingPhase === 'FUNDED' && (
                    <p className="text-[11px] text-text-muted mt-2">
                      Funded accounts have no profit target — loss limits still apply. Log payouts anytime from the account detail view.
                    </p>
                  )}
                </div>
                )}

                {startingPhase !== 'FUNDED' && !isInstantPlan && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-secondary">Profit target — one card per phase</label>
                    {phaseTargets.map((t, i) => {
                      const isStart = startingPhase === `PHASE${i + 1}`
                      return (
                        <div
                          key={i}
                          className={cn(
                            'rounded-xl border p-3 transition-colors',
                            isStart ? 'border-primary/50 bg-primary/[0.07]' : 'border-border bg-glass'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full',
                                isStart ? 'bg-primary text-white' : 'bg-glass text-text-muted'
                              )}
                            >
                              Phase {i + 1}
                              {isStart && <span className="text-[9px] uppercase tracking-wider opacity-80">· start here</span>}
                            </span>
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-text-muted uppercase tracking-wider">Target $</label>
                              {phaseTargets.length > 1 && (
                                <button type="button" onClick={() => { setPhaseTargets(phaseTargets.filter((_, j) => j !== i)); clearError('phaseTargets') }} className="p-1 text-text-muted hover:text-danger" aria-label="Remove phase">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <input
                            value={t}
                            onChange={(e) => {
                              const next = [...phaseTargets]
                              next[i] = e.target.value
                              setPhaseTargets(next)
                              clearError('phaseTargets')
                            }}
                            placeholder={`e.g. ${[1500, 3000][i] ?? 4500}`}
                            className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/40"
                          />
                        </div>
                      )
                    })}
                    {!hasCatalog && phaseTargets.length < 3 && (
                      <button type="button" onClick={() => { setPhaseTargets([...phaseTargets, '']); clearError('phaseTargets') }} className="px-2 py-1.5 text-xs text-primary-light hover:bg-primary/10 rounded-lg">
                        + Add phase
                      </button>
                    )}
                    {errors.phaseTargets && <p className="text-xs text-danger mt-1">{errors.phaseTargets}</p>}
                  </div>
                )}

                {(startingPhase === 'FUNDED' || isInstantPlan) && (
                  <div className="rounded-xl border border-success/30 bg-success/[0.05] p-4">
                    <p className="text-sm font-semibold text-success">No profit target</p>
                    <p className="text-[11px] text-text-muted mt-1">
                      {isInstantPlan
                        ? 'Instant/direct accounts skip evaluations — only loss limits apply below.'
                        : 'Funded accounts only follow loss limits. Log payouts anytime from the account detail view.'}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-border bg-input p-4 space-y-4">
                  <p className="text-sm font-semibold text-text-primary">
                    {isInstantPlan ? 'Loss Limits' : startingPhase === 'FUNDED' ? 'Funded Loss Limits' : 'Challenge Rules'}
                    <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-danger align-middle">required</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(startingPhase !== 'FUNDED' || isInstantPlan) && (
                                      <>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Drawdown type</label>
                      <Select
                        value={drawdownType}
                        onChange={(v) => { setDrawdownType(v); if (v === 'STATIC') setTrailingLock('NONE') }}
                        options={DRAW_DOWN_OPTIONS.map((o) => ({ ...o }))}
                      />
                    </div>
                  </>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Max total loss ($)</label>
                      <Input value={maxTotalDrawdown} onChange={(e) => { setMaxTotalDrawdown(e.target.value); clearError('maxTotalDrawdown') }} placeholder="e.g. 2500" />
                      {errors.maxTotalDrawdown && <p className="text-xs text-danger mt-1">{errors.maxTotalDrawdown}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Daily loss limit ($)</label>
                      <Input value={maxDailyDrawdown} onChange={(e) => { setMaxDailyDrawdown(e.target.value); clearError('maxDailyDrawdown') }} placeholder="e.g. 500 — 0 for none" />
                      {(toNum(maxDailyDrawdown) > 0) && (
                        <p className={cn('text-[11px] mt-1 font-medium', dllBreach === 'PAUSE' ? 'text-warning' : 'text-danger')}>
                          {dllBreach === 'PAUSE'
                            ? 'Soft breach — trading pauses until next session'
                            : 'Hard breach — account closes immediately'}
                        </p>
                      )}
                      {errors.maxDailyDrawdown && <p className="text-xs text-danger mt-1">{errors.maxDailyDrawdown}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Starting balance ($)</label>
                      <Input value={startingBalance} onChange={(e) => { setStartingBalance(e.target.value); clearError('startingBalance') }} placeholder="e.g. 50000" />
                      {errors.startingBalance && <p className="text-xs text-danger mt-1">{errors.startingBalance}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Current balance ($)</label>
                      <Input value={currentBalance} onChange={(e) => { setCurrentBalance(e.target.value); clearError('currentBalance') }} placeholder="e.g. 52300" />
                      {errors.currentBalance && <p className="text-xs text-danger mt-1">{errors.currentBalance}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}

            {!selectedFirm && (
              <p className="text-[11px] text-text-muted -mt-2">
                Don&apos;t see your firm? Hit <span className="text-text-secondary font-medium">New firm</span> to add it — then enter its rules manually.
              </p>
            )}
          </>
        )}

        {formType === 'PERSONAL_ACCOUNT' && (
          <div className="rounded-xl border border-border bg-input p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Broker</label>
              <Input value={brokerName} onChange={(e) => setBrokerName(e.target.value)} placeholder="e.g. OANDA" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Account label</label>
              <Input value={accountLabel} onChange={(e) => setAccountLabel(e.target.value)} placeholder="e.g. Live USD" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Current balance ($)</label>
              <Input value={currentBalance} onChange={(e) => { setCurrentBalance(e.target.value); clearError('currentBalance') }} placeholder="e.g. 10000" />
              {errors.currentBalance && <p className="text-xs text-danger mt-1">{errors.currentBalance}</p>}
            </div>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Account name</label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); nameTouched.current = true; clearError('name') }}
            placeholder={formType === 'PROP_FIRM' ? 'e.g. Tradeify 50k Growth Evaluation' : 'e.g. Personal Live'}
          />
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
        </div>
      </div>

      {/* Save confirmation */}
      <ConfirmDialog
        open={confirmAction === 'save'}
        onClose={() => setConfirmAction(null)}
        onConfirm={performSave}
        isLoading={isSaving}
        title={isEdit ? 'Apply changes?' : 'Create account?'}
        message={isEdit ? `"${name.trim()}" will be updated with these settings.` : `"${name.trim()}" will be created with these rules.`}
        confirmLabel={isEdit ? 'Save changes' : 'Create'}
      />

      {/* Cancel confirmation */}
      <ConfirmDialog
        open={confirmAction === 'cancel'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => { setConfirmAction(null); onClose() }}
        title="Discard changes?"
        message="Your edits will be lost."
        confirmLabel="Discard"
      />

      {/* Add firm modal */}
      <Modal
        open={addFirmOpen}
        onClose={() => { if (!addingFirm) setAddFirmOpen(false) }}
        zIndex="z-[75]"
        title="Add prop firm"
        subtitle="Not in the list? Add yours — rules are filled manually."
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAddFirmOpen(false)} disabled={addingFirm}>Cancel</Button>
            <Button onClick={submitAddFirm} disabled={addingFirm || !addFirmName.trim()}>{addingFirm ? 'Adding…' : 'Add firm'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Firm name *</label>
            <Input value={addFirmName} onChange={(e) => { setAddFirmName(e.target.value); setAddFirmError('') }} placeholder="e.g. MyLocalFutures" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Market *</label>
            <div className="flex gap-2">
              {(['FOREX', 'FUTURES'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAddFirmMarket(m)}
                  className={cn(
                    'px-4 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                    addFirmMarket === m ? 'bg-primary border-primary text-white' : 'bg-glass border-border text-text-secondary hover:bg-hover'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Website (optional)</label>
            <Input value={addFirmWebsite} onChange={(e) => setAddFirmWebsite(e.target.value)} placeholder="https://…" />
          </div>
          {addFirmError && <p className="text-xs text-danger">{addFirmError}</p>}
        </div>
      </Modal>
    </Modal>
  )
}