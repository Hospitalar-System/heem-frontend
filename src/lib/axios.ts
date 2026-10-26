import axios, { type InternalAxiosRequestConfig } from 'axios'
import { refreshAccessToken } from '@/features/auth/api/token-refresh'
import { clearAuthSession, getAuthState, getRefreshToken } from '@/features/auth/session'
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

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

// 401: renova o token uma vez (renovação em voo única, ver token-refresh) e repete a requisição.
// Sem sessão autenticada (ex.: /me durante a restauração), sem refresh token ou na repetição: limpa a sessão.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) return Promise.reject(error)

    const config = error.config as RetriableConfig | undefined
    const canRefresh = !isDemoMode && !!config && !config._retry && getAuthState().isAuthenticated && !!getRefreshToken()
    if (!canRefresh) {
      clearAuthSession()
      return Promise.reject(error)
    }

    config._retry = true
    try {
      await refreshAccessToken()
    } catch {
      // Recusa do refresh já limpou a sessão; falha transitória preserva a sessão (o agendador tenta de novo).
      return Promise.reject(error)
    }
    return apiClient(config)
  },
)
