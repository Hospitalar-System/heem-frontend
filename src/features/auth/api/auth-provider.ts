import { authConfig } from '@/lib/auth-config'
import { keycloakProvider } from './keycloak-provider'
import { supabaseProvider } from './supabase-provider'
import type { AuthTokens } from './auth-types'

export type { AuthTokens } from './auth-types'
export { AuthError, isAbortError, type AuthErrorKind } from './auth-error'

/**
 * Contrato de autenticação independente do emissor. O papel do usuário vem sempre do GET /me,
 * nunca dos tokens. Todas as mensagens de erro são fixas (AuthError) e nunca carregam segredos.
 */
export interface AuthProvider {
  readonly name: 'keycloak' | 'supabase'
  /** O provedor sabe enviar link de redefinição de senha? Sem isso a UI esconde o fluxo. */
  readonly supportsPasswordReset: boolean
  /** `signal` aborta a requisição: motivo AuthError 'timeout' vira esse erro; qualquer outro vira AbortError. */
  signIn(credentials: { email: string; password: string }, options?: { signal?: AbortSignal }): Promise<AuthTokens>
  /** Refresh token single-use (rotação): devolve um par novo. */
  refresh(refreshToken: string): Promise<AuthTokens>
  /** Best-effort: sessão já encerrada conta como sucesso. */
  signOut(session: { refreshToken: string; accessToken?: string }): Promise<void>
  /** Resposta sempre genérica: nunca revela se o e-mail existe. */
  requestPasswordReset(email: string): Promise<void>
  /** Redefinição/convite: usa o access token vindo do link, que nunca é persistido. */
  updatePassword(accessToken: string, newPassword: string): Promise<void>
}

export type AuthProviderName = AuthProvider['name']

export function resolveAuthProviderName(env: { provider?: string; supabaseUrl?: string }): AuthProviderName {
  if (env.provider === 'supabase' || env.provider === 'keycloak') return env.provider
  return env.supabaseUrl ? 'supabase' : 'keycloak'
}

export function getAuthProvider(): AuthProvider {
  return resolveAuthProviderName(authConfig) === 'supabase' ? supabaseProvider : keycloakProvider
}
