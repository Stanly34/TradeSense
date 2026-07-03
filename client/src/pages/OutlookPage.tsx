import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, Upload, X, CalendarCheck, Trash2, CheckCircle, Circle, TrendingUp, TrendingDown, Edit2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { UpgradeDialog } from '../components/ui/UpgradeDialog'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SelectionBar } from '../components/ui/SelectionBar'
import { InstrumentSelect } from '../components/ui/InstrumentSelect'
import { WeekPicker } from '../components/ui/WeekPicker'
import * as outlookService from '../services/outlook'
import * as favoriteInstrumentService from '../services/favoriteInstruments'
import { usePlan } from '../hooks/usePlan'
import type { WeeklyOutlook } from '../services/outlook'
import toast from 'react-hot-toast'

const MONTH_CODES = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z']

const CYCLE_MAP = {
  quarterly: { months: [2, 5, 8, 11], count: 4 },
  monthly: { months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], count: 6 },
  gc: { months: [1, 3, 5, 7, 9, 11], count: 6 },
  si: { months: [2, 4, 6, 8, 11], count: 5 },
} as const

type CycleKey = keyof typeof CYCLE_MAP

function getContractMonths(months: number[], count: number): string[] {
  const now = new Date()
  const res: string[] = []
  const year = now.getFullYear()
  for (const m of months) {
    const y = m >= now.getMonth() ? year : year + 1
    if (res.length >= count) break
    res.push(`${MONTH_CODES[m]}${y}`)
  }
  return res
}

interface InstrumentPreset {
  pointValue: number
  tickSize: number
  tickValue: number
  isFutures?: boolean
}

function instrumentPreset(tickSize: number, tickValue: number, pointValue: number): InstrumentPreset {
  return { pointValue, tickSize, tickValue, isFutures: true }
}

const INSTRUMENT_PRESETS: Record<string, InstrumentPreset> = {
  'EUR/USD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'GBP/USD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'USD/JPY': { pointValue: 100000, tickSize: 0.001, tickValue: 1.1 },
  'AUD/USD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'USD/CAD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'NZD/USD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'EUR/JPY': { pointValue: 100000, tickSize: 0.001, tickValue: 1.07 },
  'GBP/JPY': { pointValue: 100000, tickSize: 0.001, tickValue: 1.07 },
  'EUR/GBP': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'CHF/JPY': { pointValue: 100000, tickSize: 0.001, tickValue: 1.07 },
  'USD/CHF': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'AUD/JPY': { pointValue: 100000, tickSize: 0.001, tickValue: 1.07 },
  'NZD/JPY': { pointValue: 100000, tickSize: 0.001, tickValue: 1.07 },
  'EUR/AUD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'GBP/AUD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'AUD/CAD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'AUD/NZD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'EUR/NZD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'GBP/NZD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'EUR/CAD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'GBP/CAD': { pointValue: 100000, tickSize: 0.00001, tickValue: 1 },
  'XAU/USD': { pointValue: 100, tickSize: 0.01, tickValue: 1 },
  'XAG/USD': { pointValue: 5000, tickSize: 0.0001, tickValue: 0.5 },
  'BTC/USD': { pointValue: 1, tickSize: 1, tickValue: 1 },
  'ETH/USD': { pointValue: 1, tickSize: 0.1, tickValue: 0.1 },
  ES: instrumentPreset(0.25, 12.5, 50),
  MES: instrumentPreset(0.25, 1.25, 5),
  NQ: instrumentPreset(0.25, 5, 20),
  MNQ: instrumentPreset(0.25, 0.5, 2),
  YM: instrumentPreset(1, 5, 5),
  MYM: instrumentPreset(1, 0.5, 0.5),
  RTY: instrumentPreset(0.1, 5, 50),
  M2K: instrumentPreset(0.1, 0.5, 5),
  CL: instrumentPreset(0.01, 10, 1000),
  MCL: instrumentPreset(0.01, 1, 100),
  NG: instrumentPreset(0.001, 10, 10000),
  MNG: instrumentPreset(0.001, 1, 1000),
  GC: instrumentPreset(0.1, 10, 100),
  MGC: instrumentPreset(0.1, 1, 10),
  SI: instrumentPreset(0.005, 25, 5000),
  SIL: instrumentPreset(0.005, 2.5, 500),
  '6E': instrumentPreset(0.00005, 6.25, 125000),
  'M6E': instrumentPreset(0.00005, 0.625, 12500),
  '6B': instrumentPreset(0.0001, 6.25, 62500),
  'M6B': instrumentPreset(0.0001, 0.625, 6250),
  '6J': instrumentPreset(0.0000005, 6.25, 12500000),
  'M6J': instrumentPreset(0.0000005, 0.625, 1250000),
  '6A': instrumentPreset(0.0001, 10, 100000),
  'M6A': instrumentPreset(0.0001, 1, 10000),
  '6C': instrumentPreset(0.0001, 10, 100000),
  'M6C': instrumentPreset(0.0001, 1, 10000),
  '6S': instrumentPreset(0.0001, 12.5, 125000),
  'M6S': instrumentPreset(0.0001, 1.25, 12500),
  BTC: instrumentPreset(5, 25, 5),
  MBT: instrumentPreset(5, 2.5, 0.5),
  ETH: instrumentPreset(0.25, 0.5, 2),
  MET: instrumentPreset(0.25, 0.05, 0.2),
  NAS100: { pointValue: 10, tickSize: 0.1, tickValue: 1 },
  US100: { pointValue: 10, tickSize: 0.1, tickValue: 1 },
  US30: { pointValue: 10, tickSize: 0.1, tickValue: 1 },
  SPX500: { pointValue: 10, tickSize: 0.1, tickValue: 1 },
}

interface RootDef {
  value: string
  name: string
  cycle?: CycleKey
}

const ROOTS: { label: string; items: RootDef[] }[] = [
  {
    label: 'Equity Index Futures',
    items: [
      { value: 'ES', name: 'E-mini S&P 500', cycle: 'quarterly' },
      { value: 'MES', name: 'Micro S&P 500', cycle: 'quarterly' },
      { value: 'NQ', name: 'E-mini Nasdaq', cycle: 'quarterly' },
      { value: 'MNQ', name: 'Micro Nasdaq', cycle: 'quarterly' },
      { value: 'YM', name: 'Mini Dow', cycle: 'quarterly' },
      { value: 'MYM', name: 'Micro Dow', cycle: 'quarterly' },
      { value: 'RTY', name: 'E-mini Russell', cycle: 'quarterly' },
      { value: 'M2K', name: 'Micro Russell', cycle: 'quarterly' },
    ],
  },
  {
    label: 'Energy',
    items: [
      { value: 'CL', name: 'Crude Oil', cycle: 'monthly' },
      { value: 'MCL', name: 'Micro Crude', cycle: 'monthly' },
      { value: 'NG', name: 'Natural Gas', cycle: 'monthly' },
      { value: 'MNG', name: 'Micro Natural Gas', cycle: 'monthly' },
    ],
  },
  {
    label: 'Metals',
    items: [
      { value: 'GC', name: 'Gold', cycle: 'gc' },
      { value: 'MGC', name: 'Micro Gold', cycle: 'gc' },
      { value: 'SI', name: 'Silver', cycle: 'si' },
      { value: 'SIL', name: 'Micro Silver', cycle: 'si' },
    ],
  },
  {
    label: 'Currency Futures',
    items: [
      { value: '6E', name: 'Euro FX', cycle: 'quarterly' },
      { value: 'M6E', name: 'Micro Euro', cycle: 'quarterly' },
      { value: '6B', name: 'British Pound', cycle: 'quarterly' },
      { value: 'M6B', name: 'Micro Pound', cycle: 'quarterly' },
      { value: '6J', name: 'Japanese Yen', cycle: 'quarterly' },
      { value: 'M6J', name: 'Micro Yen', cycle: 'quarterly' },
      { value: '6A', name: 'Aussie Dollar', cycle: 'quarterly' },
      { value: 'M6A', name: 'Micro Aussie', cycle: 'quarterly' },
      { value: '6C', name: 'Canadian Dollar', cycle: 'quarterly' },
      { value: 'M6C', name: 'Micro Canadian', cycle: 'quarterly' },
      { value: '6S', name: 'Swiss Franc', cycle: 'quarterly' },
      { value: 'M6S', name: 'Micro Swiss', cycle: 'quarterly' },
    ],
  },
  {
    label: 'Crypto',
    items: [
      { value: 'BTC', name: 'Bitcoin', cycle: 'monthly' },
      { value: 'MBT', name: 'Micro Bitcoin', cycle: 'monthly' },
      { value: 'ETH', name: 'Ether', cycle: 'monthly' },
      { value: 'MET', name: 'Micro Ether', cycle: 'monthly' },
    ],
  },
  {
    label: 'CFDs',
    items: [
      { value: 'NAS100', name: 'US100 (Nasdaq)' },
      { value: 'US30', name: 'Dow Jones' },
      { value: 'SPX500', name: 'S&P 500' },
      { value: 'XAU/USD', name: 'Gold vs US Dollar' },
      { value: 'XAG/USD', name: 'Silver vs US Dollar' },
      { value: 'BTC/USD', name: 'Bitcoin vs US Dollar' },
      { value: 'ETH/USD', name: 'Ethereum vs US Dollar' },
    ],
  },
  {
    label: 'Forex',
    items: [
      { value: 'EUR/USD', name: 'Euro / US Dollar' },
      { value: 'GBP/USD', name: 'British Pound / US Dollar' },
      { value: 'USD/JPY', name: 'US Dollar / Japanese Yen' },
      { value: 'AUD/USD', name: 'Australian Dollar / US Dollar' },
      { value: 'USD/CAD', name: 'US Dollar / Canadian Dollar' },
      { value: 'NZD/USD', name: 'New Zealand Dollar / US Dollar' },
      { value: 'EUR/JPY', name: 'Euro / Japanese Yen' },
      { value: 'GBP/JPY', name: 'British Pound / Japanese Yen' },
      { value: 'EUR/GBP', name: 'Euro / British Pound' },
      { value: 'CHF/JPY', name: 'Swiss Franc / Japanese Yen' },
      { value: 'USD/CHF', name: 'US Dollar / Swiss Franc' },
      { value: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen' },
      { value: 'NZD/JPY', name: 'New Zealand Dollar / Japanese Yen' },
      { value: 'EUR/AUD', name: 'Euro / Australian Dollar' },
      { value: 'GBP/AUD', name: 'British Pound / Australian Dollar' },
      { value: 'AUD/CAD', name: 'Australian Dollar / Canadian Dollar' },
      { value: 'AUD/NZD', name: 'Australian Dollar / New Zealand Dollar' },
      { value: 'EUR/NZD', name: 'Euro / New Zealand Dollar' },
      { value: 'GBP/NZD', name: 'British Pound / New Zealand Dollar' },
      { value: 'EUR/CAD', name: 'Euro / Canadian Dollar' },
      { value: 'GBP/CAD', name: 'British Pound / Canadian Dollar' },
    ],
  },
]

function getInstrumentGroups() {
  return ROOTS.map((group) => ({
    label: group.label,
    items: group.items.flatMap((r) => {
      const base = { value: r.value, label: r.name }
      if (!r.cycle) return [base]
      const { months, count } = CYCLE_MAP[r.cycle]
      const contracts = getContractMonths(months, count)
      return [
        base,
        ...contracts.map((c) => ({
          value: `${r.value}${c}`,
          label: `${r.value} ${c}`,
        })),
      ]
    }),
  }))
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatWeekRange(mon: Date): string {
  const fri = new Date(mon)
  fri.setDate(fri.getDate() + 4)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${mon.toLocaleDateString('en-US', opts)} - ${fri.toLocaleDateString('en-US', opts)}, ${fri.getFullYear()}`
}

export function OutlookPage() {
  const { isPro, plan } = usePlan()
  const [entries, setEntries] = useState<WeeklyOutlook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteCount, setBatchDeleteCount] = useState(0)
  const [favoriteInstruments, setFavoriteInstruments] = useState<string[]>([])
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [viewingEntry, setViewingEntry] = useState<WeeklyOutlook | null>(null)

  const longTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const longPressTriggeredRef = useRef(false)
  const beforeInputRef = useRef<HTMLInputElement>(null)
  const afterInputRef = useRef<HTMLInputElement>(null)

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [instrument, setInstrument] = useState('')
  const [direction, setDirection] = useState('buy')
  const [notes, setNotes] = useState('')
  const [beforeImage, setBeforeImage] = useState<string | null>(null)
  const [beforeFile, setBeforeFile] = useState<File | null>(null)
  const [afterImage, setAfterImage] = useState<string | null>(null)
  const [afterFile, setAfterFile] = useState<File | null>(null)

  const instrumentGroups = useMemo(() => getInstrumentGroups(), [])

  const fetchEntries = useCallback(async () => {
    try {
      const data = await outlookService.listOutlooks()
      setEntries(data)
    } catch {
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isPro) {
      setIsLoading(false)
      return
    }
    fetchEntries()
  }, [isPro, fetchEntries])

  useEffect(() => {
    favoriteInstrumentService.listFavoriteInstruments()
      .then((favs) => setFavoriteInstruments(favs.map((f) => f.instrument)))
      .catch(() => {})
  }, [])

  function resetForm() {
    setWeekStart(getMonday(new Date()))
    setInstrument('')
    setDirection('buy')
    setNotes('')
    setBeforeImage(null)
    setBeforeFile(null)
    setAfterImage(null)
    setAfterFile(null)
    setEditingId(null)
    setViewingEntry(null)
  }

  function openEdit(entry: WeeklyOutlook) {
    setViewingEntry(null)
    setEditingId(entry.id)
    setWeekStart(new Date(entry.weekStart))
    setInstrument(entry.instrument)
    setDirection(entry.direction || 'buy')
    setNotes(entry.notes || '')
    setBeforeImage(entry.beforeImage)
    setBeforeFile(null)
    setAfterImage(entry.afterImage)
    setAfterFile(null)
    setShowForm(true)
  }

  function handleBeforeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBeforeFile(file)
    setBeforeImage(URL.createObjectURL(file))
  }

  function handleAfterFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAfterFile(file)
    setAfterImage(URL.createObjectURL(file))
  }

  function removeBefore() {
    setBeforeFile(null)
    setBeforeImage(null)
  }

  function removeAfter() {
    setAfterFile(null)
    setAfterImage(null)
  }

  async function handleSave() {
    if (!instrument.trim()) {
      toast.error('Instrument is required')
      return
    }
    setSaving(true)
    try {
      const fd = new FormData()
      if (editingId) fd.append('id', editingId)
      if (notes) fd.append('notes', notes)
      fd.append('direction', direction)
      if (beforeFile) fd.append('beforeImage', beforeFile)
      if (afterFile) fd.append('afterImage', afterFile)
      fd.append('clearBeforeImage', beforeImage === null && !beforeFile ? 'true' : 'false')
      fd.append('clearAfterImage', afterImage === null && !afterFile ? 'true' : 'false')
      await outlookService.saveOutlook(weekStart.toISOString().slice(0, 10), instrument.trim(), fd)
      toast.success('Outlook saved')
      setShowForm(false)
      resetForm()
      await fetchEntries()
    } catch {
      toast.error('Failed to save outlook')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await outlookService.deleteOutlook(id)
      toast.success('Outlook deleted')
      setEntries((prev) => prev.filter((e) => e.id !== id))
      setViewingEntry(null)
    } catch {
      toast.error('Failed to delete outlook')
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (next.size === 0) setSelecting(false)
      return next
    })
  }

  function cancelSelect() {
    setSelecting(false)
    setSelectedIds(new Set())
  }

  function makeLongPress(id: string) {
    return {
      onMouseDown: () => {
        longPressTriggeredRef.current = false
        longTimerRef.current = setTimeout(() => {
          longPressTriggeredRef.current = true
          setSelecting(true)
          setSelectedIds((prev) => { const next = new Set(prev); next.add(id); return next })
        }, 600)
      },
      onMouseUp: () => clearTimeout(longTimerRef.current),
      onMouseLeave: () => clearTimeout(longTimerRef.current),
      onTouchStart: () => {
        longPressTriggeredRef.current = false
        longTimerRef.current = setTimeout(() => {
          longPressTriggeredRef.current = true
          setSelecting(true)
          setSelectedIds((prev) => { const next = new Set(prev); next.add(id); return next })
        }, 600)
      },
      onTouchEnd: (e: React.TouchEvent) => {
        clearTimeout(longTimerRef.current)
        if (longPressTriggeredRef.current) e.preventDefault()
      },
      onTouchMove: () => clearTimeout(longTimerRef.current),
    }
  }

  async function handleBatchDelete() {
    const ids = Array.from(selectedIds)
    try {
      await outlookService.batchDeleteOutlooks(ids)
      toast.success(`${ids.length} outlooks deleted`)
      setEntries((prev) => prev.filter((e) => !ids.includes(e.id)))
      cancelSelect()
      setBatchDeleteCount(0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete outlooks')
    }
  }

  async function toggleFavorite(instr: string) {
    if (favoriteInstruments.includes(instr)) {
      const favs = await favoriteInstrumentService.listFavoriteInstruments()
      const found = favs.find((f) => f.instrument === instr)
      if (found) {
        await favoriteInstrumentService.deleteFavoriteInstrument(found.id)
        setFavoriteInstruments((prev) => prev.filter((v) => v !== instr))
      }
    } else {
      await favoriteInstrumentService.createFavoriteInstrument(instr)
      setFavoriteInstruments((prev) => [...prev, instr])
    }
  }

  if (!isPro) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Outlook</h1>
          <p className="text-text-secondary mt-1">Weekly market outlook and analysis.</p>
        </div>
        <div className="card p-12 text-center text-text-muted">
          <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Weekly outlook is a Pro feature.</p>
          <Button onClick={() => setShowUpgradeDialog(true)} className="mt-4">Upgrade to Pro</Button>
        </div>
        <UpgradeDialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)} />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Outlook</h1>
          <p className="text-text-secondary mt-1">Weekly market outlook and analysis.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }} leftIcon={<Plus className="w-4 h-4" />}>
          New Outlook
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-12 text-center text-text-muted">
          <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No outlooks yet. Create one to track your weekly analysis.</p>
        </div>
      ) : (
        <>
          <SelectionBar
            selecting={selecting}
            count={selectedIds.size}
            onCancel={cancelSelect}
            onDelete={() => setBatchDeleteCount(selectedIds.size)}
          />
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-sidebar/50">
                    {selecting && <th className="w-10 px-2 py-3"></th>}
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Week</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Direction</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Instrument</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Notes</th>
                    <th className="w-16 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {entries.map((entry) => {
                    const handlers = makeLongPress(entry.id);
                    const isSelected = selectedIds.has(entry.id);
                    return (
                      <tr key={entry.id}
                        {...handlers}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-hover'}`}
                        onClick={() => {
                          if (longPressTriggeredRef.current) { longPressTriggeredRef.current = false; return }
                          if (selecting) { toggleSelect(entry.id); return }
                          setViewingEntry(entry)
                        }}>
                        {selecting && (
                          <td className="px-2 py-3 w-10">
                            {isSelected ? (
                              <CheckCircle className="w-5 h-5 text-primary" />
                            ) : (
                              <Circle className="w-5 h-5 text-text-muted" />
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 font-medium text-text-primary whitespace-nowrap">
                          {formatWeekRange(new Date(entry.weekStart))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            entry.direction === 'sell'
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {entry.direction === 'sell' ? (
                              <><TrendingDown className="w-3 h-3" /> Sell Week</>
                            ) : (
                              <><TrendingUp className="w-3 h-3" /> Buy Week</>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-text-primary">{entry.instrument}</td>
                        <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">
                          {entry.notes || <span className="text-text-muted">--</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry.id) }}
                            className="p-1.5 text-text-muted hover:text-danger rounded transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={batchDeleteCount > 0}
        onClose={() => setBatchDeleteCount(0)}
        onConfirm={handleBatchDelete}
        title="Delete Outlooks"
        message={`Are you sure you want to delete ${batchDeleteCount} outlooks? This action cannot be undone.`}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget)
          setDeleteTarget(null)
        }}
        title="Delete Outlook"
        message="Are you sure you want to delete this outlook? This action cannot be undone."
      />

      {lightboxImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxImage(null)}>
          <div className="relative flex items-center justify-center max-w-5xl max-h-[92vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage} alt="" className="max-w-full max-h-[85vh] rounded-lg" />
            <button onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {viewingEntry && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 overflow-y-auto"
          onClick={() => setViewingEntry(null)}>
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-lg my-auto shadow-[0_6px_25px_rgba(0,0,0,0.08)]"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">Outlook Details</h2>
              <button onClick={() => setViewingEntry(null)} className="p-1 text-text-muted hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Week</label>
                  <p className="text-sm text-text-primary font-medium">
                    {formatWeekRange(new Date(viewingEntry.weekStart))}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Direction</label>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    viewingEntry.direction === 'sell'
                      ? 'bg-red-500/10 text-red-500'
                      : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {viewingEntry.direction === 'sell' ? (
                      <><TrendingDown className="w-3 h-3" /> Sell Week</>
                    ) : (
                      <><TrendingUp className="w-3 h-3" /> Buy Week</>
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Instrument</label>
                <p className="text-sm text-text-primary font-medium">{viewingEntry.instrument}</p>
              </div>

              {(viewingEntry.beforeImage || viewingEntry.afterImage) && (
                <div className="grid grid-cols-2 gap-4">
                  {viewingEntry.beforeImage && (
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">Before Week</label>
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-border cursor-pointer"
                        onClick={() => setLightboxImage(viewingEntry.beforeImage!)}>
                        <img src={viewingEntry.beforeImage} alt="Before Week" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      </div>
                    </div>
                  )}
                  {viewingEntry.afterImage && (
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1">After Week</label>
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-border cursor-pointer"
                        onClick={() => setLightboxImage(viewingEntry.afterImage!)}>
                        <img src={viewingEntry.afterImage} alt="After Week" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {viewingEntry.notes && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
                  <p className="text-sm text-text-secondary whitespace-pre-wrap">{viewingEntry.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => { setDeleteTarget(viewingEntry.id) }}
                  leftIcon={<Trash2 className="w-4 h-4" />}>Delete</Button>
                <Button type="button" onClick={() => openEdit(viewingEntry)}
                  leftIcon={<Edit2 className="w-4 h-4" />}>Edit</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 overflow-y-auto">
          <div className="bg-elevated rounded-2xl border border-border w-full max-w-lg my-auto shadow-[0_6px_25px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">{editingId ? 'Edit Outlook' : 'New Outlook'}</h2>
              <button onClick={() => { setShowForm(false); resetForm() }} className="p-1 text-text-muted hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <WeekPicker label="Week" value={weekStart.toISOString().slice(0, 10)}
                onChange={(iso) => setWeekStart(new Date(iso + 'T00:00:00'))} />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-secondary">Direction</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDirection('buy')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      direction === 'buy'
                        ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-[0_0_0_2px_rgba(16,185,129,0.12)]'
                        : 'bg-input/60 text-text-muted border border-border/80 hover:border-emerald-500/30'
                    }`}>
                    <TrendingUp className="w-4 h-4" />
                    Buy Week
                  </button>
                  <button type="button" onClick={() => setDirection('sell')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      direction === 'sell'
                        ? 'bg-red-500/15 text-red-500 border border-red-500/30 shadow-[0_0_0_2px_rgba(239,68,68,0.12)]'
                        : 'bg-input/60 text-text-muted border border-border/80 hover:border-red-500/30'
                    }`}>
                    <TrendingDown className="w-4 h-4" />
                    Sell Week
                  </button>
                </div>
              </div>

              <InstrumentSelect value={instrument}
                onChange={(v) => setInstrument(v)}
                groups={instrumentGroups}
                favorites={favoriteInstruments}
                onToggleFavorite={toggleFavorite} />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-secondary">Before Week</label>
                <div className="relative aspect-video rounded-xl border-2 border-dashed border-border bg-hover flex items-center justify-center overflow-hidden group cursor-pointer"
                  onClick={() => beforeInputRef.current?.click()}>
                  {beforeImage ? (
                    <>
                      <img src={beforeImage} alt="Before Week" className="w-full h-full object-cover" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeBefore() }}
                        className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-text-muted">
                      <Upload className="w-6 h-6" />
                      <span className="text-xs">Click to upload</span>
                    </div>
                  )}
                  <input ref={beforeInputRef} type="file" accept="image/*" className="hidden" onChange={handleBeforeFile} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-secondary">After Week</label>
                <div className="relative aspect-video rounded-xl border-2 border-dashed border-border bg-hover flex items-center justify-center overflow-hidden group cursor-pointer"
                  onClick={() => afterInputRef.current?.click()}>
                  {afterImage ? (
                    <>
                      <img src={afterImage} alt="After Week" className="w-full h-full object-cover" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeAfter() }}
                        className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-text-muted">
                      <Upload className="w-6 h-6" />
                      <span className="text-xs">Click to upload</span>
                    </div>
                  )}
                  <input ref={afterInputRef} type="file" accept="image/*" className="hidden" onChange={handleAfterFile} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-secondary">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                  className="block w-full rounded-xl border border-border px-3.5 py-2.5 text-sm bg-input text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.12)] transition-all resize-none"
                  placeholder="Add your weekly notes..." />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); resetForm() }}>Cancel</Button>
                <Button onClick={handleSave} isLoading={saving}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}