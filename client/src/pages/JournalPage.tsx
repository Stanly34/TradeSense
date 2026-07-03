import { useState, useEffect } from 'react'
import { BookOpen, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as journalService from '../services/journals'
import type { JournalEntry } from '../services/journals'

export function JournalPage() {
  const navigate = useNavigate()
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    journalService.listJournals()
      .then(setJournals)
      .catch(() => setJournals([]))
      .finally(() => setIsLoading(false))
  }, [])

  const getResultIcon = (result?: string | null) => {
    if (result === 'WIN') return <TrendingUp className="w-4 h-4 text-success" />
    if (result === 'LOSS') return <TrendingDown className="w-4 h-4 text-danger" />
    if (result === 'BREAK_EVEN') return <Minus className="w-4 h-4 text-text-muted" />
    return null
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Journal</h1>
        <p className="text-text-secondary mt-1">Write and review your trading journal entries.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : journals.length === 0 ? (
        <div className="card p-12 text-center text-text-muted">
          <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No journal entries yet. Write a reflection on a trade to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {journals.map((entry) => {
            const tradeResult = entry.trade?.result
            return (
              <div
                key={entry.id}
                className="card p-5 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                onClick={() => navigate(`/trades/${entry.tradeId}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      tradeResult === 'WIN' ? 'bg-success/10' :
                      tradeResult === 'LOSS' ? 'bg-danger/10' :
                      'bg-primary/10'
                    }`}>
                      <BookOpen className={`w-4 h-4 ${
                        tradeResult === 'WIN' ? 'text-success' :
                        tradeResult === 'LOSS' ? 'text-danger' :
                        'text-primary-light'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-text-primary text-sm">
                        {entry.trade?.instrument || 'Trade'} Journal
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-text-muted">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                        {tradeResult && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            tradeResult === 'WIN' ? 'bg-success/10 text-success' :
                            tradeResult === 'LOSS' ? 'bg-danger/10 text-danger' :
                            'bg-hover text-text-secondary'
                          }`}>
                            {tradeResult === 'BREAK_EVEN' ? 'BE' : tradeResult}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-text-muted group-hover:text-primary-light transition-colors" />
                </div>
                {entry.content && (
                  <p className="text-sm text-text-secondary line-clamp-3 leading-relaxed">{entry.content}</p>
                )}
                {entry.lessons && entry.lessons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {entry.lessons.slice(0, 3).map((lesson, i) => (
                      <span key={i} className="text-xs bg-hover text-text-secondary px-2 py-0.5 rounded-full">
                        {lesson}
                      </span>
                    ))}
                    {entry.lessons.length > 3 && (
                      <span className="text-xs text-text-muted">+{entry.lessons.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}