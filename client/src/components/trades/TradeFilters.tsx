import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import type { TradeListParams } from '../../types/trade'
import * as templateService from '../../services/templates'
import type { Template } from '../../services/templates'
import { Select } from '../ui/Select'

interface TradeFiltersProps {
  params: TradeListParams
  onChange: (params: TradeListParams) => void
}

export function TradeFilters({ params, onChange }: TradeFiltersProps) {
  const [accounts, setAccounts] = useState<Template[]>([])

  useEffect(() => {
    templateService.listTemplates().then((all) => {
      setAccounts(all.filter((t) => t.type === 'PROP_FIRM' || t.type === 'PERSONAL_ACCOUNT'))
    }).catch(() => {})
  }, [])

  const set = (key: keyof TradeListParams, value: string | undefined) => {
    onChange({ ...params, [key]: value || undefined, page: 1 })
  }

  const hasFilters = params.status || params.result || params.direction || params.instrument || params.templateId

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search instrument..."
          value={params.instrument || ''}
          onChange={(e) => set('instrument', e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-input border border-border rounded-xl text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.12)] transition-all"
        />
      </div>

      <Select value={params.status || ''}
        onChange={(v) => set('status', v)}
        placeholder="All Status"
        options={[
          { value: '', label: 'All Status' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'COMPLETED', label: 'Completed' },
          { value: 'ARCHIVED', label: 'Archived' },
        ]} />

      <Select value={params.result || ''}
        onChange={(v) => set('result', v)}
        placeholder="All Results"
        options={[
          { value: '', label: 'All Results' },
          { value: 'WIN', label: 'Win' },
          { value: 'LOSS', label: 'Loss' },
          { value: 'BREAK_EVEN', label: 'Break Even' },
        ]} />

      <Select value={params.direction || ''}
        onChange={(v) => set('direction', v)}
        placeholder="All Directions"
        options={[
          { value: '', label: 'All Directions' },
          { value: 'LONG', label: 'Long' },
          { value: 'SHORT', label: 'Short' },
        ]} />

      <Select value={params.templateId || ''}
        onChange={(v) => set('templateId', v)}
        placeholder="All Accounts"
        options={[
          { value: '', label: 'All Accounts' },
          ...accounts.map((a) => ({ value: a.id, label: a.name })),
        ]} />

      {hasFilters && (
        <button
          onClick={() => onChange({ page: 1 })}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      )}
    </div>
  )
}
