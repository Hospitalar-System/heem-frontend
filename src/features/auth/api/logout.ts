import { isDemoMode } from '@/lib/demo-mode'
import { logoutSession } from './keycloak'
import { clearAuthSession, getRefreshToken } from '../session'

/**
 * Encerra a sessão: limpa memória e storages na hora (o cache do React Query é limpo por
 * AuthSessionCacheCleanup) e revoga o refresh token no Keycloak em best-effort.
 * Falha de rede na revogação nunca impede o logout local; a promise nunca rejeita.
 */
export function logout(): Promise<void> {
  const refreshToken = isDemoMode ? null : getRefreshToken()
  clearAuthSession()
  if (!refreshToken) return Promise.resolve()
  return logoutSession(refreshToken).catch(() => undefined)
}
