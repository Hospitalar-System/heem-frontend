import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getCurrentUser, getDevelopmentToken } from '../api/identity'
import { setAuthSession } from '../session'
import type { ProblemDetail, UserRole } from '../types'

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
    mutationFn: async (profile: string) => {
      const accessToken = await getDevelopmentToken(profile)
      const user = await getCurrentUser(accessToken)
      return { accessToken, user }
    },
    onSuccess: ({ accessToken, user }) => {
      const destination = getRoleLandingPath(user.roles)
      if (!destination) {
        toast.error('Sua conta não possui um perfil de acesso reconhecido.')
        return
      }
      setAuthSession(accessToken, user)
      navigate(destination, { replace: true })
    },
    onError: (error) => toast.error(getLoginErrorMessage(error)),
  })
}
