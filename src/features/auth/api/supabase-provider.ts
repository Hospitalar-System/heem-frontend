import { authConfig } from '@/lib/auth-config'
import { AuthError, toAbortError } from './auth-error'
import type { AuthProvider } from './auth-provider'
import type { AuthTokens } from './auth-types'

// Adaptador do Supabase Auth (GoTrue REST). Usa fetch puro, e não o apiClient, para que a senha e
// os tokens nunca passem por interceptors do axios nem por log de requisição. A anon key é pública.

type Context = 'session' | 'link'

const base = () => `${authConfig.supabaseUrl}/auth/v1`

function headers(bearer?: string): Record<string, string> {
  const key = authConfig.supabaseAnonKey
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    apikey: key,
    Authorization: `Bearer ${bearer ?? key}`,
  }
}

async function send(url: string, init: { method: string; body: unknown; bearer?: string; signal?: AbortSignal }): Promise<Response> {
  try {
    return await fetch(url, {
      method: init.method,
      headers: headers(init.bearer),
      body: JSON.stringify(init.body),
      credentials: 'omit',
      cache: 'no-store',
      signal: init.signal,
    })
  } catch {
    if (init.signal?.aborted) throw toAbortError(init.signal)
    // Falha de rede ou CORS. Descarta a causa original de propósito.
    throw new AuthError('network')
  }
}

const rateLimitCodes = new Set(['over_request_rate_limit', 'over_email_send_rate_limit', 'over_sms_send_rate_limit'])
const sessionRejectedCodes = new Set(['invalid_credentials', 'invalid_grant', 'refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'session_expired'])
const invalidLinkCodes = new Set(['bad_jwt', 'otp_expired', 'otp_disabled', 'flow_state_expired', 'flow_state_not_found'])

/** Traduz a resposta de erro do GoTrue para um AuthError de mensagem fixa (o corpo nunca é repassado). */
async function readError(response: Response, context: Context): Promise<AuthError> {
  const { status } = response
  let code = ''
  let error = ''
  try {
    const body = (await response.json()) as { code?: unknown; error_code?: unknown; error?: unknown }
    if (typeof body.error_code === 'string') code = body.error_code
    else if (typeof body.code === 'string') code = body.code
    if (typeof body.error === 'string') error = body.error
  } catch {
    // corpo ausente ou não JSON: decide só pelo status
  }

  if (status === 429 || rateLimitCodes.has(code)) return new AuthError('rate_limited')
  if (status >= 500) return new AuthError('network')
  if (code === 'email_not_confirmed') return new AuthError('email_not_confirmed')
  if (code === 'weak_password') return new AuthError('weak_password')
  if (invalidLinkCodes.has(code)) return new AuthError('invalid_link')
  if (context === 'link' && (status === 401 || status === 403)) return new AuthError('invalid_link')
  if (sessionRejectedCodes.has(code) || error === 'invalid_grant') return new AuthError('invalid_credentials')
  if (!code && status === 401 && context === 'session') return new AuthError('invalid_credentials')
  return new AuthError('unknown')
}

async function requestTokens(path: string, body: Record<string, string>, signal?: AbortSignal): Promise<AuthTokens> {
  const response = await send(`${base()}${path}`, { method: 'POST', body, signal })
  if (!response.ok) throw await readError(response, 'session')

  let json: unknown
  try {
    json = await response.json()
  } catch {
    throw new AuthError('unknown')
  }
  const data = (typeof json === 'object' && json !== null ? json : {}) as Record<string, unknown>
  const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = data
  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string' || typeof expiresIn !== 'number') {
    throw new AuthError('unknown')
  }
  return { accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000 }
}

export const supabaseProvider: AuthProvider = {
  name: 'supabase',
  supportsPasswordReset: true,

  signIn: ({ email, password }, options) => requestTokens('/token?grant_type=password', { email, password }, options?.signal),

  refresh: (refreshToken) => requestTokens('/token?grant_type=refresh_token', { refresh_token: refreshToken }),

  async signOut({ accessToken }) {
    // O logout do Supabase é autenticado pelo access token (escopo local); sem ele, nada a revogar.
    if (!accessToken) return
    const response = await send(`${base()}/logout?scope=local`, { method: 'POST', body: {}, bearer: accessToken })
    if (response.ok) return
    // Sessão já encerrada ou token expirado: objetivo atingido.
    if (response.status === 401 || response.status === 403 || response.status === 404) return
    throw await readError(response, 'session')
  },

  async requestPasswordReset(email) {
    const redirectTo = encodeURIComponent(`${window.location.origin}/redefinir-senha`)
    const response = await send(`${base()}/recover?redirect_to=${redirectTo}`, { method: 'POST', body: { email } })
    if (response.ok) return
    throw await readError(response, 'session')
  },

  async updatePassword(accessToken, newPassword) {
    const response = await send(`${base()}/user`, { method: 'PUT', body: { password: newPassword }, bearer: accessToken })
    if (response.ok) return
    throw await readError(response, 'link')
  },
}
