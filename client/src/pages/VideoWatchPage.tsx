import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  ListVideo,
  MonitorPlay,
  PlayCircle,
  RotateCcw,
} from 'lucide-react'
import { HubChip } from '../components/hub/Hub'
import { useAuth } from '../hooks/useAuth'
import { DEFAULT_VIDEO_MINUTES, ICT_PARTS, allVideos, isEmbeddable, videoUrl } from '../data/ictVideos'

interface YtStateEvent {
  data: number
}

interface YtPlayerHandle {
  destroy: () => void
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string
          playerVars?: Record<string, number | string>
          events?: {
            onReady?: () => void
            onStateChange?: (e: YtStateEvent) => void
          }
        },
      ) => YtPlayerHandle
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

const YT_PLAYING = 1
const YT_ENDED = 0

function readWatched(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

let ytApiPromise: Promise<void> | null = null

function loadYtApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve()
      return
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.body.appendChild(script)
  })
  return ytApiPromise
}

function Equalizer() {
  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-primary animate-pulse"
          style={{ height: `${[60, 100, 75][i]}%`, animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  )
}

function HeroThumb({ videoId, alt }: { videoId: string; alt: string }) {
  const [src, setSrc] = useState(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setSrc(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
    />
  )
}

export function VideoWatchPage() {
  const { videoId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const storageKey = `ict-watched-${user?.id ?? 'guest'}`
  const autoplayKey = `ict-autoplay-${user?.id ?? 'guest'}`

  const [watched, setWatched] = useState<string[]>(() => readWatched(storageKey))
  const [autoplay, setAutoplay] = useState<boolean>(() => localStorage.getItem(autoplayKey) !== '0')
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(watched))
  }, [watched, storageKey])

  useEffect(() => {
    localStorage.setItem(autoplayKey, autoplay ? '1' : '0')
  }, [autoplay, autoplayKey])

  const parts = ICT_PARTS
  const all = useMemo(() => allVideos(), [])

  const video = useMemo(() => all.find((vl) => vl.youtubeId === videoId), [all, videoId])
  const partIndex = useMemo(
    () => (video ? parts.findIndex((p) => p.sections.some((s) => s.videos.some((vl) => vl.youtubeId === video?.youtubeId))) : -1),
    [parts, video],
  )
  const part = partIndex >= 0 ? parts[partIndex] : null

  const playlist = useMemo(
    () => (part ? part.sections.flatMap((s) => s.videos.map((vl) => ({ video: vl, section: s.name }))) : []),
    [part],
  )

  const currentIndex = useMemo(
    () => (video ? playlist.findIndex((p) => p.video.youtubeId === video.youtubeId) : -1),
    [playlist, video],
  )

  const prevVideo = currentIndex > 0 ? playlist[currentIndex - 1]?.video : undefined
  const nextVideo = currentIndex >= 0 && currentIndex < playlist.length - 1 ? playlist[currentIndex + 1]?.video : undefined

  const watchedSet = useMemo(() => new Set(watched), [watched])
  const partTotal = part ? playlist.length : 0
  const partWatchedCount = part ? playlist.filter((p) => watchedSet.has(p.video.youtubeId)).length : 0
  const sectionName = currentIndex >= 0 ? playlist[currentIndex].section : ''

  const playerRef = useRef<HTMLDivElement>(null)
  const currentSectionRef = useRef<HTMLButtonElement>(null)

  const markWatched = (id: string) => {
    setWatched((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const toggleWatched = (id: string) => {
    setWatched((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const go = (id: string) => {
    setEnded(false)
    navigate(`/learn/watch/${id}`, { replace: true })
  }

  const openExternal = (id: string) => {
    const target = all.find((vl) => vl.youtubeId === id)
    if (target) window.open(videoUrl(target), '_blank', 'noopener,noreferrer')
    markWatched(id)
    if (autoplay && nextVideo?.youtubeId) go(nextVideo.youtubeId)
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [videoId])

  useEffect(() => {
    if (!video || !isEmbeddable(video)) return
    let player: YtPlayerHandle | null = null
    let mounted = true

    loadYtApi().then(() => {
      if (!mounted || !playerRef.current || !window.YT) return
      try {
        player = new window.YT.Player(playerRef.current, {
          videoId: video.youtubeId,
          playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
          events: {
            onStateChange: (e) => {
              if (e.data === YT_PLAYING) {
                markWatched(video.youtubeId)
              }
              if (e.data === YT_ENDED) {
                setEnded(true)
                if (autoplay && nextVideo) go(nextVideo.youtubeId)
              }
            },
          },
        })
      } catch {
        player = null
      }
    })

    return () => {
      mounted = false
      try {
        // Only destroy while the player element is still in the document.
        // When navigating to a non-embeddable video (or away from the page),
        // React has already removed the div — destroying the detached player
        // throws and crashes the app.
        if (player && playerRef.current?.isConnected) player.destroy()
      } catch {
        // ignore — the iframe is gone with the DOM
      }
      player = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  useEffect(() => {
    currentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentIndex])

  if (!video || !part) return <Navigate to="/learn" replace />

  const embeddable = isEmbeddable(video)
  const done = watchedSet.has(video.youtubeId)
  const partPct = partTotal === 0 ? 0 : Math.round((partWatchedCount / partTotal) * 100)

  return (
    <div className="relative min-h-full overflow-hidden bg-background text-text-primary">
      <div className="pointer-events-none absolute -top-40 right-0 h-[420px] w-[520px] rounded-full bg-primary/10 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 -left-40 h-[380px] w-[420px] rounded-full bg-info/10 blur-[140px]" />

      <div className="relative mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 py-6 pb-16">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/learn"
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-glass px-4 py-2 text-sm font-bold text-text-secondary transition-all hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Video Library
          </Link>
          <HubChip tone="primary">Part {partIndex + 1} · {part.title}</HubChip>
          {!embeddable && <HubChip tone="warning">YouTube only</HubChip>}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-8">
          <div className="min-w-0">
            <div className="rounded-[26px] bg-gradient-to-br from-primary/70 via-primary-light/40 to-info/60 p-[1.5px] shadow-primary/20 shadow-2xl">
              <div className="relative aspect-video w-full overflow-hidden rounded-[25px] bg-black">
                {embeddable ? (
                  <>
                    <div ref={playerRef} className="h-full w-full" />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      {!window.YT?.Player && (
                        <span className="flex items-center gap-3 text-white/70 text-sm font-black tracking-widest uppercase">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          Loading player…
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openExternal(video.youtubeId)}
                    className="group absolute inset-0 text-left"
                  >
                    <HeroThumb videoId={video.youtubeId} alt={video.title} />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />

                    <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/90 backdrop-blur">
                      YouTube only · embedding disabled
                    </span>

                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                      <span className="relative">
                        <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />
                        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_10px_40px_-5px_rgba(239,68,68,0.7)] transition-transform duration-300 group-hover:scale-110">
                          <PlayCircle className="w-10 h-10" />
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-black tracking-wide text-white backdrop-blur transition-colors group-hover:bg-white/20">
                        <MonitorPlay className="w-4 h-4" /> Watch on YouTube
                      </span>
                    </span>

                    <span className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3">
                      <span className="max-w-[70%] text-white text-xs font-bold leading-snug line-clamp-2 drop-shadow">
                        {video.title}
                      </span>
                      <span className="rounded-lg bg-black/70 px-2 py-1 text-[11px] font-black text-white tabular-nums backdrop-blur">
                        {video.minutes ?? DEFAULT_VIDEO_MINUTES} min
                      </span>
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 flex items-start justify-between gap-4">
              <h1 className="text-xl md:text-2xl font-black tracking-tight leading-snug">{video.title}</h1>
              <Equalizer />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-bold text-text-muted tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> {video.minutes ?? DEFAULT_VIDEO_MINUTES} min
              </span>
              <span className="text-text-muted/40">•</span>
              <span>{sectionName}</span>
              <span className="text-text-muted/40">•</span>
              <span>
                {partWatchedCount}/{partTotal} watched · {partPct}%
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={videoUrl(video)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-text-inverse font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-primary"
              >
                <MonitorPlay className="w-4 h-4" /> Watch on YouTube
              </a>
              <button
                type="button"
                onClick={() => toggleWatched(video.youtubeId)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border font-black text-sm transition-colors ${
                  done
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-border bg-glass text-text-primary hover:border-primary/40 hover:text-primary'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                {done ? 'Watched' : 'Mark as watched'}
              </button>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                disabled={!prevVideo}
                onClick={() => prevVideo && go(prevVideo.youtubeId)}
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-bold text-text-primary transition-all hover:border-primary/40 hover:text-primary hover:shadow-primary/10 hover:shadow-md disabled:pointer-events-none disabled:opacity-40"
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>
              <button
                type="button"
                disabled={!nextVideo}
                onClick={() => nextVideo && go(nextVideo.youtubeId)}
                className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 text-sm font-bold text-text-primary transition-all hover:border-primary/40 hover:text-primary hover:shadow-primary/10 hover:shadow-md disabled:pointer-events-none disabled:opacity-40"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
              {ended && (
                <button
                  type="button"
                  onClick={() => go(video.youtubeId)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-2 text-sm font-black text-primary border border-primary/30 transition-all hover:brightness-110"
                >
                  <RotateCcw className="w-4 h-4" /> Replay
                </button>
              )}
            </div>

            <div className="relative mt-6 overflow-hidden rounded-[20px] border border-border bg-glass/80 p-5 backdrop-blur">
              <div className="pointer-events-none absolute -top-20 right-0 h-40 w-64 rounded-full bg-primary/10 blur-[80px]" />
              <p className="relative text-sm leading-relaxed text-text-secondary">{part.description}</p>
              <div className="relative mt-3 flex flex-wrap gap-2">
                {part.tags.map((tag, ti) => (
                  <HubChip key={tag} tone={(['primary', 'success', 'info', 'warning', 'muted'] as const)[ti % 5]}>
                    {tag}
                  </HubChip>
                ))}
              </div>
            </div>
          </div>

          <aside className="w-full self-start lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-[20px] border border-border bg-glass/80 backdrop-blur">
              <div className="border-b border-border/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ListVideo className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-black uppercase tracking-widest">Up Next</h2>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Autoplay</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoplay}
                      onClick={() => setAutoplay((a) => !a)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${autoplay ? 'bg-gradient-to-r from-primary to-primary-dark' : 'bg-border'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${autoplay ? 'left-[22px]' : 'left-0.5'}`}
                      />
                    </button>
                  </label>
                </div>
                <p className="mt-1 text-[11px] font-bold text-text-muted tabular-nums">
                  {part.title} · {partTotal} videos · ~{Math.round(partTotal * DEFAULT_VIDEO_MINUTES / 60)}h
                </p>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-border/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-info transition-all duration-500"
                    style={{ width: `${partPct}%` }}
                  />
                </div>
              </div>

              <ul className="max-h-[62vh] space-y-1 overflow-y-auto p-2">
                {playlist.map(({ video: pl, section }, idx) => {
                  const isCurrent = pl.youtubeId === video.youtubeId
                  const isDone = watchedSet.has(pl.youtubeId)
                  const blocked = !isEmbeddable(pl)
                  return (
                    <li key={pl.youtubeId}>
                      <button
                        type="button"
                        onClick={() => go(pl.youtubeId)}
                        ref={isCurrent ? currentSectionRef : undefined}
                        className={`group relative flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all ${
                          isCurrent
                            ? 'bg-primary/10 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]'
                            : 'hover:translate-x-1 hover:bg-background/70'
                        }`}
                      >
                        {isCurrent && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-primary to-info" />}
                        <span
                          className={`w-5 flex-shrink-0 text-center text-[11px] font-black tabular-nums ${
                            isCurrent ? 'text-primary' : 'text-text-muted'
                          }`}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="relative flex-shrink-0">
                          <img
                            src={`https://i.ytimg.com/vi/${pl.youtubeId}/mqdefault.jpg`}
                            alt=""
                            loading="lazy"
                            className={`h-12 w-20 rounded-lg border border-border object-cover transition-all ${
                              isCurrent ? '' : isDone ? 'opacity-40' : 'group-hover:opacity-90'
                            }`}
                          />
                          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 py-px text-[9px] font-bold text-white tabular-nums">
                            {pl.minutes ?? DEFAULT_VIDEO_MINUTES}m
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-[13px] font-bold leading-snug line-clamp-2 ${
                              isDone && !isCurrent
                                ? 'text-text-muted line-through decoration-text-muted/50'
                                : isCurrent
                                  ? 'text-primary'
                                  : 'text-text-primary group-hover:text-primary-light'
                            } transition-colors`}
                          >
                            {pl.title}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                              {section}
                            </span>
                            {blocked && (
                              <span className="rounded-full bg-border/70 px-1.5 py-px text-[9px] font-black uppercase tracking-wider text-text-muted">
                                YouTube only
                              </span>
                            )}
                          </span>
                        </span>
                        {isDone && <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </aside>
        </div>

        <p className="relative mt-10 text-center text-xs text-text-muted max-w-xl mx-auto leading-relaxed">
          All videos are the free public teachings of The Inner Circle Trader on YouTube.com — TradeSense is not affiliated with the
          channel. Some videos are embedding-restricted by the owner and play on YouTube instead. Autoplay plays the playlist one by
          one in syllabus order; progress is stored locally in your browser.
        </p>
      </div>
    </div>
  )
}