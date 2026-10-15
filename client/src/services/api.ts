import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

let accessToken: string | null = null

const cache = new Map<string, { data: unknown; expiry: number }>()
const TTL = 300_000

function getCacheKey(config: { method?: string; url?: string; params?: Record<string, unknown> }) {
  if (config.method !== 'get' && config.method !== undefined) return null
  return `${config.url}${JSON.stringify(config.params ?? {})}`
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  const key = getCacheKey(config)
  if (key) {
    const hit = cache.get(key)
    if (hit && Date.now() < hit.expiry) {
      config.adapter = () => Promise.resolve({ data: hit.data, status: 200, statusText: 'OK', headers: {}, config })
    }
  }
  return config
})

api.interceptors.response.use((response) => {
  const key = getCacheKey(response.config)
  if (key) cache.set(key, { data: response.data, expiry: Date.now() + TTL })
  if (response.config.method && !['get', 'head'].includes(response.config.method)) {
    cache.clear()
  }
  return response
})

export function clearCache(pattern?: string) {
  if (!pattern) { cache.clear(); return }
  const keys = Array.from(cache.keys()).filter(k => k.includes(pattern))
  keys.forEach(k => cache.delete(k))
}

export function setAccessToken(token: string | null) {
  accessToken = token
  if (!token) {
    try { localStorage.removeItem('accessToken') } catch {}
  }
}

export function getAccessToken() {
  return accessToken
}

let refreshSessionPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null

export function refreshSession() {
  if (!refreshSessionPromise) {
    const stored = sessionStorage.getItem('refreshToken')
    if (!stored) {
      refreshSessionPromise = Promise.resolve(null)
    } else {
      const attempt = axios
        .post('/api/v1/auth/refresh', { refreshToken: stored })
        .then(({ data }) => {
          const result = data?.data
          if (!result?.accessToken || !result?.refreshToken) return null
          setAccessToken(result.accessToken)
          sessionStorage.setItem('refreshToken', result.refreshToken)
          return result
        })
        .catch(() => {
          setAccessToken(null)
          sessionStorage.removeItem('refreshToken')
          return null
        })
      refreshSessionPromise = attempt.finally(() => {
        refreshSessionPromise = null
      })
    }
  }
  return refreshSessionPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isAuthRequest = (originalRequest.url || '').includes('/auth/')

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isAuthRequest) {
        return Promise.reject(error)
      }

      originalRequest._retry = true

      const refreshed = await refreshSession()
      if (refreshed) {
        originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`
        return api(originalRequest)
      }

      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    return Promise.reject(error)
  }
)

export default api
