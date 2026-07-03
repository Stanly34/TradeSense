import { useState, useRef, useEffect } from 'react'
import { Star } from 'lucide-react'
import { cn } from '../../lib/utils'

interface InstrumentGroup {
  label: string
  items: Array<{ value: string; label: string }>
}

interface InstrumentSelectProps {
  value: string
  onChange: (value: string) => void
  groups: InstrumentGroup[]
  favorites?: string[]
  onToggleFavorite?: (value: string) => void
}

function normalize(v: string): string {
  return v.toUpperCase().replace(/\//g, '')
}

function scoreMatch(input: string, item: { value: string; label: string }): number {
  const q = normalize(input)
  if (!q) return 0
  const v = normalize(item.value)
  const l = normalize(item.label)
  if (v === q) return 100
  if (l === q) return 90
  if (v.replace(/[^A-Z0-9]/g, '') === q) return 85
  if (v.startsWith(q)) return 80
  if (l.startsWith(q)) return 70
  if (v.includes(q)) return 60
  if (l.includes(q)) return 50
  return 0
}

export function InstrumentSelect({ value, onChange, groups, favorites = [], onToggleFavorite }: InstrumentSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const [highlightIdx, setHighlightIdx] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const flatItems = groups.flatMap((g) => g.items)

  const hasQuery = query.trim().length > 0

  const favoriteItems = !hasQuery && favorites.length > 0
    ? flatItems.filter((item) => favorites.includes(item.value))
    : []

  const groupedNoFavorites = !hasQuery && favorites.length > 0
    ? groups
        .map((g) => ({ ...g, items: g.items.filter((item) => !favorites.includes(item.value)) }))
        .filter((g) => g.items.length > 0)
    : groups

  const suggested = hasQuery
    ? flatItems
        .map((item) => ({ item, score: scoreMatch(query, item) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((x) => x.item)
    : []

  const otherGroups = hasQuery
    ? groups
        .map((g) => ({
          ...g,
          items: g.items
            .filter((item) => !suggested.includes(item))
            .sort((a, b) => {
              if (favorites.includes(a.value) !== favorites.includes(b.value))
                return favorites.includes(a.value) ? -1 : 1
              return 0
            }),
        }))
        .filter((g) => g.items.length > 0)
    : []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    setHighlightIdx(0)
  }, [query, open])

  const allFiltered = hasQuery
    ? [...suggested, ...flatItems.filter((item) => !suggested.includes(item))]
    : [...favoriteItems, ...flatItems.filter((item) => !favoriteItems.includes(item))]

  function select(val: string) {
    setQuery(val)
    onChange(val)
    setOpen(false)
    inputRef.current?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault() }; return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx((prev) => Math.min(prev + 1, allFiltered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIdx((prev) => Math.max(prev - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (allFiltered[highlightIdx]) select(allFiltered[highlightIdx].value) }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
  }

  return (
    <div className="space-y-1.5 relative" ref={ref}>
      <label className="block text-sm font-medium text-text-secondary">Instrument</label>
      <input ref={inputRef} type="text" value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search or type instrument..."
        className="block w-full rounded-xl border border-border/80 px-3.5 py-2.5 text-sm bg-input/60 backdrop-blur-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary focus:shadow-[0_0_0_2px_rgba(124,58,237,0.12)] transition-all"
      />

      {open && allFiltered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 w-full bg-glass/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl py-1.5 max-h-72 overflow-y-auto">
          {!hasQuery && favoriteItems.length > 0 && (
            <>
              <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-warning">Favorites</div>
              {favoriteItems.map((item) => {
                const flatIdx = allFiltered.indexOf(item)
                return (
                  <button key={item.value} type="button" onMouseDown={() => select(item.value)}
                    onMouseEnter={() => setHighlightIdx(flatIdx)}
                    className={cn(
                      'w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center justify-between gap-2',
                      flatIdx === highlightIdx ? 'bg-card text-text-primary' : 'text-text-secondary'
                    )}>
                    <span className="truncate">
                      <span className="font-medium text-text-primary">{item.value}</span>
                      {item.label && <span className="text-text-muted"> {item.label}</span>}
                    </span>
                    {onToggleFavorite && (
                      <button type="button" onMouseDown={(e) => { e.stopPropagation(); onToggleFavorite(item.value) }}
                        className="shrink-0 p-0.5 rounded hover:bg-hover transition-colors">
                        <Star className={cn('w-3.5 h-3.5', favorites.includes(item.value) ? 'fill-warning text-warning' : 'text-text-muted')} />
                      </button>
                    )}
                  </button>
                )
              })}
            </>
          )}
          {!hasQuery && favoriteItems.length > 0 && groupedNoFavorites.length > 0 && (
            <div className="border-t border-border/50 mx-2 my-1" />
          )}
          {hasQuery && suggested.length > 0 && (
            <>
              <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">Suggested</div>
              {suggested.map((item) => {
                const flatIdx = allFiltered.indexOf(item)
                return (
                  <button key={item.value} type="button" onMouseDown={() => select(item.value)}
                    onMouseEnter={() => setHighlightIdx(flatIdx)}
                    className={cn(
                      'w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center justify-between gap-2',
                      flatIdx === highlightIdx ? 'bg-card text-text-primary' : 'text-text-secondary'
                    )}>
                    <span className="truncate">
                      <span className="font-medium text-text-primary">{item.value}</span>
                      {item.label && <span className="text-text-muted"> {item.label}</span>}
                    </span>
                    {onToggleFavorite && (
                      <button type="button" onMouseDown={(e) => { e.stopPropagation(); onToggleFavorite(item.value) }}
                        className="shrink-0 p-0.5 rounded hover:bg-hover transition-colors">
                        <Star className={cn('w-3.5 h-3.5', favorites.includes(item.value) ? 'fill-warning text-warning' : 'text-text-muted')} />
                      </button>
                    )}
                  </button>
                )
              })}
            </>
          )}
          {hasQuery && suggested.length > 0 && otherGroups.length > 0 && (
            <div className="border-t border-border/50 mx-2 my-1" />
          )}
          {hasQuery && suggested.length > 0
            ? otherGroups.map((group) => (
                <div key={group.label}>
                  <div className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{group.label}</div>
                  {group.items.map((item) => {
                    const flatIdx = allFiltered.indexOf(item)
                    return (
                      <button key={item.value} type="button" onMouseDown={() => select(item.value)}
                        onMouseEnter={() => setHighlightIdx(flatIdx)}
                        className={cn(
                          'w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center justify-between gap-2',
                          flatIdx === highlightIdx ? 'bg-card text-text-primary' : 'text-text-secondary'
                        )}>
                        <span className="truncate">
                          <span className="font-medium text-text-primary">{item.value}</span>
                          {item.label && <span className="text-text-muted"> {item.label}</span>}
                        </span>
                        {onToggleFavorite && (
                          <button type="button" onMouseDown={(e) => { e.stopPropagation(); onToggleFavorite(item.value) }}
                            className="shrink-0 p-0.5 rounded hover:bg-hover transition-colors">
                            <Star className={cn('w-3.5 h-3.5', favorites.includes(item.value) ? 'fill-warning text-warning' : 'text-text-muted')} />
                          </button>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
              : groupedNoFavorites.map((group) => (
                <div key={group.label}>
                  <div className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{group.label}</div>
                  {group.items.map((item) => {
                    const flatIdx = allFiltered.indexOf(item)
                    return (
                      <button key={item.value} type="button" onMouseDown={() => select(item.value)}
                        onMouseEnter={() => setHighlightIdx(flatIdx)}
                        className={cn(
                          'w-full text-left px-3.5 py-2 text-sm transition-colors flex items-center justify-between gap-2',
                          flatIdx === highlightIdx ? 'bg-card text-text-primary' : 'text-text-secondary'
                        )}>
                        <span className="truncate">
                          <span className="font-medium text-text-primary">{item.value}</span>
                          {item.label && <span className="text-text-muted"> {item.label}</span>}
                        </span>
                        {onToggleFavorite && (
                          <button type="button" onMouseDown={(e) => { e.stopPropagation(); onToggleFavorite(item.value) }}
                            className="shrink-0 p-0.5 rounded hover:bg-hover transition-colors">
                            <Star className={cn('w-3.5 h-3.5', favorites.includes(item.value) ? 'fill-warning text-warning' : 'text-text-muted')} />
                          </button>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
        </div>
      )}
    </div>
  )
}