import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { GuestRoute } from '../components/layout/GuestRoute'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { useAuth } from '../hooks/useAuth'

function HomeRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth()
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>
  const target = isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'MANAGER') ? '/admin' : '/dashboard'
  return <Navigate to={target} replace />
}
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  OtpVerificationPage,
} from '../pages/auth'
import {
  DashboardPage,
  TradesPage,
  TradeDetailPage,
  TemplatesPage,
  TagsPage,
  SettingsPage,
  AdminPage,
  PlansPage,
  OutlookPage,
  ChoosePlanPage,
  BillingPage,
  CalendarPage,
} from '../pages'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/verify-otp" element={<GuestRoute><OtpVerificationPage /></GuestRoute>} />

      <Route path="/choose-plan" element={<ProtectedRoute><ChoosePlanPage /></ProtectedRoute>} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/outlook" element={<OutlookPage />} />
        <Route path="/trades" element={<TradesPage />} />
        <Route path="/trades/:id" element={<TradeDetailPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
