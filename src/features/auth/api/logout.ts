import { isDemoMode } from '@/lib/demo-mode'
import { getAuthProvider } from './auth-provider'
import { clearAuthSession, getAuthState, getRefreshToken } from '../session'

/**
 * Encerra a sessão: limpa memória e storages na hora (o cache do React Query é limpo por
 * AuthSessionCacheCleanup) e revoga o refresh token no provedor de autenticação em best-effort.
 * Falha de rede na revogação nunca impede o logout local; a promise nunca rejeita.
 */
export function logout(): Promise<void> {
  const refreshToken = isDemoMode ? null : getRefreshToken()
  const accessToken = getAuthState().accessToken ?? undefined
  clearAuthSession()
  if (!refreshToken) return Promise.resolve()
  return getAuthProvider().signOut({ refreshToken, accessToken }).catch(() => undefined)
}
