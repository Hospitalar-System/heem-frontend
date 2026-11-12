import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isDemoMode } from '@/lib/demo-mode'
import { getCurrentUser, getDevelopmentToken } from '../api/identity'
import { AuthError, getAuthProvider } from '../api/auth-provider'
import { toAbortError } from '../api/auth-error'
import type { LoginFormValues } from '../schemas/login.schema'
import { setAuthSession } from '../session'
import type { ProblemDetail, UserRole } from '../types'
import { safeInternalPath } from '../utils/safe-redirect'

/** Prazo total do login: o servidor gratuito pode levar mais de 30 s para acordar. */
export const LOGIN_TIMEOUT_MS = 40_000
/** Depois disso a tentativa ainda em curso mostra o aviso de "servidor acordando". */
export const WAKING_NOTICE_MS = 8_000

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

/** O /me respondeu 403: login válido no provedor, mas sem acesso ao HEEM. */
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
  const location = useLocation()
  const [isWaking, setIsWaking] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  // Desmontar aborta a tentativa em curso e limpa os timers.
  useEffect(() => () => {
    clearTimers()
    controllerRef.current?.abort()
  }, [clearTimers])

  const mutation = useMutation({
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

      // Nova tentativa reinicia tudo: aborta a anterior (se houver) e zera os timers.
      clearTimers()
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const { signal } = controller
      setIsWaking(false)
      timersRef.current = [
        setTimeout(() => setIsWaking(true), WAKING_NOTICE_MS),
        setTimeout(() => controller.abort(new AuthError('timeout')), LOGIN_TIMEOUT_MS),
      ]

      try {
        return await signInAndLoadUser(values, signal)
      } finally {
        if (controllerRef.current === controller) {
          clearTimers()
          controllerRef.current = null
          setIsWaking(false)
        }
      }
    },
    onSuccess: (destination) => navigate(safeInternalPath((location.state as { from?: unknown } | null)?.from) ?? destination, { replace: true }),
  })

  /** Cancelamento do usuário: aborta a requisição e volta ao estado inicial, sem erro nem mensagem. */
  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    clearTimers()
    setIsWaking(false)
    mutation.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimers, mutation.reset])

  return { ...mutation, isWaking, cancel }
}

async function signInAndLoadUser(values: LoginFormValues, signal: AbortSignal): Promise<string> {
  const { accessToken, refreshToken, expiresAt } = await getAuthProvider().signIn(
    { email: values.email, password: values.password },
    { signal },
  )
  try {
    const user = await getCurrentUser(accessToken, signal)
    const destination = getRoleLandingPath(user.roles)
    if (!destination) throw new Error(noRoleMessage)
    // Só grava a sessão (e o refresh token) depois de /me e papel validados.
    setAuthSession(accessToken, user, { refreshToken, expiresAt, rememberMe: values.rememberMe })
    return destination
  } catch (error) {
    // Sem sessão utilizável: revoga o refresh token (best-effort) e não persiste nada.
    void getAuthProvider().signOut({ refreshToken, accessToken }).catch(() => undefined)
    // Abortado no /me (axios lança CanceledError): vira timeout ou cancelamento.
    if (signal.aborted) throw toAbortError(signal)
    const reason = getForbiddenReason(error)
    throw reason ? new AccessBlockedError(reason) : error
  }
}
