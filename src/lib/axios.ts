import axios from 'axios'
import { clearAuthSession, getAuthState } from '@/features/auth/session'
import { demoApiAdapter } from '@/lib/demo-api'
import { isDemoMode } from '@/lib/demo-mode'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  withCredentials: true,
  headers: { Accept: 'application/json' },
  ...(isDemoMode ? { adapter: demoApiAdapter } : {}),
})

apiClient.interceptors.request.use((config) => {
  const token = getAuthState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthSession()
    }
    return Promise.reject(error)
  },
)
