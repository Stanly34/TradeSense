import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, CheckCheck, Menu, Moon, Sun, User, X, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import * as notificationService from '../../services/notifications'
import type { Notification } from '../../services/notifications'
import { useBreadcrumbOverride, type Crumb } from '../../lib/breadcrumbs'

interface TopBarProps {
  mobileOpen: boolean
  onMobileToggle: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupNotifications(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {}
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000

  notifications.forEach((n) => {
    const ts = new Date(n.createdAt).getTime()
    let key = 'Earlier'
    if (ts >= todayStart) key = 'Today'
    else if (ts >= yesterdayStart) key = 'Yesterday'
    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  })

  return groups
}

function notifIcon(type: string) {
  const t = type.toLowerCase()
  if (t.includes('payout') || t.includes('profit')) return { icon: '$', color: 'text-success bg-success/10' }
  if (t.includes('trade') || t.includes('journal')) return { icon: '↗', color: 'text-primary-light bg-primary/10' }
  if (t.includes('system') || t.includes('scan')) return { icon: '⚙', color: 'text-text-muted bg-glass' }
  return { icon: '●', color: 'text-primary-light bg-primary/10' }
}

function getCrumbTrail(pathname: string): Crumb[] {
  const segs = pathname.split('/').filter(Boolean)
  if (segs.length <= 1) return []
  if (segs[0] === 'trades') {
    if (segs[1] === 'new') return [{ label: 'Journals', to: '/trades' }, { label: 'New Journal' }]
    if (segs.length === 3 && segs[2] === 'edit') return [{ label: 'Journals', to: '/trades' }, { label: 'Journal' }, { label: 'Edit' }]
    return [{ label: 'Journals', to: '/trades' }, { label: 'Journal' }]
  }
  if (segs[0] === 'prop-firms' && segs.length >= 2) {
    const trail: Crumb[] = [{ label: 'Prop Firms', to: '/prop-firms' }]
    if (segs[1] !== undefined && !['futures', 'forex'].includes(segs[1])) {
      trail.push({ label: decodeURIComponent(segs[segs.length - 1]).replace(/-/g, ' ') })
    } else if (segs[1]) {
      trail.push({ label: segs[1].charAt(0).toUpperCase() + segs[1].slice(1) })
    }
    return trail
  }
  if (segs[0] === 'learn' && segs.length >= 2) {
    return [{ label: 'Learn', to: '/learn' }, { label: decodeURIComponent(segs.slice(1).join('-')).replace(/-/g, ' ') }]
  }
  return []
}

const MAIN_PAGES = new Set(['dashboard', 'trades', 'outlook', 'accounts', 'prop-firms', 'learn', 'analytics', 'plans', 'settings', 'admin'])

export function TopBar({ mobileOpen, onMobileToggle }: TopBarProps) {
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useAuth()
  const { activeTheme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const notifRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const override = useBreadcrumbOverride()
  const crumbs = override ?? getCrumbTrail(location.pathname)

  const firstSeg = location.pathname.split('/').filter(Boolean)[0] || ''
  const isMainPage = MAIN_PAGES.has(firstSeg) && location.pathname.split('/').filter(Boolean).length === 1

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    async function fetchNotifs() {
      try {
        const [count, list] = await Promise.all([
          notificationService.getUnreadCount(),
          notificationService.listNotifications(),
        ])
        setUnreadCount(count)
        setNotifications(list)
      } catch {}
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  async function handleMarkAllRead() {
    await notificationService.markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  async function handleMarkRead(id: string) {
    await notificationService.markAsRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  async function handleDeleteNotif(id: string) {
    await notificationService.deleteNotification(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }


  const iconBtn = 'p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors focus:outline-none'

  return (
    <div className="h-12 sm:h-14 flex items-center gap-1 px-3 sm:px-4 lg:px-6 relative z-40 flex-shrink-0">
      <button
        onClick={onMobileToggle}
        className={cn('lg:hidden p-2.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-glass transition-colors', mobileOpen && 'hidden')}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {crumbs.length > 0 && (
        <div className="flex items-center gap-1.5 min-w-0">
          {crumbs.length > 1 && (
            <button onClick={() => navigate(crumbs[crumbs.length - 2].to || '/')} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-hover transition-colors shrink-0" title="Back">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <nav className="flex items-center gap-1.5 text-xs font-semibold min-w-0">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-text-muted/50">/</span>}
                {c.to ? (
                  <button onClick={() => navigate(c.to!)} className="text-text-secondary hover:text-primary transition-colors truncate">{c.label}</button>
                ) : (
                  <span className="text-text-primary truncate">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      )}

      {!crumbs.length && <div className="flex-1" />}

      {isMainPage && (
        <>
          <button onClick={toggleTheme} className={iconBtn} title={activeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {activeTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <div className="relative" ref={notifRef}>
            <button onClick={() => setShowNotifs(!showNotifs)} className={cn(iconBtn, 'relative')} title="Notifications">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-danger text-white text-[9px] font-bold rounded-full px-1 shadow-sm shadow-danger/30">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

{showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-full sm:w-96 max-w-[calc(100vw-1rem)] bg-elevated rounded-2xl shadow-xl border border-border z-50 overflow-hidden origin-top-right animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-elevated/95 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-text-primary">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">{unreadCount} new</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-primary-light hover:text-primary font-medium flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-text-muted text-sm">
                    <Bell className="w-10 h-10 mx-auto mb-3 text-text-muted/40" />
                    <p className="font-medium">You're all caught up</p>
                    <p className="text-xs text-text-muted/60 mt-1">No new notifications</p>
                  </div>
                ) : (
                  <>
                    {Object.entries(groupNotifications(notifications)).map(([group, items]) => (
                      <div key={group} className="border-b border-border/50">
                        <div className="px-4 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider bg-glass/50">
                          {group}
                        </div>
                        {items.slice(0, 20).map((n) => {
                          const ic = notifIcon(n.type || '')
                          return (
                            <div key={n.id} className={cn(
                              'group relative flex items-start gap-3 px-4 py-3 hover:bg-hover transition-colors',
                              !n.isRead && 'bg-primary/[0.03] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-primary before:rounded-r-md',
                            )}>
                              <div className="relative shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0">
                                <span className={cn('text-[11px]', ic.color)}>{ic.icon}</span>
                                {!n.isRead && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-elevated animate-ping" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm truncate', !n.isRead ? 'font-semibold text-text-primary' : 'text-text-secondary')}>{n.title}</p>
                                {n.message && <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.message}</p>}
                                <p className="text-[10px] text-text-muted mt-1">{timeAgo(n.createdAt)}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!n.isRead && (
                                  <button onClick={() => handleMarkRead(n.id)} className="p-1.5 rounded-lg text-text-muted hover:text-success hover:bg-success/10" title="Mark as read" aria-label="Mark as read">
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                                <button onClick={() => handleDeleteNotif(n.id)} className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10" title="Dismiss" aria-label="Dismiss">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className="px-4 py-3 border-t border-border bg-glass/50">
                <button onClick={() => navigate('/notifications')} className="w-full text-center text-sm text-primary-light hover:text-primary font-medium flex items-center justify-center gap-1.5">
                  View all notifications
                  <ArrowLeft className="w-3.5 h-3.5 -rotate-90" />
                </button>
              </div>
            </div>
          )}
          </div>

          <button
            onClick={() => navigate('/settings')}
            className="p-1 rounded-full hover:bg-glass transition-colors focus:outline-none"
            title="Profile settings"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center shadow-md shadow-primary/20">
              {user?.profileImage ? (
                <img src={user.profileImage as string} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
          </button>
        </>
      )}
    </div>
  )
}