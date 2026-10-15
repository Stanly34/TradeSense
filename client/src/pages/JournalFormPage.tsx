import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { UpgradeDialog } from '../components/ui/UpgradeDialog'
import { TradeForm, type TradeFormHandle } from '../components/trades/TradeForm'
import * as tradeService from '../services/trades'
import type { TradeFormData } from '../types/trade'
import type { Trade } from '../types/trade'
import { getAccessToken } from '../services/api'
import { usePlan } from '../hooks/usePlan'
import { cn } from '../lib/utils'

export function JournalFormPage() {
  const navigate = useNavigate()
  const { isBasic } = usePlan()
  const [formTabs, setFormTabs] = useState<number[]>([0])
  const [activeFormTab, setActiveFormTab] = useState(0)
  const [tabErrors, setTabErrors] = useState<(string | null)[]>([])
  const [isSavingAll, setIsSavingAll] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<number | null>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const formRefs = useRef<(TradeFormHandle | null)[]>([])
  const createdTradesRef = useRef<Trade[]>([])
  const snapshotRef = useRef('')

  useEffect(() => {
    snapshotRef.current = '[]'
  }, [])

  function isDirty(): boolean {
    return formRefs.current.some((r) => r?.hasContent())
  }

  function handleCancel() {
    if (isDirty()) setCancelConfirm(true)
    else resetAndExit()
  }

  function resetAndExit() {
    setFormTabs([0])
    setActiveFormTab(0)
    setTabErrors([])
    createdTradesRef.current = []
    navigate('/trades')
  }

  async function saveOne(data: TradeFormData): Promise<void> {
    const { _pendingImages, ...tradeData } = data
    const trade = await tradeService.createTrade(tradeData)
    createdTradesRef.current.push(trade)
    if (_pendingImages && _pendingImages.length > 0) {
      for (const item of _pendingImages) {
        const formData = new FormData()
        formData.append('image', item.file)
        formData.append('tradeId', trade.id)
        formData.append('category', item.category)
        await fetch('/api/v1/upload/image', {
          method: 'POST',
          headers: { Authorization: `Bearer ${getAccessToken()}` },
          body: formData,
        })
      }
    }
  }

  function removeTab(index: number) {
    if (formTabs.length <= 1) {
      resetAndExit()
      return
    }
    setFormTabs((prev) => prev.filter((_, i) => i !== index))
    setTabErrors((prev: (string | null)[]) => prev.filter((_, i: number) => i !== index))
    if (activeFormTab >= index) setActiveFormTab((prev) => Math.max(0, prev - 1))
  }

  async function handleSaveAll() {
    const refs = formRefs.current
    const emptyIndex = refs.findIndex((r) => !r?.hasContent())
    if (emptyIndex !== -1) {
      const msg = `Trade ${emptyIndex + 1} is empty — fill it in or remove it`
      setTabErrors((prev) => { const next = [...prev]; next[emptyIndex] = msg; return next })
      setActiveFormTab(emptyIndex)
      return
    }
    const invalid = refs.findIndex((r) => !r?.validate())
    if (invalid !== -1) {
      setTabErrors((prev) => { const next = [...prev]; next[invalid] = tabErrors[invalid] ?? 'Fix the highlighted section'; return next })
      setActiveFormTab(invalid)
      requestAnimationFrame(() => { refs[invalid]?.validate() })
      return
    }
    setIsSavingAll(true)
    createdTradesRef.current = []
    try {
      const results = await Promise.allSettled(formTabs.map((_, i) => refs[i]?.save()))
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) throw new Error(`${failed} of ${formTabs.length} journals failed to save`)
      toast.success(formTabs.length > 1 ? 'All journals created' : 'Journal created')
      resetAndExit()
    } catch (err) {
      resetAndExit()
      toast.error(err instanceof Error ? err.message : 'Failed to save journals')
    } finally {
      setIsSavingAll(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-0">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">New Journal</h1>
      </div>

      <div className="space-y-0">
        <div className="flex items-center justify-between px-6 pt-4 pb-0 border-b border-border">
          <div className="flex items-center gap-1 overflow-x-auto">
            {formTabs.map((_, i) => (
              <div key={i} className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-t-lg cursor-pointer transition-colors whitespace-nowrap group',
                tabErrors[i] ? 'ring-1 ring-danger' : undefined,
                activeFormTab === i ? 'bg-primary/15 text-primary-light border border-primary/30' : 'bg-transparent text-text-muted hover:text-text-secondary'
              )}
                onClick={() => setActiveFormTab(i)}>
                <span className={`text-sm font-medium ${activeFormTab === i ? 'text-primary-light' : 'text-text-muted hover:text-text-secondary'}`}>
                  Trade {i + 1}
                </span>
                <button type="button" onClick={(e) => {
                  e.stopPropagation()
                  if (formRefs.current[i]?.hasContent()) setPendingRemove(i)
                  else removeTab(i)
                }}
                  className={cn(
                    'p-0.5 rounded text-text-muted hover:text-text-primary hover:bg-hover transition-colors',
                    formTabs.length > 1 ? 'opacity-0 group-hover:opacity-100' : 'invisible'
                  )}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => {
              if (isBasic && formTabs.length >= 1) setShowUpgradeDialog(true)
              else setFormTabs((prev) => [...prev, prev.length])
            }}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors" title="Add another trade">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {formTabs.map((_, i) => (
          <div key={i} style={{ display: activeFormTab === i ? '' : 'none' }}>
            <TradeForm
              ref={(el) => { formRefs.current[i] = el }}
              noFrame
              hideActions
              onSubmit={saveOne}
              onClose={resetAndExit}
            />
          </div>
        ))}

        <div className="px-6 pb-6 pt-4 border-t border-border flex items-center justify-end gap-3 mt-auto">
          {tabErrors[activeFormTab] && (
            <p className="mr-auto text-xs text-danger flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {tabErrors[activeFormTab]}
            </p>
          )}
          <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSaveAll} isLoading={isSavingAll}>
            {formTabs.length > 1 ? 'Save All Journals' : 'Create Journal'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingRemove !== null}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove !== null) removeTab(pendingRemove)
          setPendingRemove(null)
        }}
        title="Remove this trade?"
        message="This tab has entries. Removing it discards everything you entered."
        confirmLabel="Remove"
      />

      <UpgradeDialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)} />
      <ConfirmDialog
        open={cancelConfirm}
        onClose={() => setCancelConfirm(false)}
        onConfirm={() => { setCancelConfirm(false); resetAndExit() }}
        title="Discard changes?"
        message="You've filled in trade details. Leaving now will discard everything you entered."
        confirmLabel="Discard"
      />
    </div>
  )
}