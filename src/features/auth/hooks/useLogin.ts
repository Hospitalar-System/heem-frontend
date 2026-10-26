import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { isDemoMode } from '@/lib/demo-mode'
import { getCurrentUser, getDevelopmentToken } from '../api/identity'
import { loginWithPassword, logoutSession } from '../api/keycloak'
import type { LoginFormValues } from '../schemas/login.schema'
import { setAuthSession } from '../session'
import type { ProblemDetail, UserRole } from '../types'

const noRoleMessage = 'Sua conta não possui um perfil de acesso reconhecido.'

const roleLandingPaths: Record<UserRole, string> = {
  super_admin: '/dashboard',
  admin_cliente: '/dashboard',
  tecnico: '/dashboard',
  interno_hospital: '/dashboard',
}

export function getRoleLandingPath(roles: UserRole[]) {
  const priority: UserRole[] = [
    'super_admin',
    'admin_cliente',
    'tecnico',
    'interno_hospital',
  ]
  const role = priority.find((candidate) => roles.includes(candidate))
  return role ? roleLandingPaths[role] : null
}

export type AccessBlockedReason = 'USUARIO_NAO_CADASTRADO' | 'USUARIO_DESATIVADO' | 'OUTRO'

/** O /me respondeu 403: login válido no Keycloak, mas sem acesso ao HEEM. */
export class AccessBlockedError extends Error {
  readonly reason: AccessBlockedReason

  constructor(reason: AccessBlockedReason) {
    super('Acesso bloqueado.')
    this.name = 'AccessBlockedError'
    this.reason = reason
  }
}

function getForbiddenReason(error: unknown): AccessBlockedReason | null {
  if (typeof error !== 'object' || error === null || !('response' in error)) return null
  const response = (error as { response?: { status?: number; data?: ProblemDetail } }).response
  if (response?.status !== 403) return null
  const code = response.data?.code
  return code === 'USUARIO_NAO_CADASTRADO' || code === 'USUARIO_DESATIVADO' ? code : 'OUTRO'
}

export function getLoginErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: ProblemDetail } }).response
    const problem = response?.data
    if (problem?.detail) return problem.detail
    if (problem?.code) return problem.code
    if (problem?.traceId) return `Não foi possível entrar. Referência: ${problem.traceId}`
  }
  if (error instanceof Error && error.message) return error.message
  return 'Não foi possível conectar ao serviço. Tente novamente.'
}

export function useLogin() {
  const navigate = useNavigate()

  return useMutation({
    gcTime: 0, // não retém as credenciais (variables) no cache de mutações
    mutationFn: async (values?: LoginFormValues) => {
      if (isDemoMode) {
        const accessToken = await getDevelopmentToken()
        const user = await getCurrentUser(accessToken)
        const destination = getRoleLandingPath(user.roles)
        if (!destination) throw new Error(noRoleMessage)
        setAuthSession(accessToken, user)
        return destination
      }

      if (!values) throw new Error('Informe e-mail e senha para entrar.')

      const { accessToken, refreshToken, expiresAt } = await loginWithPassword({
        email: values.email,
        password: values.password,
      })
      try {
        const user = await getCurrentUser(accessToken)
        const destination = getRoleLandingPath(user.roles)
        if (!destination) throw new Error(noRoleMessage)
        // Só grava a sessão (e o refresh token) depois de /me e papel validados.
        setAuthSession(accessToken, user, { refreshToken, expiresAt, rememberMe: values.rememberMe })
        return destination
      } catch (error) {
        // Sem sessão utilizável: revoga o refresh token (best-effort) e não persiste nada.
        void logoutSession(refreshToken).catch(() => undefined)
        const reason = getForbiddenReason(error)
        throw reason ? new AccessBlockedError(reason) : error
      }
    },
    onSuccess: (destination) => navigate(destination, { replace: true }),
  })
}
