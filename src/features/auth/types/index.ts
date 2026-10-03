export type UserRole =
  | 'super_admin'
  | 'admin_cliente'
  | 'tecnico'
  | 'interno_hospital'

export interface UserProfileDTO {
  id: string
  name: string
  email?: string
  roles: UserRole[]
  tenantId?: string | null
}

export interface CurrentUserResponse {
  id?: string
  userId?: string
  sub?: string
  subject?: string
  name?: string
  displayName?: string
  email?: string
  roles?: unknown[]
  papeis?: unknown[]
  tenantId?: string | null
  tenant_id?: string | null
  'https://heem.app/roles'?: unknown[]
  'https://heem.app/tenant_id'?: string | null
}

export interface AuthState {
  accessToken: string | null
  user: UserProfileDTO | null
  isAuthenticated: boolean
}

export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  code?: string
  traceId?: string
}
