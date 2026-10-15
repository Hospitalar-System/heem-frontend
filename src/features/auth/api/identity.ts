import axios from 'axios'
import { apiClient } from '@/lib/axios'
import type { CurrentUserResponse, UserProfileDTO } from '../types'

const devTokenUrl = 'http://localhost:8080/dev/token/admin-cliente'

const devTokenClient = axios.create({
  headers: { Accept: 'application/json, text/plain' },
})

export async function getDevelopmentToken() {
  const { data } = await devTokenClient.get<unknown>(devTokenUrl)
  const token = typeof data === 'string'
    ? data
    : isRecord(data) && typeof data.access_token === 'string'
      ? data.access_token
      : isRecord(data) && typeof data.accessToken === 'string'
        ? data.accessToken
        : isRecord(data) && typeof data.token === 'string'
          ? data.token
          : null

  if (!token) throw new Error('A rota de desenvolvimento não retornou um token válido.')
  return token
}

export async function getCurrentUser(accessToken: string) {
  const { data } = await apiClient.get<CurrentUserResponse>('/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return normalizeCurrentUser(data)
}

function normalizeCurrentUser(data: CurrentUserResponse): UserProfileDTO {
  const roles = data['https://heem.app/roles'] ?? data.roles ?? data.papeis ?? []
  const tenantId = data['https://heem.app/tenant_id'] ?? data.tenantId ?? data.tenant_id ?? null
  const id = data.id ?? data.userId ?? data.sub ?? data.subject
  const email = data.email

  if (!id || !Array.isArray(roles)) {
    throw new Error('A resposta de /api/v1/me não contém uma identidade válida.')
  }

  return {
    id,
    name: data.name ?? data.displayName ?? email ?? '',
    email,
    roles: roles.map(normalizeRole).filter(isUserRole),
    tenantId,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isUserRole(value: unknown): value is UserProfileDTO['roles'][number] {
  return value === 'super_admin'
    || value === 'admin_cliente'
    || value === 'tecnico'
    || value === 'interno_hospital'
}

function normalizeRole(value: unknown) {
  if (typeof value !== 'string') return value
  return value.replace(/^ROLE_/, '').toLowerCase()
}
