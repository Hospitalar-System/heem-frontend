import { isDemoMode } from '@/lib/demo-mode'
import { clearAuthSession, getAuthState, getRefreshToken, readStoredRefreshToken, updateAuthTokens } from '../session'
import { KeycloakAuthError, refreshTokens, type KeycloakTokens } from './keycloak'

let inFlight: Promise<void> | null = null

/**
 * Renova o access token com o refresh token atual. O refresh token é single-use (rotação), então
 * existe no máximo uma renovação em voo: chamadas simultâneas (várias requisições com 401, agendador)
 * aguardam a mesma promise.
 * - sucesso: grava o par novo no mesmo storage do anterior (updateAuthTokens);
 * - refresh recusado (invalid_credentials): se outra aba já rotacionou o token (localStorage compartilhado),
 *   adota o token do storage e tenta uma vez; senão limpa a sessão e rejeita;
 * - rede, 429 ou 5xx: rejeita sem limpar a sessão (o refresh token segue válido);
 * - a sessão mudou durante a renovação (logout, login de outro usuário): rejeita sem tocar na sessão.
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
  let tokens: KeycloakTokens
  try {
    tokens = await refreshTokens(used)
  } catch (error) {
    if (!(error instanceof KeycloakAuthError) || error.kind !== 'invalid_credentials') throw error
    if (getRefreshToken() !== used) throw error // sessão trocada: o erro é da sessão antiga
    const adopted = readStoredRefreshToken()?.token
    if (adopted && adopted !== used) {
      // Outra aba rotacionou o token: tenta uma vez com o do storage, sem limpar.
      tokens = await refreshTokens(adopted).catch((retryError: unknown) => {
        if (retryError instanceof KeycloakAuthError && retryError.kind === 'invalid_credentials' && getRefreshToken() === used) {
          clearAuthSession()
        }
        throw retryError
      })
    } else {
      clearAuthSession()
      throw error
    }
  }
  // Só aplica se a sessão ainda é a que iniciou a renovação (nada de ressuscitar logout nem vazar para outro login).
  if (!getAuthState().isAuthenticated || getRefreshToken() !== used) throw new Error('Sessão alterada durante a renovação.')
  updateAuthTokens(tokens)
}
