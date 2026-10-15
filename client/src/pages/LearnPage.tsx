import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  PlayCircle,
  Target,
  MonitorPlay,
} from 'lucide-react'
import { HubHead, HubStats, HubChip } from '../components/hub/Hub'
import { useAuth } from '../hooks/useAuth'
import { DEFAULT_VIDEO_MINUTES, ICT_CHANNEL_URL, ICT_PARTS, allVideos, isEmbeddable, videoUrl } from '../data/ictVideos'

function readWatched(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function estimateHours(minutes: number): string {
  if (minutes >= 60) return `${Math.max(1, Math.round(minutes / 60))}h`
  return `${minutes}m`
}

export function LearnPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const storageKey = `ict-watched-${user?.id ?? 'guest'}`

  const all = useMemo(() => allVideos(), [])
  const total = all.length
  const parts = ICT_PARTS

  const [watched, setWatched] = useState<string[]>(() => readWatched(storageKey))
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [nextOpen, setNextOpen] = useState<number | null>(null)
  const partRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    setWatched(readWatched(storageKey))
  }, [storageKey])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(watched))
  }, [watched, storageKey])

  const watchedSet = useMemo(() => new Set(watched), [watched])
  const watchedCount = watched.filter((id) => watchedSet.has(id)).filter((id) => all.some((v) => v.youtubeId === id)).length
  const percent = total === 0 ? 0 : Math.round((watchedCount / total) * 100)

  const partTotal = (idx: number) => parts[idx].sections.reduce((n, s) => n + s.videos.length, 0)
  const partWatched = (idx: number) =>
    parts[idx].sections.reduce((n, s) => n + s.videos.filter((v) => watchedSet.has(v.youtubeId)).length, 0)
  const partMinutes = (idx: number) =>
    parts[idx].sections.reduce((n, s) => n + s.videos.reduce((m, v) => m + (v.minutes ?? DEFAULT_VIDEO_MINUTES), 0), 0)

  const toggleWatched = (id: string) => {
    setWatched((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const openVideo = (id: string) => {
    navigate(`/learn/watch/${id}`)
    if (!watchedSet.has(id)) toggleWatched(id)
  }

  const togglePart = (idx: number) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  const continueLearning = () => {
    const idx = parts.findIndex((_, i) => partWatched(i) < partTotal(i))
    if (idx === -1) return
    setExpanded((prev) => ({ ...prev, [idx]: true }))
    setNextOpen(idx)
    requestAnimationFrame(() => {
      partRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const statWatched = `${watchedCount}/${total}`

  const ringRadius = 52
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference * (1 - percent / 100)

  return (
    <div className="min-h-full bg-background text-text-primary">
      <HubHead
        eyebrow="Education Hub · Free Forever"
        title="ICT —"
        gradient="Video Library"
        sub={
          <>
            A curated syllabus from <strong className="text-text-primary font-bold">The Inner Circle Trader</strong>'s free YouTube mentorship —
            the 2016 Core Content, the 2022 model, models 6 & 7 and the Market Maker Model Expanded. Play right here or on YouTube,
            tick them off, track your progress.
          </>
        }
      >
        <HubStats
          items={[
            { value: String(total), label: 'Curated Videos' },
            { value: String(parts.length), label: 'Learning Parts' },
            { value: statWatched, label: 'Watched', accent: percent === 100 ? 'text-success' : 'text-text-primary' },
          ]}
        />
      </HubHead>

      <div className="relative mx-auto w-full px-4 md:px-6 lg:px-8 max-w-5xl pb-16">
        <div className="rounded-[28px] border border-border bg-card p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="relative h-32 w-32 flex-shrink-0" aria-hidden>
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={ringRadius} fill="none" strokeWidth="10" className="stroke-border" />
              <circle
                cx="60"
                cy="60"
                r={ringRadius}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="stroke-primary transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black tabular-nums">{percent}%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">complete</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-black tracking-tight">Your Progress</h2>
            <p className="text-sm text-text-secondary mt-1.5">
              {watchedCount} of {total} videos watched — saved locally in your browser, per account.
            </p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
              {percent === 100 ? (
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-success/10 border border-success/30 text-success font-black text-sm">
                  <CheckCircle2 className="w-4 h-4" /> All caught up
                </span>
              ) : (
                <button
                  onClick={continueLearning}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-text-inverse font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-primary"
                >
                  <Target className="w-4 h-4" /> Continue Learning
                </button>
              )}
              <a
                href={ICT_CHANNEL_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-border bg-glass text-text-primary font-bold text-sm hover:border-primary/40 hover:text-primary transition-colors"
              >
                <MonitorPlay className="w-4 h-4" /> Original ICT Channel
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 space-y-5">
          {parts.map((part, pi) => {
            const t = partTotal(pi)
            const w = partWatched(pi)
            const open = !!expanded[pi] || nextOpen === pi
            const partPct = t === 0 ? 0 : Math.round((w / t) * 100)
            return (
              <div
                key={part.title}
                ref={(el) => {
                  partRefs.current[pi] = el
                }}
                className={`rounded-[24px] border bg-card transition-colors ${open ? 'border-primary/40' : 'border-border hover:border-primary/30'}`}
              >
                <button
                  onClick={() => togglePart(pi)}
                  className="w-full text-left p-6 flex items-start gap-4"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-sm flex-shrink-0">
                    {String(pi + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-lg text-text-primary tracking-tight">{part.title}</h3>
                      <span className={`text-[11px] font-black tabular-nums ${partPct === 100 ? 'text-success' : 'text-text-muted'}`}>
                        {partPct}%
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1 leading-relaxed line-clamp-2">{part.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {part.tags.map((tag, ti) => (
                        <HubChip key={tag} tone={(['primary', 'success', 'info', 'warning', 'muted'] as const)[ti % 5]}>
                          {tag}
                        </HubChip>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-text-muted tabular-nums">
                      <span>
                        {w}/{t} videos
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />~{estimateHours(partMinutes(pi))} estimated
                      </span>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-text-muted flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="px-6 pb-6 pt-1 space-y-7">
                    {part.sections.map((section) => (
                      <div key={section.name}>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="h-px flex-1 bg-border" />
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-text-muted">{section.name}</h4>
                          <span className="h-px flex-1 bg-border" />
                        </div>
                        <ul className="space-y-2">
                          {section.videos.map((v) => {
                            const done = watchedSet.has(v.youtubeId)
                            return (
                              <li key={v.youtubeId}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openVideo(v.youtubeId)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      openVideo(v.youtubeId)
                                    }
                                  }}
                                  className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background/60 p-2.5 pr-4 transition-colors hover:border-primary/40 hover:bg-card"
                                >
                                  <button
                                    type="button"
                                    aria-label={done ? 'Mark as unwatched' : 'Mark as watched'}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      toggleWatched(v.youtubeId)
                                    }}
                                    className="flex h-8 w-8 items-center justify-center flex-shrink-0"
                                  >
                                    {done ? (
                                      <CheckCircle2 className="w-5 h-5 text-success" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                                    )}
                                  </button>
                                  <span className="relative flex-shrink-0">
                                    <img
                                      src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`}
                                      alt=""
                                      loading="lazy"
                                      className={`h-14 w-24 rounded-xl object-cover border border-border transition-all ${done ? 'opacity-40' : ''}`}
                                    />
                                    <span
                                      className={`absolute inset-0 flex items-center justify-center rounded-xl ${
                                        done ? 'text-success' : 'text-white/90'
                                      }`}
                                    >
                                      {done ? <CheckCircle2 className="w-5 h-5" /> : <PlayCircle className="w-6 h-6 drop-shadow-lg" />}
                                    </span>
                                  </span>
                                  <span className="flex-1 min-w-0">
                                    <span
                                      className={`block text-sm font-bold leading-snug ${
                                        done ? 'text-text-muted line-through decoration-text-muted/50' : 'text-text-primary group-hover:text-primary-light'
                                      } transition-colors`}
                                    >
                                      {v.title}
                                    </span>
                                    <span className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-text-muted tabular-nums">
                                      <Clock className="w-3 h-3" />
                                      {v.minutes ?? DEFAULT_VIDEO_MINUTES} min
                                      {!isEmbeddable(v) && (
                                        <span className="ml-1 rounded-full bg-border/70 px-1.5 py-px text-[9px] font-black uppercase tracking-wider text-text-muted tabular-nums">
                                          YouTube only
                                        </span>
                                      )}
                                    </span>
                                  </span>
                                  <a
                                    href={videoUrl(v)}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="Watch on YouTube"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center flex-shrink-0"
                                  >
                                    <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                                  </a>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-center text-xs text-text-muted max-w-xl mx-auto leading-relaxed">
          All videos are the free public teachings of The Inner Circle Trader on YouTube.com — TradeSense is not affiliated with the
          channel. Progress is stored locally in your browser; clearing site data resets it.
        </p>

        <section className="relative overflow-hidden border-t border-border mt-16">
          <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[140px] opacity-20 bg-primary/20" />
          <div className="relative max-w-3xl mx-auto px-6 py-20 text-center">
            <h2 className="text-text-primary text-3xl md:text-4xl font-black tracking-tight">
              Learn it. <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary-light to-primary-dark">Prove it.</span>
            </h2>
            <p className="text-text-secondary mt-4">
              Take what you learned and track it live — consistency reports, drawdown alerts and R-multiple analytics for every funded account.
            </p>
            <a
              href={ICT_CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-primary font-bold text-sm hover:text-text-primary transition-colors"
            >
              Watch everything on the original channel <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}