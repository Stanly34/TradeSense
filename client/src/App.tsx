import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { ThemeProvider } from './contexts/ThemeContext'
import { useTheme } from './hooks/useTheme'
import { AppRouter } from './routes'
import api from './services/api'

const queryClient = new QueryClient()

const prefetchRoutes = [
  '/dashboard/stats',
  '/dashboard/monthly-performance',
  '/dashboard/result-distribution',
  '/dashboard/instrument-performance',
  '/dashboard/recent-trades',
  '/trades?limit=20&page=1&sortBy=createdAt&sortOrder=desc',
  '/journals',
  '/templates',
  '/tags',
  '/plans',
  '/plans/current',
  '/notifications/preferences',
  '/outlooks',
  '/dashboard/calendar',
]

function PrefetchOnAuth() {
  const { user } = useAuth()
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    const entries = prefetchRoutes.map(url =>
      api.get(url, { signal: controller.signal }).catch(() => {})
    )
    Promise.allSettled(entries)
    return () => controller.abort()
  }, [user])
  return null
}

function KeepAlive() {
  const { user } = useAuth()
  useEffect(() => {
    if (!user) return
    const id = setInterval(() => {
      fetch('/api/health').catch(() => {})
    }, 30_000)
    return () => clearInterval(id)
  }, [user])
  return null
}

function ToasterWithTheme() {
  const { activeTheme } = useTheme()
  const isDark = activeTheme === 'dark'
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 5000,
        style: {
          borderRadius: '12px',
          background: isDark ? '#18181F' : '#FFFFFF',
          color: isDark ? '#FFFFFF' : '#111827',
          border: isDark ? '1px solid #2A2A36' : '1px solid #E8EAF2',
          boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      }}
    />
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <AppRouter />
            <KeepAlive />
            <PrefetchOnAuth />
            <ToasterWithTheme />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
