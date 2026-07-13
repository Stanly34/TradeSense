import { useState, useEffect, useRef } from 'react'
import { Tag, Plus, Trash2, Edit2, X, CheckCircle, Circle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SelectionBar } from '../components/ui/SelectionBar'
import { UpgradeDialog } from '../components/ui/UpgradeDialog'
import { usePlan } from '../hooks/usePlan'
import * as tagService from '../services/tags'
import { parseTagContent } from '../utils/tags'
import toast from 'react-hot-toast'

interface TagItem {
  id: string
  name: string
  content: string | null
  _count?: { trades: number }
}

export function TagsPage() {
  const { isAtChecklistLimit, plan } = usePlan()
  const [tags, setTags] = useState<TagItem[]>([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editItems, setEditItems] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteCount, setBatchDeleteCount] = useState(0)

  const longTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const longPressTriggeredRef = useRef(false)

  useEffect(() => {
    tagService.listTags()
      .then(setTags)
      .catch(() => setTags([]))
  }, [])

  function addItem() {
    setEditItems((prev) => [...prev, ''])
  }

  function removeItem(index: number) {
    setEditItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, value: string) {
    setEditItems((prev) => prev.map((item, i) => i === index ? value : item))
  }

  async function handleCreate() {
    if (!newName.trim()) return
    if (isAtChecklistLimit && tags.length >= (plan?.checklistLimit ?? 1)) {
      setShowUpgradeDialog(true)
      return
    }
    const tag = await tagService.createTag({ name: newName.trim() })
    setTags((prev) => [...prev, tag])
    setNewName('')
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
    const content = JSON.stringify(editItems)
    const updated = await tagService.updateTag(id, { content })
    setTags((prev) => prev.map((t) => t.id === id ? updated : t))
    setExpandedId(null)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">Checklist</h2>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New checklist item..."
            className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.2)] transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button size="sm" onClick={handleCreate} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Add
          </Button>
        </div>

        {tags.length === 0 ? (
          <div className="text-center text-text-muted py-6 text-sm">
            No checklist items yet. Create your first item above.
          </div>
        ) : (
          <>
          <SelectionBar
            selecting={selecting}
            count={selectedIds.size}
            onCancel={cancelSelect}
            onDelete={() => setBatchDeleteCount(selectedIds.size)}
            deleteLabel="Delete"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tags.map((tag) => {
              const items = parseTagContent(tag.content)
              return (
                <div key={tag.id}
                  {...makeLongPress(tag.id)}
                  onClick={() => {
                    if (longPressTriggeredRef.current) { longPressTriggeredRef.current = false; return }
                    if (selecting) { toggleSelect(tag.id); return }
                  }}
                  className={`card p-3 group relative cursor-pointer ${selectedIds.has(tag.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                  {selecting && (
                    <div className="absolute top-2 left-2 z-10">
                      {selectedIds.has(tag.id) ? (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      ) : (
                        <Circle className="w-4 h-4 text-text-muted" />
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {editingId === tag.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-0.5 text-sm bg-input border border-border rounded text-text-primary focus:outline-none focus:border-primary"
                          onKeyDown={(e) => e.key === 'Enter' && handleRename(tag.id)}
                          onBlur={() => setEditingId(null)}
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium text-text-primary truncate">{tag.name}</span>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (expandedId === tag.id) {
                        setExpandedId(null)
                      } else {
                        setExpandedId(tag.id)
                        setEditItems(items.length > 0 ? items : [''])
                      }
                    }}
                    className="mt-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {items.length > 0 ? `${items.length} items` : 'Add items...'}
                  </button>

                      {items.length > 0 && expandedId !== tag.id && (
                    <ul className="mt-1.5 space-y-0.5">
                      {items.map((item, i) => (
                        <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-text-muted mt-1.5 shrink-0" />
                          <span className="truncate">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {expandedId === tag.id && (
                    <div className="mt-2 space-y-2">
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {editItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <input
                              value={item}
                              onChange={(e) => updateItem(i, e.target.value)}
                              placeholder="Item name"
                              className="flex-1 min-w-0 px-2 py-1 text-xs bg-input border border-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                            />
                            <button
                              onClick={() => removeItem(i)}
                              className="p-1 text-text-muted hover:text-danger shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={addItem}
                        className="text-xs text-primary-light hover:text-primary flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add item
                      </button>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveContent(tag.id)}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={() => setExpandedId(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-text-muted mt-2">{tag._count?.trades || 0} trades</p>
                </div>
              )
            })}
          </div>
          </>
        )}
      </div>

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
