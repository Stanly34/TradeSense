import api from './api'
import { setAccessToken } from './api'

export interface RegisterInput {
  fullName: string
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthResponse {
  user: Record<string, unknown>
  accessToken: string
  refreshToken: string
  verificationToken?: string
}

export async function checkAvailability(field: 'username' | 'email', value: string): Promise<{ available: boolean }> {
  const { data } = await api.get(`/auth/check-availability?${field}=${encodeURIComponent(value)}`)
  return data.data
}

export async function sendOtp(input: RegisterInput): Promise<void> {
  await api.post('/auth/send-otp', input)
}

export async function verifyOtpAndLogin(email: string, otp: string): Promise<AuthResponse> {
  const { data } = await api.post('/auth/verify-otp', { email, otp })
  const result = data.data
  setAccessToken(result.accessToken)
  localStorage.setItem('refreshToken', result.refreshToken)
  return result
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post('/auth/login', input)
  const result = data.data
  setAccessToken(result.accessToken)
  localStorage.setItem('refreshToken', result.refreshToken)
  return result
}

export async function logout() {
  const refreshToken = localStorage.getItem('refreshToken')
  try {
    await api.post('/auth/logout', { refreshToken })
  } finally {
    setAccessToken(null)
    localStorage.removeItem('refreshToken')
  }
}

export async function logoutAll() {
  await api.post('/auth/logout-all')
  setAccessToken(null)
  localStorage.removeItem('refreshToken')
}

export async function getMe(): Promise<Record<string, unknown>> {
  const { data } = await api.get('/auth/me')
  return data.data
}

export async function verifyEmail(token: string): Promise<void> {
  await api.post('/auth/verify-email', { token })
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email })
}

export async function resetPassword(token: string, password: string, confirmPassword: string): Promise<void> {
  await api.post('/auth/reset-password', { token, password, confirmPassword })
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  await api.patch('/auth/change-password', { currentPassword, newPassword, confirmPassword })
}

export async function uploadAvatar(file: File): Promise<Record<string, unknown>> {
  const formData = new FormData()
  formData.append('image', file)
  const { data } = await api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}
