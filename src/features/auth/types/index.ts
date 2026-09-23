export type UserRole =
  | 'super_admin'
  | 'admin_cliente'
  | 'tecnico'
  | 'interno_hospital'

export interface LoginCredentialsDTO {
  email: string
  password: string
  rememberMe?: boolean
}

export interface UserProfileDTO {
  id: string
  name: string
  email: string
  roles: UserRole[]
  tenantId?: string | null
}

export interface AuthTokenDTO {
  accessToken: string
  tokenType: 'Bearer' | string
  expiresIn: number
  user: UserProfileDTO
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
