import { NavLink, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Settings,
  Shield,
  Tags,
  Bell,
  LogOut,
  User,
  X,
  Sparkles,
  CheckCheck,
  Pin,
  PinOff,
  CalendarCheck,
  CreditCard,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import * as notificationService from '../../services/notifications'
import type { Notification } from '../../services/notifications'

const USER_NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/outlook', label: 'Outlook', icon: CalendarCheck },
  { to: '/trades', label: 'Journals', icon: TrendingUp },
  { to: '/templates', label: 'Accounts', icon: FileText },
  { to: '/tags', label: 'Checklist', icon: Tags },
  { to: '/plans', label: 'Plans', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: 'Admin Panel', icon: Shield },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [pinned, setPinned] = useState(() => localStorage.getItem('tradesense_sidebar_pinned') === 'true')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const notifRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const navItems = user?.role === 'ADMIN' || user?.role === 'MANAGER' ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS

  useEffect(() => {
    localStorage.setItem('tradesense_sidebar_pinned', String(pinned))
  }, [pinned])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    notificationService.getUnreadCount().then(setUnreadCount).catch(() => {})
    notificationService.listNotifications().then(setNotifications).catch(() => {})
  }, [])

  async function handleMarkAllRead() {
    await notificationService.markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  async function handleMarkRead(id: string) {
    await notificationService.markAsRead(id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  async function handleDeleteNotif(id: string) {
    await notificationService.deleteNotification(id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // proceed with client-side logout even if server call fails
    }
    navigate('/login')
  }

  const expanded = pinned || isHovered

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        onMouseEnter={() => { if (!pinned) setIsHovered(true) }}
        onMouseLeave={() => { if (!pinned) setIsHovered(false) }}
        className={cn(
          'h-screen bg-sidebar flex flex-col transition-all duration-200 shadow-xl',
          expanded ? 'w-56' : 'w-16',
          'fixed lg:static inset-y-0 left-0 z-30'
        )}
      >
        <div className="flex items-center h-[72px] px-4 relative flex-shrink-0">
          <div className={cn('flex items-center gap-2.5', !expanded && 'justify-center w-full')}>
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25">
              <Sparkles className="w-4 h-4 text-text-inverse" />
            </div>
            <div className={cn('overflow-hidden transition-all duration-200', expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0')}>
              <span className="font-bold text-text-primary text-base tracking-tight whitespace-nowrap">TradeSense</span>
              <span className="block text-[10px] text-text-muted font-medium tracking-widest uppercase whitespace-nowrap">Journal</span>
            </div>
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {mobileOpen && (
              <button onClick={onMobileClose} className="p-1 text-text-muted hover:text-text-primary lg:hidden">
                <X className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setPinned(!pinned)}
              className="p-1.5 rounded-lg transition-all duration-200 text-text-muted hover:text-primary-light hover:bg-glass"
              title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 relative',
                  expanded ? 'px-3 py-2.5' : 'justify-center px-0 py-2.5',
                  isActive
                    ? 'text-primary-light bg-primary/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-glass'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className={cn(
                      'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-full',
                      expanded ? 'left-0' : 'left-0'
                    )} />
                  )}
                  <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-primary-light' : 'opacity-70')} />
                  <span className={cn(
                    'overflow-hidden transition-all duration-200 whitespace-nowrap',
                    expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border/50 px-2 py-3 space-y-1 flex-shrink-0">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className={cn(
                'flex items-center gap-3 rounded-xl transition-all duration-200 w-full relative',
                expanded ? 'px-3 py-2.5' : 'justify-center px-0 py-2.5'
              )}
            >
              <div className="relative">
                <Bell className="w-5 h-5 text-text-secondary" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center bg-danger text-text-inverse text-[9px] font-bold rounded-full px-1 shadow-sm shadow-danger/30">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-sm text-text-secondary overflow-hidden transition-all duration-200 whitespace-nowrap',
                expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              )}>
                Notifications
              </span>
            </button>

            {showNotifs && (
              <div className="absolute left-full ml-2 bottom-0 w-80 bg-elevated backdrop-blur-2xl rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-primary-light hover:text-primary font-medium flex items-center gap-1">
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-text-muted text-sm">No notifications</div>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-glass transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{n.title}</p>
                          {n.message && <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.message}</p>}
                          <p className="text-[10px] text-text-muted mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {!n.isRead && (
                            <button onClick={() => handleMarkRead(n.id)} className="p-1 text-text-muted hover:text-success">
                              <CheckCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleDeleteNotif(n.id)} className="p-1 text-text-muted hover:text-danger">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                'flex items-center gap-3 rounded-xl transition-all duration-200 w-full',
                expanded ? 'px-3 py-2.5' : 'justify-center px-0 py-2.5'
              )}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-border flex-shrink-0">
                {user?.profileImage ? (
                  <img src={user.profileImage as string} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-text-inverse" />
                )}
              </div>
              <div className={cn(
                'overflow-hidden transition-all duration-200',
                expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              )}>
                <p className="text-sm font-medium text-text-primary text-left whitespace-nowrap leading-tight">
                  {user?.fullName || user?.username}
                </p>
                <p className="text-[10px] text-text-muted text-left whitespace-nowrap leading-tight">View profile</p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute left-full ml-2 bottom-0 w-48 bg-elevated rounded-2xl shadow-xl border border-border py-1 z-[9999]">
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/settings') }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-glass transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile Settings
                </button>
                <hr className="my-1 border-border" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

      </aside>
    </>
  )
}
