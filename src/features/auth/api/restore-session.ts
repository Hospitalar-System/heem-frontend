import { isDemoMode } from '@/lib/demo-mode'
import { clearAuthSession, readStoredRefreshToken, setAuthRestoring, setAuthSession, storeRefreshToken } from '../session'
import { getCurrentUser } from './identity'
import { KeycloakAuthError, refreshTokens } from './keycloak'

let pending: Promise<void> | null = null

/**
 * Restaura a sessão na abertura do app: refresh token armazenado -> refresh -> /me.
 * Refresh recusado (invalid_grant) limpa o storage; erro de rede preserva o refresh token
 * para a próxima abertura. Nunca lança: o resultado aparece no estado da sessão.
 */
export function restoreSession(): Promise<void> {
  if (isDemoMode) return Promise.resolve()
  const stored = readStoredRefreshToken()
  if (!stored) return Promise.resolve()
  pending ??= run(stored).finally(() => { pending = null })
  return pending
}

async function run(stored: { token: string; remembered: boolean }) {
  setAuthRestoring(true)
  try {
    const tokens = await refreshTokens(stored.token)
    // Rotação single-use: o token antigo já morreu, então guarda o novo antes do /me.
    storeRefreshToken(tokens.refreshToken, stored.remembered)
    const user = await getCurrentUser(tokens.accessToken)
    setAuthSession(tokens.accessToken, user, {
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      rememberMe: stored.remembered,
    })
  } catch (error) {
    // Só um refresh recusado invalida a sessão; rede, 5xx ou falha no /me mantêm o token.
    if (error instanceof KeycloakAuthError && (error.kind === 'invalid_credentials' || error.kind === 'account_locked')) {
      clearAuthSession()
    }
  } finally {
    setAuthRestoring(false)
  }
}
