import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface GuestRouteProps {
  children: React.ReactNode
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isAuthenticated) {
    const redirectTo = user?.role === 'ADMIN' || user?.role === 'MANAGER' ? '/admin' : '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
