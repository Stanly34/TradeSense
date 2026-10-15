import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Edit2, X, CheckCircle, Circle, ListChecks, Sparkles } from 'lucide-react'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { SelectionBar } from '../ui/SelectionBar'
import { UpgradeDialog } from '../ui/UpgradeDialog'
import { usePlan } from '../../hooks/usePlan'
import * as tagService from '../../services/tags'
import { parseTagContent } from '../../utils/tags'
import toast from 'react-hot-toast'

interface TagItem {
  id: string
  name: string
  content: string | null
  _count?: { trades: number }
}

const EXAMPLE_ITEMS = [
  'Setup matches my entry criteria',
  'Position size calculated from risk rules',
  'Stop loss placed before entry',
  'Within my daily loss limit',
  'Trading the plan — not an emotion',
]

interface ChecklistsManagerProps {
  refreshKey?: number
}

export function ChecklistsManager({ refreshKey = 0 }: ChecklistsManagerProps) {
  const { isAtChecklistLimit, plan } = usePlan()
  const [tags, setTags] = useState<TagItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editItems, setEditItems] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteCount, setBatchDeleteCount] = useState(0)

  const longTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const longPressTriggeredRef = useRef(false)

  useEffect(() => {
    tagService.listTags()
      .then(setTags)
      .catch(() => setTags([]))
  }, [refreshKey])

  async function handleStartFromExample() {
    if (isAtChecklistLimit && tags.length >= (plan?.checklistLimit ?? 1)) {
      setShowUpgradeDialog(true)
      return
    }
    try {
      const tag = await tagService.createTag({
        name: 'Pre-Trade Basics',
        content: JSON.stringify(EXAMPLE_ITEMS),
      })
      setTags((prev) => [...prev, tag])
      toast.success('Example checklist created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create example')
    }
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    const updated = await tagService.updateTag(id, { name: editName.trim() })
    setTags((prev) => prev.map((t) => t.id === id ? updated : t))
    setEditingId(null)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    try {
      await tagService.deleteTag(deleteTarget)
      setTags((prev) => prev.filter((t) => t.id !== deleteTarget))
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete checklist')
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
      await tagService.batchDeleteTags(ids)
      toast.success(`${ids.length} checklists deleted`)
      setTags((prev) => prev.filter((t) => !ids.includes(t.id)))
      cancelSelect()
      setBatchDeleteCount(0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete checklists')
    }
  }

  async function handleSaveContent(id: string) {
    if (isAtChecklistLimit && editItems.length > 0) {
      const existingCount = tags.filter((t) => t.id !== id && t.content && parseTagContent(t.content).length > 0).length
      if (existingCount >= (plan?.checklistLimit || 1)) {
        setShowUpgradeDialog(true)
        return
      }
    }
    const content = JSON.stringify(editItems.filter(Boolean))
    const updated = await tagService.updateTag(id, { content })
    setTags((prev) => prev.map((t) => t.id === id ? updated : t))
    setExpandedId(null)
  }

  return (
    <div className="space-y-6">

      {tags.length === 0 ? (
        <div className="card p-10 text-center">
          <ListChecks className="w-10 h-10 mx-auto mb-3 text-primary-light opacity-60" />
          <p className="text-sm font-semibold text-text-primary">No checklists yet</p>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto leading-relaxed">
            Build a pre-trade routine — e.g. "setup matches criteria", "risk ≤ 1%", "stop placed first". Attach one to trades and track discipline.
          </p>
          <Button variant="secondary" onClick={handleStartFromExample} leftIcon={<Sparkles className="w-4 h-4 text-primary-light" />} className="mt-4 mx-auto">
            Start from example
          </Button>
        </div>
      ) : (
        <>
          <SelectionBar
            count={selectedIds.size}
            onCancel={cancelSelect}
            onDelete={() => setBatchDeleteCount(selectedIds.size)}
            deleteLabel="Delete"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map((tag) => {
              const items = parseTagContent(tag.content)
              const isExpanded = expandedId === tag.id
              return (
                <div key={tag.id}
                  {...makeLongPress(tag.id)}
                  onClick={() => {
                    if (longPressTriggeredRef.current) { longPressTriggeredRef.current = false; return }
                    if (selecting) { toggleSelect(tag.id); return }
                  }}
                  className={`group relative cursor-pointer rounded-2xl border p-4 transition-all border-l-4 ${selectedIds.has(tag.id) ? 'ring-2 ring-primary bg-primary/5 border-l-primary' : 'bg-card hover:shadow-md border-border border-l-primary/40'}`}>
                  {selecting && (
                    <div className="absolute top-3 left-3 z-10">
                      {selectedIds.has(tag.id) ? (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      ) : (
                        <Circle className="w-4 h-4 text-text-muted" />
                      )}
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2 pl-1">
                    {editingId === tag.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-0.5 text-sm font-semibold bg-input border border-border rounded text-text-primary focus:outline-none focus:border-primary"
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(tag.id)}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-bold text-text-primary truncate">{tag.name}</span>
                    )}
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary-light text-[10px] font-bold">
                      {items.length} {items.length === 1 ? 'rule' : 'rules'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isExpanded) {
                        setExpandedId(null)
                      } else {
                        setExpandedId(tag.id)
                        setEditItems(items.length > 0 ? [...items] : [''])
                      }
                    }}
                    onClickCapture={(e) => {
                      if (selecting || longPressTriggeredRef.current) e.stopPropagation()
                    }}
                    className="mt-2 w-full text-left space-y-1"
                  >
                    {items.slice(0, 4).map((item, i) => (
                      <div key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                    {items.length > 4 && (
                      <div className="text-[10px] text-text-muted">+{items.length - 4} more…</div>
                    )}
                    {items.length === 0 && (
                      <div className="text-xs text-text-muted italic">Click to add rules…</div>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {editItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <input
                              value={item}
                              onChange={(e) => setEditItems((prev) => prev.map((it, ii) => ii === i ? e.target.value : it))}
                              placeholder="Rule"
                              className="flex-1 min-w-0 px-2 py-1 text-xs bg-input border border-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                            />
                            <button onClick={() => setEditItems((prev) => prev.filter((_, ii) => ii !== i))}
                              className="p-1 text-text-muted hover:text-danger shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button onClick={() => setEditItems((prev) => [...prev, ''])}
                          className="text-xs text-primary-light hover:text-primary flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add rule
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveContent(tag.id)}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={() => setExpandedId(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                    <p className="text-[10px] text-text-muted">{tag._count?.trades || 0} trades used</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(tag.id); setEditName(tag.name) }}
                        className="p-1 text-text-muted hover:text-text-primary"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(tag.id) }}
                        className="p-1 text-text-muted hover:text-danger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <UpgradeDialog open={showUpgradeDialog} onClose={() => setShowUpgradeDialog(false)} />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Checklist"
        message="Are you sure you want to delete this checklist? This action cannot be undone."
      />

      <ConfirmDialog
        open={batchDeleteCount > 0}
        onClose={() => setBatchDeleteCount(0)}
        onConfirm={handleBatchDelete}
        title="Delete Checklists"
        message={`Are you sure you want to delete ${batchDeleteCount} checklists? This action cannot be undone.`}
      />
    </div>
  )
}
