import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../ui/Button'

interface Tag {
  id: string
  name: string
  _count?: { trades: number }
}

interface TagManagerProps {
  tags: Tag[]
  selectedIds: string[]
  onToggle: (tagId: string) => void
  onCreate: (name: string) => Promise<void>
}

export function TagManager({ tags, selectedIds, onToggle, onCreate }: TagManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setIsCreating(true)
    try {
      await onCreate(name.trim())
      setName('')
      setShowForm(false)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-primary">Checklist</label>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-primary-light hover:text-primary font-medium flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Add item
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onToggle(tag.id)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              selectedIds.includes(tag.id)
                ? 'bg-primary/10 border-primary/30 text-primary-light'
                : 'bg-input border-border text-text-secondary hover:border-border-hover'
            }`}
          >
            {tag.name}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="flex items-center gap-2 p-2 bg-input rounded-lg border border-border">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name"
            className="flex-1 px-2 py-1 text-sm bg-transparent border-none text-text-primary placeholder:text-text-muted focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button size="sm" onClick={handleCreate} isLoading={isCreating}>
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
