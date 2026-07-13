import { useState, useEffect } from 'react'
import { BookOpen, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as journalService from '../services/journals'
import type { JournalEntry } from '../services/journals'

export function JournalPage() {
  const navigate = useNavigate()
  const [journals, setJournals] = useState<JournalEntry[]>([])

  useEffect(() => {
    journalService.listJournals()
      .then(setJournals)
      .catch(() => setJournals([]))
  }, [])

  const getResultIcon = (result?: string | null) => {
    if (result === 'WIN') return <TrendingUp className="w-4 h-4 text-success" />
    if (result === 'LOSS') return <TrendingDown className="w-4 h-4 text-danger" />
    if (result === 'BREAK_EVEN') return <Minus className="w-4 h-4 text-text-muted" />
    return null
  }

  const getResultBadge = (result?: string | null) => {
    if (result === 'WIN') return <span className="text-xs font-semibold text-success">Win</span>
    if (result === 'LOSS') return <span className="text-xs font-semibold text-danger">Loss</span>
    if (result === 'BREAK_EVEN') return <span className="text-xs font-semibold text-text-muted">BE</span>
    return null
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Journal</h1>
        <p className="text-text-secondary mt-1">Write and review your trading journal entries.</p>
      </div>

      {journals.length === 0 ? (
        <div className="card p-12 text-center text-text-muted">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No journal entries yet. Write a reflection on a trade to get started.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-sidebar/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Instrument</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Result</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Content</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Lessons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {journals.map((entry) => {
                  const tradeResult = entry.trade?.result
                  return (
                    <tr key={entry.id}
                      className="cursor-pointer transition-colors hover:bg-hover"
                      onClick={() => navigate(`/trades/${entry.tradeId}`)}>
                      <td className="px-4 py-3 text-text-primary whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {entry.trade?.instrument || '--'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          tradeResult === 'WIN' ? 'bg-success/10 text-success' :
                          tradeResult === 'LOSS' ? 'bg-danger/10 text-danger' :
                          'bg-hover text-text-muted'
                        }`}>
                          {getResultIcon(tradeResult)}
                          {getResultBadge(tradeResult)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary max-w-[250px] truncate">
                        {entry.content || <span className="text-text-muted">--</span>}
                      </td>
                      <td className="px-4 py-3">
                        {entry.lessons && entry.lessons.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {entry.lessons.slice(0, 2).map((lesson, i) => (
                              <span key={i} className="text-xs bg-hover text-text-secondary px-2 py-0.5 rounded-full">{lesson}</span>
                            ))}
                            {entry.lessons.length > 2 && (
                              <span className="text-xs text-text-muted">+{entry.lessons.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted">--</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}