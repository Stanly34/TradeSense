import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface ProRouteProps {
  children: React.ReactNode
}

export function ProRoute({ children }: ProRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const hasProAccess = user?.subscription?.plan?.weeklyOutlook

  if (!hasProAccess) {
    return <Navigate to="/plans" state={{ reason: 'outlook' }} replace />
  }

  return <>{children}</>
}
