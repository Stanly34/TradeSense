import { useState, useEffect, useRef, useMemo } from 'react'
import { X, Target, AlertTriangle, TrendingUp, Building2, User, DollarSign, ChevronDown, ChevronRight, CheckSquare, Upload, Image, Lock, Sparkles, Plus, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, Trash2, Star } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Input } from '../ui/Input'
import { InstrumentSelect } from '../ui/InstrumentSelect'
import { DateTimePicker } from '../ui/DateTimePicker'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { UpgradeDialog } from '../ui/UpgradeDialog'
import { usePlan } from '../../hooks/usePlan'
import type { TradeFormData } from '../../types/trade'
import * as templateService from '../../services/templates'
import * as tagService from '../../services/tags'
import * as favoriteInstrumentService from '../../services/favoriteInstruments'
import type { Template, ChallengeProgress } from '../../services/templates'
import { parseTagContent } from '../../utils/tags'

const CONTRACT_SUFFIX = /(?:[FGHJKMNQUVXZ]\d{4})$/

const MONTH_CODES = ['F','G','H','J','K','M','N','Q','U','V','X','Z']

const CYCLE_MAP = {
  quarterly: { months: [2, 5, 8, 11], count: 4 },
  monthly:   { months: [0,1,2,3,4,5,6,7,8,9,10,11], count: 6 },
  gc:        { months: [1,3,5,7,9,11], count: 6 },
  si:        { months: [2,4,6,8,11], count: 5 },
} as const

type CycleKey = keyof typeof CYCLE_MAP

function getContractMonths(months: number[], count: number): string[] {
  const now = new Date()
  let y = now.getFullYear()
  let m = now.getMonth()
  const res: string[] = []
  while (res.length < count) {
    if (months.includes(m)) {
      if (y > now.getFullYear() || m >= now.getMonth()) {
        res.push(`${MONTH_CODES[m]}${y}`)
      }
    }
    if (++m > 11) { m = 0; y++ }
  }
  return res
}

interface InstrumentPreset {
  tickSize: number
  tickValue: number
  pointValue: number
  pipSize: number
  pipValue: number
}

function instrumentPreset(tickSize: number, tickValue: number, pointValue: number): InstrumentPreset {
  return { tickSize, tickValue, pointValue, pipSize: tickSize, pipValue: tickValue }
}

const INSTRUMENT_PRESETS: Record<string, InstrumentPreset> = {
  ES:  instrumentPreset(0.25, 12.5, 50),
  MES: instrumentPreset(0.25, 1.25, 5),
  NQ:  instrumentPreset(0.25, 5, 20),
  MNQ: instrumentPreset(0.25, 0.5, 2),
  YM:  instrumentPreset(1, 5, 5),
  MYM: instrumentPreset(1, 0.5, 0.5),
  RTY: instrumentPreset(0.10, 5, 50),
  M2K: instrumentPreset(0.10, 0.5, 5),
  CL:  instrumentPreset(0.01, 10, 1000),
  MCL: instrumentPreset(0.01, 1, 100),
  NG:  instrumentPreset(0.001, 10, 10000),
  MNG: instrumentPreset(0.001, 1, 1000),
  GC:  instrumentPreset(0.10, 10, 100),
  MGC: instrumentPreset(0.10, 1, 10),
  SI:  instrumentPreset(0.005, 25, 5000),
  SIL: instrumentPreset(0.005, 2.5, 500),
  '6E':  instrumentPreset(0.00005, 6.25, 125000),
  'M6E': instrumentPreset(0.00005, 0.625, 12500),
  '6B':  instrumentPreset(0.0001, 6.25, 62500),
  'M6B': instrumentPreset(0.0001, 0.625, 6250),
  '6J':  instrumentPreset(0.0000005, 6.25, 12500000),
  'M6J': instrumentPreset(0.0000005, 0.625, 1250000),
  '6A':  instrumentPreset(0.0001, 10, 100000),
  'M6A': instrumentPreset(0.0001, 1, 10000),
  '6C':  instrumentPreset(0.0001, 10, 100000),
  'M6C': instrumentPreset(0.0001, 1, 10000),
  '6S':  instrumentPreset(0.0001, 12.5, 125000),
  'M6S': instrumentPreset(0.0001, 1.25, 12500),
  BTC: instrumentPreset(5, 25, 5),
  MBT: instrumentPreset(5, 2.5, 0.5),
  ETH: instrumentPreset(0.25, 0.5, 2),
  MET: instrumentPreset(0.25, 0.05, 0.2),
  NAS100: { tickSize: 0.1, tickValue: 1, pointValue: 10, pipSize: 0.1, pipValue: 1 },
  US100:  { tickSize: 0.1, tickValue: 1, pointValue: 10, pipSize: 0.1, pipValue: 1 },
  US30:   { tickSize: 0.1, tickValue: 1, pointValue: 10, pipSize: 0.1, pipValue: 1 },
  SPX500: { tickSize: 0.1, tickValue: 1, pointValue: 10, pipSize: 0.1, pipValue: 1 },
  EURUSD: { tickSize: 0.0001, tickValue: 10, pointValue: 100000, pipSize: 0.0001, pipValue: 10 },
  GBPUSD: { tickSize: 0.0001, tickValue: 10, pointValue: 100000, pipSize: 0.0001, pipValue: 10 },
  AUDUSD: { tickSize: 0.0001, tickValue: 10, pointValue: 100000, pipSize: 0.0001, pipValue: 10 },
  NZDUSD: { tickSize: 0.0001, tickValue: 10, pointValue: 100000, pipSize: 0.0001, pipValue: 10 },
  USDCAD: { tickSize: 0.0001, tickValue: 10, pointValue: 100000, pipSize: 0.0001, pipValue: 10 },
  USDCHF: { tickSize: 0.0001, tickValue: 10, pointValue: 100000, pipSize: 0.0001, pipValue: 10 },
  USDJPY: { tickSize: 0.01, tickValue: 10, pointValue: 100000, pipSize: 0.01, pipValue: 10 },
  XAUUSD: { tickSize: 0.01, tickValue: 10, pointValue: 100, pipSize: 0.01, pipValue: 10 },
  XAGUSD: { tickSize: 0.001, tickValue: 5, pointValue: 5000, pipSize: 0.001, pipValue: 5 },
}

interface RootDef {
  value: string
  name: string
  tickLabel: string
  cycle?: CycleKey
}

const ROOTS: { label: string; items: RootDef[] }[] = [
  {
    label: 'Equity Index Futures',
    items: [
      { value: 'ES', name: 'E-mini S&P 500', tickLabel: '$50/pt', cycle: 'quarterly' },
      { value: 'MES', name: 'Micro S&P 500', tickLabel: '$5/pt', cycle: 'quarterly' },
      { value: 'NQ', name: 'E-mini Nasdaq', tickLabel: '$20/pt', cycle: 'quarterly' },
      { value: 'MNQ', name: 'Micro Nasdaq', tickLabel: '$2/pt', cycle: 'quarterly' },
      { value: 'YM', name: 'Mini Dow', tickLabel: '$5/pt', cycle: 'quarterly' },
      { value: 'MYM', name: 'Micro Dow', tickLabel: '$0.50/pt', cycle: 'quarterly' },
      { value: 'RTY', name: 'E-mini Russell', tickLabel: '$50/pt', cycle: 'quarterly' },
      { value: 'M2K', name: 'Micro Russell', tickLabel: '$5/pt', cycle: 'quarterly' },
    ],
  },
  {
    label: 'Energy',
    items: [
      { value: 'CL', name: 'Crude Oil', tickLabel: '$1000/pt', cycle: 'monthly' },
      { value: 'MCL', name: 'Micro Crude', tickLabel: '$100/pt', cycle: 'monthly' },
      { value: 'NG', name: 'Natural Gas', tickLabel: '$10000/pt', cycle: 'monthly' },
      { value: 'MNG', name: 'Micro Natural Gas', tickLabel: '$1000/pt', cycle: 'monthly' },
    ],
  },
  {
    label: 'Metals',
    items: [
      { value: 'GC', name: 'Gold', tickLabel: '$100/pt', cycle: 'gc' },
      { value: 'MGC', name: 'Micro Gold', tickLabel: '$10/pt', cycle: 'gc' },
      { value: 'SI', name: 'Silver', tickLabel: '$5000/pt', cycle: 'si' },
      { value: 'SIL', name: 'Micro Silver', tickLabel: '$500/pt', cycle: 'si' },
    ],
  },
  {
    label: 'Currency Futures',
    items: [
      { value: '6E', name: 'Euro FX', tickLabel: '$125000/pt', cycle: 'quarterly' },
      { value: 'M6E', name: 'Micro Euro', tickLabel: '$12500/pt', cycle: 'quarterly' },
      { value: '6B', name: 'British Pound', tickLabel: '$62500/pt', cycle: 'quarterly' },
      { value: 'M6B', name: 'Micro Pound', tickLabel: '$6250/pt', cycle: 'quarterly' },
      { value: '6J', name: 'Japanese Yen', tickLabel: '¥12500000/pt', cycle: 'quarterly' },
      { value: 'M6J', name: 'Micro Yen', tickLabel: '¥1250000/pt', cycle: 'quarterly' },
      { value: '6A', name: 'Aussie Dollar', tickLabel: '$100000/pt', cycle: 'quarterly' },
      { value: 'M6A', name: 'Micro Aussie', tickLabel: '$10000/pt', cycle: 'quarterly' },
      { value: '6C', name: 'Canadian Dollar', tickLabel: '$100000/pt', cycle: 'quarterly' },
      { value: 'M6C', name: 'Micro Canadian', tickLabel: '$10000/pt', cycle: 'quarterly' },
      { value: '6S', name: 'Swiss Franc', tickLabel: '$125000/pt', cycle: 'quarterly' },
      { value: 'M6S', name: 'Micro Swiss', tickLabel: '$12500/pt', cycle: 'quarterly' },
    ],
  },
  {
    label: 'Crypto',
    items: [
      { value: 'BTC', name: 'Bitcoin', tickLabel: '$5/pt', cycle: 'monthly' },
      { value: 'MBT', name: 'Micro Bitcoin', tickLabel: '$0.50/pt', cycle: 'monthly' },
      { value: 'ETH', name: 'Ether', tickLabel: '$2/pt', cycle: 'monthly' },
      { value: 'MET', name: 'Micro Ether', tickLabel: '$0.20/pt', cycle: 'monthly' },
    ],
  },
  {
    label: 'CFDs',
    items: [
      { value: 'NAS100', name: 'US100 (Nasdaq)', tickLabel: '' },
      { value: 'US30', name: 'Dow Jones', tickLabel: '' },
      { value: 'SPX500', name: 'S&P 500', tickLabel: '' },
    ],
  },
  {
    label: 'Forex',
    items: [
      { value: 'EURUSD', name: 'Euro / US Dollar', tickLabel: '' },
      { value: 'GBPUSD', name: 'British Pound / US Dollar', tickLabel: '' },
      { value: 'AUDUSD', name: 'Australian Dollar / US Dollar', tickLabel: '' },
      { value: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', tickLabel: '' },
      { value: 'USDCAD', name: 'US Dollar / Canadian Dollar', tickLabel: '' },
      { value: 'USDCHF', name: 'US Dollar / Swiss Franc', tickLabel: '' },
      { value: 'USDJPY', name: 'US Dollar / Japanese Yen', tickLabel: '' },
      { value: 'XAUUSD', name: 'Gold vs US Dollar', tickLabel: '' },
      { value: 'XAGUSD', name: 'Silver vs US Dollar', tickLabel: '' },
    ],
  },
]

const FUTURES_ROOTS = new Set(
  ROOTS.flatMap((g) => g.items.filter((r) => r.cycle).map((r) => r.value))
)

const SORTED_FUTURES_ROOTS = [...FUTURES_ROOTS].sort((a, b) => b.length - a.length)

function isFuturesRoot(instrument: string): boolean {
  if (!instrument) return false
  const stripped = instrument.toUpperCase().trim().replace(CONTRACT_SUFFIX, '').replace(/1!$/, '').trim()
  return SORTED_FUTURES_ROOTS.some((root) => stripped === root || stripped.startsWith(root))
}

function getFrontMonth(cycle: CycleKey): string {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const { months } = CYCLE_MAP[cycle]
  for (const m of months) {
    if (m >= currentMonth) {
      return `${MONTH_CODES[m]}${currentYear}`
    }
  }
  return `${MONTH_CODES[months[0]]}${currentYear + 1}`
}

function getInstrumentGroups() {
  return ROOTS.map((group) => ({
    label: group.label,
    items: group.items.flatMap((r) => {
      if (!r.cycle) return [{ value: r.value, label: r.name }]
      const front = getFrontMonth(r.cycle)
      return [
        { value: `${r.value}${front}`, label: `${r.value} ${front}` },
        { value: `${r.value}1!`, label: `${r.value} 1!` },
      ]
    }),
  }))
}

function lookupInstrument(raw: string): InstrumentPreset | null {
  const stripped = raw.toUpperCase().trim().replace(CONTRACT_SUFFIX, '').replace(/1!$/, '')
  const keys = Object.keys(INSTRUMENT_PRESETS).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (stripped === key || stripped.startsWith(key)) return INSTRUMENT_PRESETS[key]
  }
  return null
}

interface TradeFormProps {
  initial?: Partial<TradeFormData>
  onSubmit: (data: TradeFormData) => Promise<void>
  onClose: () => void
  title?: string
  addAnother?: boolean
  noFrame?: boolean
  existingImagesCount?: number
}

export function TradeForm({ initial, onSubmit, onClose, title = 'New Journal', addAnother, noFrame, existingImagesCount = 0 }: TradeFormProps) {
  const { isAtImageLimit, plan, isPro } = usePlan()
  const [form, setForm] = useState<TradeFormData>({
    instrument: initial?.instrument || '',
    direction: initial?.direction || 'LONG',
    entryPrice: initial?.entryPrice,
    exitPrice: initial?.exitPrice,
    stopLoss: initial?.stopLoss,
    takeProfit: initial?.takeProfit,
    quantity: initial?.quantity,
    fees: initial?.fees ?? undefined,
    broker: initial?.broker || '',
    account: initial?.account || '',
    session: initial?.session,
    marketBias: initial?.marketBias,
    entryTime: initial?.entryTime,
    exitTime: initial?.exitTime,
    status: initial?.status || 'COMPLETED',
    result: initial?.result,
    riskReward: initial?.riskReward,
    notes: initial?.notes || '',
    reason: initial?.reason || '',
    mistakes: initial?.mistakes || '',
    templateId: initial?.templateId,
    pipSize: initial?.pipSize,
    pipValue: initial?.pipValue,
    checklistData: initial?.checklistData || {},
  })
  const [isLoading, setIsLoading] = useState(false)
  const [resetNext, setResetNext] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [partialExits, setPartialExits] = useState<Array<{ quantity?: number; exitPrice?: number; exitTime?: string }>>(initial?._partialExits || [])
  const [showPartialClose, setShowPartialClose] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (resetNext) {
      submitRef.current?.click()
    }
  }, [resetNext])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.instrument) errs.instrument = 'Instrument is required'
    if (!form.direction) errs.direction = 'Direction is required'
    if (!form.entryPrice) errs.entryPrice = 'Entry price is required'
    else if (Number(form.entryPrice) <= 0) errs.entryPrice = 'Entry price must be greater than 0'
    if (!form.exitPrice) errs.exitPrice = 'Exit price is required'
    else if (Number(form.exitPrice) <= 0) errs.exitPrice = 'Exit price must be greater than 0'
    if (!form.quantity) errs.quantity = 'Quantity is required'
    else if (Number(form.quantity) <= 0) errs.quantity = 'Quantity must be greater than 0'
    else {
      const qtyIsFutures = form.templateId
        ? (accounts.find((a) => a.id === form.templateId)?.defaultValues as Record<string, unknown> | undefined)?.marketType === 'FUTURES'
        : isFuturesRoot(form.instrument)
      if (qtyIsFutures && !Number.isInteger(Number(form.quantity))) {
        errs.quantity = 'Futures quantity must be a whole number'
      } else if (qtyIsFutures && Number(form.quantity) < 1) {
        errs.quantity = 'Minimum quantity is 1'
      }
    }
    if (!form.stopLoss) errs.stopLoss = 'Stop loss is required'
    else if (Number(form.stopLoss) <= 0) errs.stopLoss = 'Stop loss must be greater than 0'
    if (!form.takeProfit) errs.takeProfit = 'Take profit is required'
    else if (Number(form.takeProfit) <= 0) errs.takeProfit = 'Take profit must be greater than 0'
    if (form.fees !== undefined && form.fees !== null && Number(form.fees) < 0) errs.fees = 'Fees cannot be negative'
    if (!form.entryTime) errs.entryTime = 'Entry time is required'
    if (!form.exitTime) errs.exitTime = 'Exit time is required'
    if (form.entryTime && form.exitTime && new Date(form.exitTime) <= new Date(form.entryTime)) {
      errs.exitTime = 'Exit time must be later than entry time'
    }
    if (form.entryPrice && form.exitPrice && form.direction === 'LONG' && form.result === 'WIN' && form.exitPrice <= form.entryPrice) {
      errs.exitPrice = 'Exit must be above entry for LONG'
    }
    if (form.entryPrice && form.exitPrice && form.direction === 'SHORT' && form.result === 'WIN' && form.exitPrice >= form.entryPrice) {
      errs.exitPrice = 'Exit must be below entry for SHORT'
    }
    setErrors(errs)
    const valid = Object.keys(errs).length === 0
    if (!valid) {
      const firstKey = Object.keys(errs)[0]
      const el = document.getElementById(firstKey)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus()
      } else {
        requestAnimationFrame(() => {
          formRef.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' })
            ?? formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    }
    return valid
  }
  const [accounts, setAccounts] = useState<Template[]>([])
  const [favoriteInstruments, setFavoriteInstruments] = useState<string[]>([])
  const [progress, setProgress] = useState<ChallengeProgress | null>(null)
  const [checklistTags, setChecklistTags] = useState<Array<{ id: string; name: string; content: string | null }>>([])
  const [showChecklist, setShowChecklist] = useState(false)
  const [hideChecklist, setHideChecklist] = useState(() => localStorage.getItem('tradesense_hide_checklist') === 'true')
  const [expandedChecklistId, setExpandedChecklistId] = useState<string | null>(null)
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
  const [showMultiSelect, setShowMultiSelect] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const templateDefaultsRef = useRef<{ pipSize: number; pipValue: number }>({ pipSize: 1, pipValue: 1 })
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const previewRef = useRef<HTMLDivElement>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const uploadMenuRef = useRef<HTMLDivElement>(null)
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)
  const accountDropdownRef = useRef<HTMLDivElement>(null)

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }, [accounts])

  async function handleToggleFavorite(id: string) {
    try {
      const updated = await templateService.toggleFavorite(id)
      setAccounts((prev) => {
        const next = prev.map((a) => a.id === id ? { ...a, isFavorite: updated.isFavorite } : a)
        next.sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        return next
      })
    } catch {}
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false)
      }
    }
    if (accountDropdownOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [accountDropdownOpen])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node)) {
        setShowUploadMenu(false)
      }
    }
    if (showUploadMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showUploadMenu])

  const ZOOM_LEVELS = [1, 1.5, 2]

  function resetLightbox() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setIsDragging(false)
  }

  function renderLightbox() {
    if (previewIndex === null || !pendingPreviews[previewIndex]) return null
    const src = pendingPreviews[previewIndex]
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
        onClick={() => { resetLightbox(); setPreviewIndex(null) }}>
        <div ref={previewRef} className="relative flex items-center justify-center max-w-5xl max-h-[92vh] w-full h-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => { if (zoom > 1) { setIsDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); (e.target as HTMLElement).style.cursor = 'grabbing' } }}
          onMouseMove={(e) => { if (isDragging && zoom > 1) { setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }) } }}
          onMouseUp={() => { setIsDragging(false); if (previewRef.current) previewRef.current.style.cursor = '' }}
          onMouseLeave={() => { setIsDragging(false); if (previewRef.current) previewRef.current.style.cursor = '' }}
          onWheel={(e) => { e.preventDefault(); setZoom(z => { const idx = ZOOM_LEVELS.indexOf(z); const next = e.deltaY < 0 ? Math.min(ZOOM_LEVELS.length - 1, idx + 1) : Math.max(0, idx - 1); if (idx === next) return z; setPan({ x: 0, y: 0 }); return ZOOM_LEVELS[next] }) }}>
          <img src={src} alt="" draggable={false}
            className="max-w-full max-h-[85vh] rounded-lg transition-transform duration-100 select-none"
            style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, cursor: zoom > 1 ? 'grab' : '' }} />
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={() => setZoom(z => { const idx = ZOOM_LEVELS.indexOf(z); if (idx >= ZOOM_LEVELS.length - 1) return z; setPan({ x: 0, y: 0 }); return ZOOM_LEVELS[idx + 1] })}
              className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
              <ZoomIn className="w-5 h-5" />
            </button>
            <button onClick={() => setZoom(z => { const idx = ZOOM_LEVELS.indexOf(z); if (idx <= 0) return z; setPan({ x: 0, y: 0 }); return ZOOM_LEVELS[idx - 1] })}
              className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
              <ZoomOut className="w-5 h-5" />
            </button>
            <button onClick={() => { resetLightbox() }}
              className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
              <RotateCcw className="w-5 h-5" />
            </button>
            <button onClick={() => { resetLightbox(); setPreviewIndex(null) }}
              className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {previewIndex > 0 && (
            <button onClick={(e) => { e.stopPropagation(); resetLightbox(); setPreviewIndex(previewIndex - 1) }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {previewIndex < pendingPreviews.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); resetLightbox(); setPreviewIndex(previewIndex + 1) }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
            {Math.round(zoom * 100)}%
          </div>
        </div>
      </div>
    )
  }

  function toggleChecklistItem(tagId: string, itemName: string) {
    setForm((prev) => {
      const current = prev.checklistData?.[tagId] || []
      const checked = current.includes(itemName)
        ? current.filter((n) => n !== itemName)
        : [...current, itemName]
      return { ...prev, checklistData: { ...prev.checklistData, [tagId]: checked } }
    })
  }

  useEffect(() => {
    Promise.all([
      templateService.listTemplates(),
      templateService.getAllProgressStatuses(),
    ]).then(([all, statuses]) => {
      setAccounts(all.filter((t) => {
        if (t.type === 'PERSONAL_ACCOUNT') return true
        if (t.type === 'PROP_FIRM') return statuses[t.id] !== 'PASSED' && statuses[t.id] !== 'FAILED'
        return false
      }))
    }).catch(() => {})
    favoriteInstrumentService.listFavoriteInstruments().then((favs) => {
      setFavoriteInstruments(favs.map((f) => f.instrument))
    }).catch(() => {})
    tagService.listTags().then(setChecklistTags).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.templateId) { setProgress(null); return }
    const tpl = accounts.find((a) => a.id === form.templateId)
    if (!tpl) return
    const dv = tpl.defaultValues || {}
    const marketType = dv.marketType as string | undefined
    let defaultPipSize = 1
    let defaultPipValue = 1
    if (dv.pipSize != null && dv.pipValue != null) {
      defaultPipSize = dv.pipSize as number
      defaultPipValue = dv.pipValue as number
    } else if (marketType === 'FOREX') {
      defaultPipSize = 0.0001
      defaultPipValue = 10
    }
    const isFuturesTpl = tpl.type === 'PROP_FIRM' && marketType === 'FUTURES'
    setForm((prev) => {
      const next: Partial<typeof prev> = {
        broker: (dv.platform as string) || (dv.broker as string) || prev.broker,
        account: (dv.accountLabel as string) || prev.account,
        pipSize: prev.pipSize ?? defaultPipSize,
        pipValue: prev.pipValue ?? defaultPipValue,
      }
      if (prev.quantity === undefined && !initial) {
        next.quantity = isFuturesTpl ? 1 : 0.01
      }
      return { ...prev, ...next }
    })
    templateDefaultsRef.current = { pipSize: defaultPipSize, pipValue: defaultPipValue }
    if (tpl.type === 'PROP_FIRM') {
      templateService.getChallengeProgress(form.templateId).then(setProgress).catch(() => setProgress(null))
    } else {
      setProgress(null)
    }
  }, [form.templateId, accounts])

  const prevInstrumentRef = useRef(form.instrument)
  useEffect(() => {
    const instr = form.instrument.toUpperCase().trim()
    if (prevInstrumentRef.current === instr) return
    prevInstrumentRef.current = instr
    const preset = instr ? lookupInstrument(instr) : null
    setForm((prev) => ({
      ...prev,
      pipSize: preset ? preset.pipSize : (prev.pipSize ?? templateDefaultsRef.current.pipSize),
      pipValue: preset ? preset.pipValue : (prev.pipValue ?? templateDefaultsRef.current.pipValue),
    }))
  }, [form.instrument])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    const willReset = resetNext
    setResetNext(false)
    try {
      const ids = selectedTemplateIds.length > 0 ? selectedTemplateIds : (form.templateId ? [form.templateId] : [])
      const completePartialExits = partialExits.filter((pe): pe is { quantity: number; exitPrice: number; exitTime?: string } => pe.quantity != null && pe.exitPrice != null && pe.quantity > 0)
      for (const id of ids) {
        await onSubmit({ ...form, fees: form.fees ?? 0, templateId: id, _pendingImages: pendingFiles, _partialExits: completePartialExits.length > 0 ? completePartialExits : undefined })
      }
      if (ids.length === 0) {
        await onSubmit({ ...form, fees: form.fees ?? 0, _pendingImages: pendingFiles, _partialExits: completePartialExits.length > 0 ? completePartialExits : undefined })
      }
      if (willReset) {
        setForm({
          instrument: '',
          direction: 'LONG',
          entryPrice: undefined,
          exitPrice: undefined,
          stopLoss: undefined,
          takeProfit: undefined,
          quantity: undefined,
          fees: undefined,
          broker: '',
          account: '',
          session: undefined,
          marketBias: undefined,
          entryTime: undefined,
          exitTime: undefined,
          status: 'COMPLETED',
          result: undefined,
          riskReward: undefined,
          notes: '',
          reason: '',
          mistakes: '',
          templateId: undefined,
          checklistData: {},
        })
        setPendingFiles([])
        setPendingPreviews([])
        setSelectedTemplateIds([])
      }
    } finally {
      setIsLoading(false)
    }
  }

  function set<K extends keyof TradeFormData>(key: K, value: TradeFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files)
    setPendingFiles((prev) => [...prev, ...newFiles])
    newFiles.forEach((f) => {
      const reader = new FileReader()
      reader.onload = () => {
        setPendingPreviews((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(f)
    })
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
    setPendingPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      setPendingFiles((prev) => [...prev, ...files])
      files.forEach((f) => {
        const reader = new FileReader()
        reader.onload = () => setPendingPreviews((prev) => [...prev, reader.result as string])
        reader.readAsDataURL(f)
      })
      setShowUploadMenu(false)
    }
  }

  const selectedTemplate = accounts.find((a) => a.id === form.templateId)
  const selectedDV = selectedTemplate?.defaultValues || {}
  const isFuturesAccount = selectedTemplate?.type === 'PROP_FIRM' && selectedDV.marketType === 'FUTURES'
    || (!selectedTemplate && isFuturesRoot(form.instrument))

  const instrumentGroups = useMemo(() => getInstrumentGroups(), [])

  const allowedGroups = useMemo(() => {
    const marketType = selectedDV.marketType as string | undefined
    if (!marketType) return instrumentGroups
    if (marketType === 'FOREX') return instrumentGroups.filter((g) => g.label === 'CFDs' || g.label === 'Forex')
    return instrumentGroups.filter((g) => g.label !== 'CFDs' && g.label !== 'Forex')
  }, [selectedDV.marketType, instrumentGroups])

  const renderFormContent = () => (
    <>
      {isAtImageLimit === false && accounts.length > 0 ? (
        <>
          <div className="space-y-1.5" ref={accountDropdownRef}>
            <label className="block text-sm font-medium text-text-secondary">Account / Challenge</label>
            <button type="button" onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className={cn(
                'flex items-center gap-2 w-full rounded-xl border border-border/80 px-3.5 py-2.5 text-sm bg-input/60 backdrop-blur-sm transition-all duration-200',
                'hover:border-primary/40',
                accountDropdownOpen && 'border-primary shadow-[0_0_0_2px_rgba(124,58,237,0.12)]',
              )}>
              <span className={cn('flex-1 text-left', !form.templateId && 'text-text-muted')}>
                {form.templateId
                  ? accounts.find((a) => a.id === form.templateId)?.name || 'None (manual entry)'
                  : 'None (manual entry)'}
              </span>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${accountDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {accountDropdownOpen && (
              <div className="relative">
                <div className="absolute z-50 top-1 left-0 w-full bg-glass/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto">
                  <button key="" type="button" onClick={() => { set('templateId', null); setShowMultiSelect(false); setSelectedTemplateIds([]); setAccountDropdownOpen(false) }}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 text-sm transition-colors',
                      !form.templateId && !showMultiSelect ? 'bg-primary/15 text-primary-light' : 'text-text-secondary hover:bg-card'
                    )}>
                    None (manual entry)
                  </button>
                  {sortedAccounts.map((a) => (
                    <div key={a.id}
                      className={cn(
                        'flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors',
                        form.templateId === a.id ? 'bg-primary/15 text-primary-light' : 'text-text-secondary hover:bg-card'
                      )}>
                      <button type="button" onClick={() => { set('templateId', a.id); setShowMultiSelect(false); setSelectedTemplateIds([]); setAccountDropdownOpen(false) }}
                        className="flex-1 text-left">
                        {a.type === 'PROP_FIRM' ? '🏦 ' : '👤 '}{a.name}
                      </button>
                      <button type="button" onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => handleToggleFavorite(a.id)}
                        className="shrink-0 p-0.5 rounded hover:bg-hover transition-colors">
                        <Star className={cn('w-3.5 h-3.5', a.isFavorite ? 'fill-warning text-warning' : 'text-text-muted')} />
                      </button>
                    </div>
                  ))}
                  <button key="__multiple__" type="button" onClick={() => { setShowMultiSelect(true); set('templateId', null); setAccountDropdownOpen(false) }}
                    className={cn(
                      'w-full text-left px-3.5 py-2.5 text-sm transition-colors',
                      showMultiSelect ? 'bg-primary/15 text-primary-light' : 'text-text-secondary hover:bg-card'
                    )}>
                    ➕ Multiple accounts
                  </button>
                </div>
              </div>
            )}
          </div>

          {showMultiSelect && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">Select accounts</label>
              <div className="bg-hover rounded-xl border border-border p-3 space-y-1 max-h-48 overflow-y-auto">
                {sortedAccounts.map((a) => (
                  <label key={a.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-card cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedTemplateIds.includes(a.id)}
                      onChange={(e) => {
                        setSelectedTemplateIds((prev) =>
                          e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id))
                      }}
                      className="accent-primary w-4 h-4 rounded border-border" />
                    <span className="flex-1 text-sm text-text-primary">{a.type === 'PROP_FIRM' ? '🏦 ' : '👤 '}{a.name}</span>
                    <button type="button" onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => handleToggleFavorite(a.id)}
                      className="shrink-0 p-0.5 rounded hover:bg-hover transition-colors">
                      <Star className={cn('w-3.5 h-3.5', a.isFavorite ? 'fill-warning text-warning' : 'text-text-muted')} />
                    </button>
                  </label>
                ))}
              </div>
              {selectedTemplateIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplateIds.map((id) => {
                    const a = accounts.find((x) => x.id === id)
                    if (!a) return null
                    return (
                      <span key={id} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg bg-primary/10 text-primary-light">
                        {a.name}
                        <button type="button" onClick={() => setSelectedTemplateIds((prev) => prev.filter((x) => x !== id))} className="hover:text-danger transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-1.5" ref={accountDropdownRef}>
          <label className="block text-sm font-medium text-text-secondary">Account / Challenge</label>
          <button type="button" onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            className={cn(
              'flex items-center gap-2 w-full rounded-xl border border-border/80 px-3.5 py-2.5 text-sm bg-input/60 backdrop-blur-sm transition-all duration-200',
              'hover:border-primary/40',
              accountDropdownOpen && 'border-primary shadow-[0_0_0_2px_rgba(124,58,237,0.12)]',
            )}>
            <span className={cn('flex-1 text-left', !form.templateId && 'text-text-muted')}>
              {form.templateId
                ? accounts.find((a) => a.id === form.templateId)?.name || 'None (manual entry)'
                : 'None (manual entry)'}
            </span>
            <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${accountDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {accountDropdownOpen && (
            <div className="relative">
              <div className="absolute z-50 top-1 left-0 w-full bg-glass/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto">
                <button key="" type="button" onClick={() => { set('templateId', null); setAccountDropdownOpen(false) }}
                  className={cn(
                    'w-full text-left px-3.5 py-2.5 text-sm transition-colors',
                    !form.templateId ? 'bg-primary/15 text-primary-light' : 'text-text-secondary hover:bg-card'
                  )}>
                  None (manual entry)
                </button>
                {sortedAccounts.map((a) => (
                  <div key={a.id}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors',
                      form.templateId === a.id ? 'bg-primary/15 text-primary-light' : 'text-text-secondary hover:bg-card'
                    )}>
                    <button type="button" onClick={() => { set('templateId', a.id); setAccountDropdownOpen(false) }}
                      className="flex-1 text-left">
                      {a.type === 'PROP_FIRM' ? '🏦 ' : '👤 '}{a.name}
                    </button>
                    <button type="button" onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => handleToggleFavorite(a.id)}
                      className="shrink-0 p-0.5 rounded hover:bg-hover transition-colors">
                      <Star className={cn('w-3.5 h-3.5', a.isFavorite ? 'fill-warning text-warning' : 'text-text-muted')} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTemplate && selectedTemplate.type === 'PROP_FIRM' && (
        <div className="bg-hover rounded-xl border border-border p-3 flex items-center gap-3">
          <Building2 className="w-4 h-4 text-primary-light" />
          <span className="flex-1 text-sm font-medium text-text-primary">{selectedTemplate.name}</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary-light">
            {progress?.status === 'PASSED' ? 'Funded' : 'Evaluation'}
          </span>
        </div>
      )}

      {selectedTemplate && selectedTemplate.type === 'PERSONAL_ACCOUNT' && (
        <div className="bg-hover rounded-xl border border-border p-3 flex items-center gap-3">
          <User className="w-4 h-4 text-info" />
          <span className="text-sm font-medium text-text-primary">{selectedTemplate.name}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <InstrumentSelect value={form.instrument}
            onChange={(v) => { setErrors((p) => ({ ...p, instrument: '' })); set('instrument', v) }}
            groups={allowedGroups}
            favorites={favoriteInstruments}
            error={errors.instrument}
            onToggleFavorite={async (instr) => {
              if (favoriteInstruments.includes(instr)) {
                const existing = await favoriteInstrumentService.listFavoriteInstruments()
                const match = existing.find((f) => f.instrument === instr)
                if (match) {
                  await favoriteInstrumentService.deleteFavoriteInstrument(match.id)
                  setFavoriteInstruments((prev) => prev.filter((f) => f !== instr))
                }
              } else {
                await favoriteInstrumentService.createFavoriteInstrument(instr)
                setFavoriteInstruments((prev) => [...prev, instr])
              }
            }} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-secondary">Direction</label>
          <div className="flex gap-2">
            {(['LONG', 'SHORT'] as const).map((d) => (
              <button key={d} type="button" onClick={() => { setErrors((p) => ({ ...p, direction: '' })); set('direction', d) }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                  form.direction === d
                    ? d === 'LONG' ? 'bg-success/10 border-success text-success' : 'bg-danger/10 border-danger text-danger'
                    : 'bg-input border-border text-text-secondary hover:bg-hover'
                }`}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          {errors.direction && <p className="text-xs text-danger">{errors.direction}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input id="entryPrice" label="Entry Price" type="number" step="any" placeholder="0.00"
          value={form.entryPrice ?? ''} onChange={(e) => { setErrors((p) => ({ ...p, entryPrice: '' })); set('entryPrice', e.target.value ? parseFloat(e.target.value) : undefined) }}
          error={errors.entryPrice} />
        <Input id="exitPrice" label="Exit Price" type="number" step="any" placeholder="0.00"
          value={form.exitPrice ?? ''} onChange={(e) => { setErrors((p) => ({ ...p, exitPrice: '' })); set('exitPrice', e.target.value ? parseFloat(e.target.value) : undefined) }}
          error={errors.exitPrice} />
        {isFuturesAccount ? (
          <Input id="quantity" label="Quantity" type="text" inputMode="numeric" min="1" placeholder="1"
            value={form.quantity ?? ''}
            onChange={(e) => {
              setErrors((p) => ({ ...p, quantity: '' }))
              const digits = e.target.value.replace(/\D/g, '')
              if (digits === '') { set('quantity', undefined); return }
              const val = parseInt(digits, 10)
              if (val === 0) { setErrors((p) => ({ ...p, quantity: 'Minimum quantity is 1.' })); return }
              set('quantity', val)
            }}
            error={errors.quantity} />
        ) : (
          <Input id="quantity" label="Quantity" type="number" step="0.01" min="0.01" placeholder="0.01"
            value={form.quantity ?? ''}
            onChange={(e) => { setErrors((p) => ({ ...p, quantity: '' })); set('quantity', e.target.value ? parseFloat(e.target.value) : undefined) }}
            error={errors.quantity} />
        )}
      </div>

      <div className="border border-border rounded-xl">
        <button type="button" onClick={() => setShowPartialClose(!showPartialClose)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-primary hover:bg-hover transition-colors">
          <span>Partial Close</span>
          {showPartialClose ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
        </button>
        {showPartialClose && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            {partialExits.map((pe, i) => {
              const isFuturesQty = isFuturesRoot(form.instrument) || (selectedTemplate?.type === 'PROP_FIRM' && selectedDV.marketType === 'FUTURES')
              return (
              <div key={i} className="p-3 rounded-xl bg-hover space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <input type="number" step={isFuturesQty ? "1" : "any"} min={isFuturesQty ? "1" : "0"} placeholder="Qty"
                      value={pe.quantity ?? ''}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      onChange={(e) => {
                        const next = [...partialExits]
                        const raw = e.target.value
                        next[i] = { ...next[i], quantity: isFuturesQty ? (parseInt(raw) || 0) : (raw === '' ? undefined : parseFloat(raw)) }
                        setPartialExits(next)
                      }}
                      className="block w-full rounded-lg border border-border px-3 py-1.5 text-sm bg-input text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <div className="flex-1">
                    <input type="number" step="any" placeholder="Exit price"
                      value={pe.exitPrice ?? ''}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      onChange={(e) => {
                        const next = [...partialExits]
                        const raw = e.target.value
                        next[i] = { ...next[i], exitPrice: raw === '' ? undefined : parseFloat(raw) }
                        setPartialExits(next)
                      }}
                      className="block w-full rounded-lg border border-border px-3 py-1.5 text-sm bg-input text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary transition-all" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <DateTimePicker value={pe.exitTime}
                      onChange={(iso) => {
                        const next = [...partialExits]
                        next[i] = { ...next[i], exitTime: iso || undefined }
                        setPartialExits(next)
                      }}
                      session={form.session} />
                  </div>
                  <button type="button" onClick={() => setPartialExits(partialExits.filter((_, j) => j !== i))}
                    className="flex items-center justify-center p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              )
            })}
            <button type="button" onClick={() => setPartialExits([...partialExits, {}])}
              className="flex items-center gap-2 text-sm text-primary-light hover:text-primary font-medium transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Add Exit
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input id="stopLoss" label="Stop Loss" type="number" step="any" placeholder="0.00"
          value={form.stopLoss ?? ''} onChange={(e) => { setErrors((p) => ({ ...p, stopLoss: '' })); set('stopLoss', e.target.value ? parseFloat(e.target.value) : undefined) }}
          error={errors.stopLoss} />
        <Input id="takeProfit" label="Take Profit" type="number" step="any" placeholder="0.00"
          value={form.takeProfit ?? ''} onChange={(e) => { setErrors((p) => ({ ...p, takeProfit: '' })); set('takeProfit', e.target.value ? parseFloat(e.target.value) : undefined) }}
          error={errors.takeProfit} />
        <Input id="fees" label="Fees" type="number" step="any" placeholder="0"
          value={form.fees ?? ''} onChange={(e) => { setErrors((p) => ({ ...p, fees: '' })); set('fees', e.target.value === '' ? undefined : parseFloat(e.target.value)) }}
          error={errors.fees} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select label="Session" value={form.session || ''}
          onChange={(v) => set('session', v ? v as TradeFormData['session'] : undefined)}
          placeholder="Select session"
          options={[
            { value: 'ASIA', label: 'Asia' },
            { value: 'LONDON', label: 'London' },
            { value: 'NEW_YORK', label: 'New York' },
            { value: 'CUSTOM', label: 'Custom' },
          ]} />
        <Select label="Market Bias" value={form.marketBias || ''}
          onChange={(v) => set('marketBias', v ? v as TradeFormData['marketBias'] : undefined)}
          placeholder="Select bias"
          options={[
            { value: 'BULLISH', label: 'Bullish' },
            { value: 'BEARISH', label: 'Bearish' },
            { value: 'NEUTRAL', label: 'Neutral' },
          ]} />
        <Select label="Status" value={form.status || ''}
          onChange={(v) => set('status', v as TradeFormData['status'])}
          placeholder="Select status"
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]} />
      </div>

      {form.status === 'COMPLETED' && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-secondary">Result</label>
          <div className="flex gap-2">
            {(['WIN', 'LOSS', 'BREAK_EVEN'] as const).map((r) => (
              <button key={r} type="button" onClick={() => set('result', r)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                  form.result === r
                    ? r === 'WIN' ? 'bg-success/10 border-success text-success'
                      : r === 'LOSS' ? 'bg-danger/10 border-danger text-danger'
                      : 'bg-hover border-border text-text-primary'
                    : 'bg-input border-border text-text-secondary hover:bg-hover'
                }`}>
                {r === 'BREAK_EVEN' ? 'Break Even' : r.charAt(0) + r.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {hideChecklist ? (
        <button type="button" onClick={() => {
          setHideChecklist(false)
          localStorage.setItem('tradesense_hide_checklist', 'false')
        }}
          className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors py-1">
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Show checklist</span>
        </button>
      ) : (
        <div className="bg-hover rounded-xl border border-border">
          <div className="flex items-center gap-2 p-3">
            <button type="button" onClick={() => setShowChecklist(!showChecklist)}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
              {showChecklist ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <CheckSquare className="w-4 h-4 text-primary" />
              <span className="font-medium">Checklist</span>
              <span className="text-xs text-text-muted">({checklistTags.length} items)</span>
            </button>
            <button type="button" onClick={() => {
              setHideChecklist(true)
              localStorage.setItem('tradesense_hide_checklist', 'true')
            }}
              className="ml-auto p-1 rounded-lg hover:bg-border text-text-muted hover:text-text-primary transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {showChecklist && (
            <div className="px-3 pb-3 space-y-1.5">
              {checklistTags.length === 0 ? (
                <p className="text-xs text-text-muted py-2">No checklist items. Create some in the Checklist page.</p>
              ) : (
                checklistTags.map((ct) => {
                  const ctItems = parseTagContent(ct.content)
                  const checkedItems = form.checklistData?.[ct.id] || []
                  return (
                    <div key={ct.id}>
                      <button type="button" onClick={() => setExpandedChecklistId(expandedChecklistId === ct.id ? null : ct.id)}
                        className="w-full flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors py-1">
                        {expandedChecklistId === ct.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span className="font-medium text-text-primary">{ct.name}</span>
                        {checkedItems.length > 0 && (
                          <span className="text-xs text-success ml-1">({checkedItems.length})</span>
                        )}
                      </button>
                      {expandedChecklistId === ct.id && ctItems.length > 0 && (
                        <div className="ml-4 mt-1 space-y-0.5">
                          {ctItems.map((item, i) => {
                            const isChecked = checkedItems.includes(item)
                            return (
                              <label key={i} className="flex items-center gap-2 py-0.5 cursor-pointer group">
                                <input type="checkbox" checked={isChecked}
                                  onChange={() => toggleChecklistItem(ct.id, item)}
                                  className="w-3.5 h-3.5 rounded border-border bg-input text-primary focus:ring-brand/30 cursor-pointer" />
                                <span className={`text-xs ${isChecked ? 'text-text-primary' : 'text-text-secondary'}`}>{item}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <DateTimePicker id="entryTime" label="Entry Time" value={form.entryTime} session={form.session}
            onChange={(iso) => {
              setErrors((p) => ({ ...p, entryTime: '' }))
              set('entryTime', iso)
              if (iso && form.exitTime && new Date(form.exitTime) <= new Date(iso)) {
                set('exitTime', undefined)
                setErrors((p) => ({ ...p, exitTime: '' }))
              }
            }}
            error={errors.entryTime} />
        </div>
        <div>
          <DateTimePicker id="exitTime" label="Exit Time" value={form.exitTime} session={form.session} minDate={form.entryTime}
            onChange={(iso) => { setErrors((p) => ({ ...p, exitTime: '' })); set('exitTime', iso) }}
            error={errors.exitTime} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-secondary">Entry Reason</label>
        <textarea value={form.reason || ''} onChange={(e) => set('reason', e.target.value)} rows={5}
          className="block w-full rounded-xl border border-border px-3.5 py-2.5 text-sm bg-input text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.12)] transition-all resize-none"
          placeholder="Why did you take this trade?" />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-secondary">Mistakes</label>
        <textarea value={form.mistakes || ''} onChange={(e) => set('mistakes', e.target.value)} rows={2}
          className="block w-full rounded-xl border border-border px-3.5 py-2.5 text-sm bg-input text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.12)] transition-all resize-none"
          placeholder="What went wrong?" />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-secondary">Notes</label>
        <textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={4}
          className="block w-full rounded-xl border border-border px-3.5 py-2.5 text-sm bg-input text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.12)] transition-all resize-none"
          placeholder="Add trade notes..." />
      </div>

      <div className="space-y-1.5" onPaste={handlePaste}>
        <label className="block text-sm font-medium text-text-secondary">Images</label>
        <div className="grid grid-cols-2 gap-3">
          {pendingPreviews.map((src, i) => (
            <div key={i} className="relative group aspect-video rounded-xl overflow-hidden border border-border">
              <img src={src} alt="" className="w-full h-full object-cover cursor-pointer"
                onClick={() => { resetLightbox(); setPreviewIndex(i) }} />
              <button type="button" onClick={() => removePendingFile(i)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {isAtImageLimit && pendingFiles.length + existingImagesCount >= (plan?.imageLimit || 1) ? (
            <div className="aspect-video rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-text-muted cursor-not-allowed">
              <Lock className="w-5 h-5 mb-1" />
              <button type="button" onClick={() => setShowUpgradeDialog(true)} className="text-xs text-primary-light underline">Upgrade</button>
            </div>
          ) : (
            <div className="relative">
              <div className="aspect-video rounded-xl border-2 border-dashed border-border bg-hover flex items-center justify-center overflow-hidden group cursor-pointer"
                onClick={() => setShowUploadMenu(true)}>
                <div className="flex flex-col items-center gap-1 text-text-muted">
                  <Upload className="w-6 h-6" />
                  <span className="text-xs">Click to upload</span>
                </div>
              </div>
              {showUploadMenu && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 rounded-xl"
                  onClick={() => setShowUploadMenu(false)}>
                  <div ref={uploadMenuRef} className="bg-elevated border border-border rounded-xl shadow-lg py-3 w-52"
                    onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => { setShowUploadMenu(false); fileInputRef.current?.click() }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-hover transition-colors">
                      <Upload className="w-4 h-4 text-text-muted shrink-0" />
                      <span>Choose file</span>
                    </button>
                    <div className="h-px bg-border mx-3 my-1.5" />
                    <p className="px-4 pb-2 text-xs text-text-muted/60 flex items-center gap-2">
                      <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold bg-hover rounded border border-border">Ctrl+V</kbd>
                      to paste an image
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" {...(!isPro ? {} : { multiple: true })} className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
        <p className="text-[11px] text-text-muted/60">Ctrl+V to paste an image</p>
      </div>

    </>
  )

  if (noFrame) {
    return (
      <>
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-5">
        {renderFormContent()}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading} ref={submitRef}>
            {initial ? 'Update Journal' : 'Create Journal'}
          </Button>
        </div>
      </form>
      {previewIndex !== null && pendingPreviews[previewIndex] && renderLightbox()}
      <UpgradeDialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)} />
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 overflow-y-auto">
        <div className="bg-elevated rounded-2xl border border-border w-full max-w-2xl my-auto shadow-[0_6px_25px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-5">
            {renderFormContent()}
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit" isLoading={isLoading} ref={submitRef}>
                {initial ? 'Update Journal' : 'Create Journal'}
              </Button>
            </div>
          </form>
        </div>
      </div>
      {previewIndex !== null && pendingPreviews[previewIndex] && renderLightbox()}
      <UpgradeDialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)} />
    </>
  )
}
