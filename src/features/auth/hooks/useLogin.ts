import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { login } from '../api/login'
import { setAuthSession } from '../session'
import type { LoginCredentialsDTO, ProblemDetail, UserRole } from '../types'

const roleLandingPaths: Record<UserRole, string> = {
  super_admin: '/platform/clients',
  admin_cliente: '/dashboard',
  tecnico: '/field',
  interno_hospital: '/hospital/requests',
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
  return 'Não foi possível conectar ao serviço. Tente novamente.'
}

export function useLogin() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (credentials: LoginCredentialsDTO) => login(credentials),
    onSuccess: (result) => {
      const destination = getRoleLandingPath(result.user.roles)
      if (!destination) {
        toast.error('Sua conta não possui um perfil de acesso reconhecido.')
        return
      }
      setAuthSession(result.accessToken, result.user)
      navigate(destination, { replace: true })
    },
    onError: (error) => toast.error(getLoginErrorMessage(error)),
  })
}
