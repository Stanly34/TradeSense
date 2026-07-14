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

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: Error) => void
}> = []

function processQueue(error: Error | null, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
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
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post('/api/v1/auth/refresh', {
          refreshToken: sessionStorage.getItem('refreshToken'),
        })
        const newToken = data.data.accessToken
        setAccessToken(newToken)
        sessionStorage.setItem('refreshToken', data.data.refreshToken)
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (err) {
        processQueue(err as Error)
        setAccessToken(null)
        sessionStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
