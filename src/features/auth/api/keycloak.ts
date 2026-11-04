import { oidcConfig } from '@/lib/oidc-config'
import { AuthError } from './auth-error'
import type { AuthTokens } from './auth-types'

// Cliente do Keycloak (login direto, seção 1.5 do guia de autenticação).
// Usa fetch puro, e não o apiClient, para que o corpo com a senha nunca passe
// por interceptors do axios nem por qualquer log de requisição.

export type KeycloakTokens = AuthTokens

export type KeycloakAuthErrorKind = 'invalid_credentials' | 'account_locked' | 'network' | 'unknown'

/** Erro do Keycloak: especialização de AuthError, mantida por compatibilidade. */
export class KeycloakAuthError extends AuthError {
  constructor(kind: KeycloakAuthErrorKind) {
    super(kind)
    this.name = 'KeycloakAuthError'
  }
}

const tokenUrl = () => `${oidcConfig.authority}/protocol/openid-connect/token`
const logoutUrl = () => `${oidcConfig.authority}/protocol/openid-connect/logout`

export function loginWithPassword({ email, password }: { email: string; password: string }) {
  return requestTokens({
    grant_type: 'password',
    client_id: oidcConfig.clientId,
    username: email,
    password,
    scope: 'openid',
  })
}

export function refreshTokens(refreshToken: string) {
  return requestTokens({
    grant_type: 'refresh_token',
    client_id: oidcConfig.clientId,
    refresh_token: refreshToken,
  })
}

export async function logoutSession(refreshToken: string): Promise<void> {
  const response = await send(logoutUrl(), {
    client_id: oidcConfig.clientId,
    refresh_token: refreshToken,
  })
  // O logout responde 204; sessão já encerrada (400 invalid_grant) também é sucesso para o chamador.
  if (response.ok) return
  const error = await readError(response)
  if (error.kind === 'invalid_credentials') return
  throw error
}

async function requestTokens(params: Record<string, string>): Promise<KeycloakTokens> {
  const response = await send(tokenUrl(), params)
  if (!response.ok) throw await readError(response)

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new KeycloakAuthError('unknown')
  }
  const data = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = data
  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string' || typeof expiresIn !== 'number') {
    throw new KeycloakAuthError('unknown')
  }
  return { accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000 }
}

async function send(url: string, params: Record<string, string>) {
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(params).toString(),
      credentials: 'omit',
      cache: 'no-store',
    })
  } catch {
    // Falha de rede, CORS ou serviço dormindo. Descarta a causa original de propósito.
    throw new KeycloakAuthError('network')
  }
}

// Heurístico de conta bloqueada: o Keycloak devolve invalid_grant tanto para senha errada quanto
// para bloqueio por força bruta; só o error_description muda ("Account temporarily disabled",
// "Account is disabled", "user_temporarily_disabled"). Sem essa pista, vale a mensagem genérica.
const lockedPattern = /temporar|locked|bloquead|too many|disabled/i

async function readError(response: Response): Promise<KeycloakAuthError> {
  const { status } = response
  if (status === 429) return new KeycloakAuthError('account_locked')
  if (status === 502 || status === 503 || status === 504) return new KeycloakAuthError('network')

  let error = ''
  let description = ''
  try {
    const body = (await response.json()) as { error?: unknown; error_description?: unknown }
    if (typeof body.error === 'string') error = body.error
    if (typeof body.error_description === 'string') description = body.error_description
  } catch {
    // corpo ausente ou não JSON: cai em unknown/invalid conforme o status
  }

  if (error === 'invalid_grant') {
    return new KeycloakAuthError(lockedPattern.test(description) ? 'account_locked' : 'invalid_credentials')
  }
  if (!error && status === 401) return new KeycloakAuthError('invalid_credentials')
  return new KeycloakAuthError('unknown')
}
