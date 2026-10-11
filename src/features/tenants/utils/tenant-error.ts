import type { ProblemDetail } from '@/features/auth/types'

export function getTenantErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: ProblemDetail } }).response
    if (response?.data?.detail) return response.data.detail
    if (response?.data?.code) return response.data.code
  }
  return 'Não foi possível criar o cliente. Tente novamente.'
}
