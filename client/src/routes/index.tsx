import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { GuestRoute } from '../components/layout/GuestRoute'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { BreadcrumbProvider } from '../lib/breadcrumbs'
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
  JournalFormPage,
  TradeEditPage,
  DashboardPage,
  TradesPage,
  TradeDetailPage,
  AccountsPage,
  TagsPage,
  SettingsPage,
  AdminPage,
  PlansPage,
  OutlookPage,
  ChoosePlanPage,
  AnalyticsPage,
  PropFirmsPage,
  FirmDetailPage,
  DiscountsPage,
  TradingToolsPage,
  TradingToolPage,
  LearnPage,
  VideoWatchPage,
} from '../pages'

export function AppRouter() {
  return (
    <BreadcrumbProvider>
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
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/outlook" element={<OutlookPage />} />
        <Route path="/trades" element={<TradesPage />} />
        <Route path="/trades/new" element={<JournalFormPage />} />
        <Route path="/trades/:id/edit" element={<TradeEditPage />} />
        <Route path="/trades/:id" element={<TradeDetailPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/templates" element={<Navigate to="/accounts" replace />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/prop-firms" element={<PropFirmsPage />} />
        <Route path="/prop-firms/:kind" element={<PropFirmsPage />} />
        <Route path="/prop-firms/firm/:slug" element={<FirmDetailPage />} />
        <Route path="/prop-firms/discounts" element={<DiscountsPage />} />
        <Route path="/prop-firms/compare" element={<Navigate to="/prop-firms" replace />} />
        <Route path="/prop-firms/tools" element={<Navigate to="/prop-firms" replace />} />
        <Route path="/trading-tools" element={<TradingToolsPage />} />
        <Route path="/trading-tools/:id" element={<TradingToolPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/learn/watch/:videoId" element={<VideoWatchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/billing" element={<Navigate to="/plans" replace />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BreadcrumbProvider>
  )
}
