import { apiClient } from '@/lib/axios'
import type { AuthTokenDTO, LoginCredentialsDTO } from '../types'

export async function login(credentials: LoginCredentialsDTO) {
  const { data } = await apiClient.post<AuthTokenDTO>('/auth/login', credentials)
  return data
}
