import axios from 'axios'
import { isDemoMode } from '@/lib/demo-mode'
import { clearAuthSession, readStoredRefreshToken, setAuthRestoring, setAuthSession, storeRefreshToken } from '../session'
import { getCurrentUser } from './identity'
import { KeycloakAuthError, refreshTokens } from './keycloak'

let pending: Promise<void> | null = null

// Nota (corrida restauração x login): se o usuário concluir um login enquanto a restauração está em
// andamento, o resultado da restauração pode sobrescrever a sessão nova. Aceito por ora: a tela de login
// só é alcançada depois do estado 'restoring' e a janela é curta.

/**
 * Restaura a sessão na abertura do app: refresh token armazenado -> refresh -> /me.
 * Regras de falha:
 * - refresh recusado de verdade (invalid_grant, kind invalid_credentials): limpa a sessão, mas só se o
 *   storage ainda guarda o token usado (outra aba pode ter rotacionado);
 * - 429/bloqueio, rede e 5xx no refresh: transitórios, preservam o refresh token;
 * - 401 no /me após refresh bem-sucedido: o token não serve mais, limpa a sessão;
 * - rede/5xx no /me: preserva o refresh token (já rotacionado e gravado).
 * Nunca lança: o resultado aparece no estado da sessão.
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
  let used = stored.token
  try {
    const tokens = await refreshTokens(stored.token)
    // Rotação single-use: o token antigo já morreu, então guarda o novo antes do /me.
    storeRefreshToken(tokens.refreshToken, stored.remembered)
    used = tokens.refreshToken
    const user = await getCurrentUser(tokens.accessToken)
    setAuthSession(tokens.accessToken, user, {
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      rememberMe: stored.remembered,
    })
  } catch (error) {
    const refreshRejected = error instanceof KeycloakAuthError && error.kind === 'invalid_credentials'
    const meUnauthorized = axios.isAxiosError(error) && error.response?.status === 401
    if ((refreshRejected || meUnauthorized) && readStoredRefreshToken()?.token === used) {
      clearAuthSession()
    }
  } finally {
    setAuthRestoring(false)
  }
}
