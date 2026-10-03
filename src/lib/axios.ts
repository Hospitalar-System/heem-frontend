import axios from 'axios'
import { getAuthState } from '@/features/auth/session'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  withCredentials: true,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = getAuthState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
