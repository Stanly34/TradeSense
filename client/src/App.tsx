import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { useTheme } from './hooks/useTheme'
import { AppRouter } from './routes'

const queryClient = new QueryClient()

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
            <ToasterWithTheme />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
