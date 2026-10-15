import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Settings,
  Shield,
  CalendarCheck,
  CreditCard,
  BarChart3,
  BadgeDollarSign,
  GraduationCap,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LogOut } from 'lucide-react'
import { ConfirmDialog } from '../ui/ConfirmDialog'

const USER_NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/trades', label: 'Journals', icon: TrendingUp },
  { to: '/outlook', label: 'Outlook', icon: CalendarCheck },
  { to: '/accounts', label: 'Accounts', icon: FileText },
  { to: '/prop-firms', label: 'Prop Firms', icon: BadgeDollarSign },
  { to: '/learn', label: 'Learn', icon: GraduationCap },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/plans', label: 'Plans', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: 'Admin Panel', icon: Shield },
  { to: '/prop-firms', label: 'Prop Firms', icon: BadgeDollarSign },
  { to: '/learn', label: 'Learn', icon: GraduationCap },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const [expanded, setExpanded] = useState(() => localStorage.getItem('tradesense_sidebar_open') !== 'false')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const showLabels = expanded || mobileOpen

  const navItems = user?.role === 'ADMIN' || user?.role === 'MANAGER' ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS

  useEffect(() => {
    localStorage.setItem('tradesense_sidebar_open', String(expanded))
  }, [expanded])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-20 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          'h-screen bg-sidebar flex flex-col shadow-xl',
          'fixed lg:static top-0 left-0 z-40',
          'transition-transform duration-200 ease-in-out',
          // Mobile: slide in/out
          mobileOpen ? 'translate-x-0 w-56' : '-translate-x-full',
          // Desktop: always visible, width from expanded
          'lg:translate-x-0',
          expanded ? 'lg:w-56' : 'lg:w-16',
        )}
      >
        <div className="flex items-center h-[72px] px-4 relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className={cn(
              'flex items-center gap-2.5 rounded-xl px-1.5 py-1 -ml-1.5 transition-colors hover:bg-glass focus:outline-none w-full',
              !showLabels && 'justify-center'
            )}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25">
              <span className="text-xs font-black text-white tracking-tight">TS</span>
            </div>
            <div className={cn('overflow-hidden transition-all duration-200 text-left', showLabels ? 'opacity-100 w-auto' : 'opacity-0 w-0')}>
              <span className="font-bold text-text-primary text-base tracking-tight whitespace-nowrap">TradeSense</span>
              <span className="block text-[10px] text-text-muted font-medium tracking-widest uppercase whitespace-nowrap">Journal</span>
            </div>
          </button>
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
                  showLabels ? 'px-3 py-2.5' : 'justify-center px-0 py-2.5',
                  isActive
                    ? 'text-primary bg-primary/10'
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
                  <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-primary' : 'opacity-70')} />
                  <span className={cn(
                    'overflow-hidden transition-all duration-200 whitespace-nowrap',
                    showLabels ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar bottom decoration — mini candlestick chart */}
        <div className={cn(
          'flex-shrink-0 px-3 pb-4 transition-all duration-200 overflow-hidden',
          expanded ? 'opacity-100' : 'opacity-0 h-0'
        )}>
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-end gap-[3px] h-8 mb-2" aria-hidden>
              {[14, 22, 10, 28, 18, 26, 12, 20].map((h, i) => (
                <div key={i} className="w-[5px] rounded-sm flex flex-col justify-center gap-px" style={{ height: h }}>
                  {i % 3 !== 1 ? (
                    <>
                      <div className="w-full flex-1 bg-success/70 rounded-t-sm" />
                      <div className="w-full h-[2px] bg-success/40 rounded-b-sm" />
                    </>
                  ) : (
                    <>
                      <div className="w-full flex-1 bg-danger/70 rounded-t-sm" />
                      <div className="w-full h-[2px] bg-danger/40 rounded-b-sm" />
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[9px] font-mono text-text-muted tracking-widest uppercase">TradeSense</p>
          </div>
        </div>

        <div className="flex-shrink-0 px-3 pb-4 transition-all duration-200">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={cn(
              'flex items-center rounded-xl text-sm text-text-muted hover:text-danger hover:bg-danger/10 transition-colors',
              showLabels ? 'gap-3 px-3 py-2.5 w-full' : 'justify-center w-full py-2.5'
            )}
            title="Sign out"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {expanded && <span>Sign out</span>}
          </button>
        </div>

      </aside>

      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign out?"
        message="Are you sure you want to sign out of TradeSense?"
        confirmLabel="Sign out"
      />

    </>
  )
}
