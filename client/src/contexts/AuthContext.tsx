import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import * as authService from '../services/auth'
import api, { setAccessToken, getAccessToken } from '../services/api'

export interface AuthUser {
  id: string
  fullName: string
  username: string
  email: string
  role: string
  isVerified: boolean
  isActive: boolean
  profileImage?: string | null
  subscription?: {
    id: string
    status: string
    endDate?: string | null
    autoRenew: boolean
      plan: {
        id: string
        name: string
        price: number
        accountLimit: number | null
        imageLimit: number | null
        checklistLimit: number | null
        monthlyTradeLimit: number | null
        dailyTradeLimit: number | null
        weeklyOutlook: boolean
      }
  }
  [key: string]: unknown
}

export interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (input: authService.LoginInput) => Promise<AuthUser | undefined>

  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  updateUser: (user: AuthUser) => void
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    const refreshToken = sessionStorage.getItem('refreshToken')
    const accessToken = getAccessToken()
    if (!refreshToken) {
      setIsLoading(false)
      return
    }
    try {
      if (accessToken) {
        try {
          const userData = await authService.getMe()
          console.log('[DIAG:AuthContext] getMe response:', JSON.stringify(userData, (k, v) => k === 'password' ? '***' : v, 2))
          console.log('[DIAG:AuthContext] subscription field:', userData?.subscription)
          console.log('[DIAG:AuthContext] subscription plan:', (userData as any)?.subscription?.plan)
          setUser(userData as AuthUser)
          setIsLoading(false)
          return
        } catch {
          // access token expired, fall through to refresh
        }
      }
      const { data } = await api.post('/auth/refresh', { refreshToken })
      setAccessToken(data.data.accessToken)
      sessionStorage.setItem('refreshToken', data.data.refreshToken)
      const userData = await authService.getMe()
      console.log('[DIAG:AuthContext] getMe after refresh:', JSON.stringify(userData, (k, v) => k === 'password' ? '***' : v, 2))
      console.log('[DIAG:AuthContext] subscription after refresh:', userData?.subscription)
      console.log('[DIAG:AuthContext] plan after refresh:', (userData as any)?.subscription?.plan)
      setUser(userData as AuthUser)
    } catch {
      sessionStorage.removeItem('refreshToken')
      setAccessToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = useCallback(async (input: authService.LoginInput) => {
    const result = await authService.login(input)
    const userData = result.user as AuthUser
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const logoutAll = useCallback(async () => {
    await authService.logoutAll()
    setUser(null)
  }, [])

  const updateUser = useCallback((updated: AuthUser) => {
    setUser(updated)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.getMe()
      setUser(userData as AuthUser)
    } catch {
      // silently fail
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        logoutAll,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
