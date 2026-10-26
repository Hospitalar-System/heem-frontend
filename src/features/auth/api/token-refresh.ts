import { isDemoMode } from '@/lib/demo-mode'
import { clearAuthSession, getAuthState, getRefreshToken, updateAuthTokens } from '../session'
import { KeycloakAuthError, refreshTokens } from './keycloak'

let inFlight: Promise<void> | null = null

/**
 * Renova o access token com o refresh token atual. O refresh token é single-use (rotação), então
 * existe no máximo uma renovação em voo: chamadas simultâneas (várias requisições com 401, agendador)
 * aguardam a mesma promise.
 * - sucesso: grava o par novo no mesmo storage do anterior (updateAuthTokens);
 * - refresh recusado (invalid_credentials): limpa a sessão e rejeita;
 * - rede, 429 ou 5xx: rejeita sem limpar a sessão (o refresh token segue válido).
 * Em modo demonstração não faz nada.
 */
export function refreshAccessToken(): Promise<void> {
  if (isDemoMode) return Promise.resolve()
  inFlight ??= run().finally(() => { inFlight = null })
  return inFlight
}

async function run() {
  const used = getRefreshToken()
  if (!used) throw new Error('Sem refresh token para renovar a sessão.')
  try {
    const tokens = await refreshTokens(used)
    // Logout durante a renovação: não ressuscita a sessão encerrada.
    if (!getAuthState().isAuthenticated) throw new Error('Sessão encerrada durante a renovação.')
    updateAuthTokens(tokens)
  } catch (error) {
    if (error instanceof KeycloakAuthError && error.kind === 'invalid_credentials') clearAuthSession()
    throw error
  }
}
