import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/layout/ProtectedRoute'
import { GuestRoute } from '../components/layout/GuestRoute'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
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
} from '../pages'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

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
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
