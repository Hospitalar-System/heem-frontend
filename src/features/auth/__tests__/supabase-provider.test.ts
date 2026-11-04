import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError, type AuthErrorKind } from '../api/auth-error'
import { supabaseProvider } from '../api/supabase-provider'

vi.mock('@/lib/auth-config', () => ({
  authConfig: { provider: 'supabase', supabaseUrl: 'https://proj.supabase.co', supabaseAnonKey: 'anon-public-key' },
}))

const fetchMock = vi.fn()
const jsonResponse = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

function lastCall() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return { url, init, headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(init.body as string) : undefined }
}

describe('supabaseProvider', () => {
  it('signIn: URL, headers e corpo; devolve o par de tokens', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { access_token: 'a1', refresh_token: 'r1', expires_in: 3600, user: {} }))
    const before = Date.now()
    const tokens = await supabaseProvider.signIn({ email: 'ana@x.com', password: 'Segredo#123' })

    const { url, init, headers, body } = lastCall()
    expect(url).toBe('https://proj.supabase.co/auth/v1/token?grant_type=password')
    expect(init.method).toBe('POST')
    expect(headers.apikey).toBe('anon-public-key')
    expect(headers.Authorization).toBe('Bearer anon-public-key')
    expect(body).toEqual({ email: 'ana@x.com', password: 'Segredo#123' })
    expect(init.credentials).toBe('omit')
    expect(tokens.accessToken).toBe('a1')
    expect(tokens.refreshToken).toBe('r1')
    expect(tokens.expiresAt).toBeGreaterThanOrEqual(before + 3_600_000)
  })

  it('refresh: grant_type=refresh_token com o refresh token no corpo', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { access_token: 'a2', refresh_token: 'r2', expires_in: 60 }))
    const tokens = await supabaseProvider.refresh('r1')

    const { url, body } = lastCall()
    expect(url).toBe('https://proj.supabase.co/auth/v1/token?grant_type=refresh_token')
    expect(body).toEqual({ refresh_token: 'r1' })
    expect(tokens.refreshToken).toBe('r2')
  })

  it('resposta 200 sem tokens vira unknown', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { access_token: 'a' }))
    await expect(supabaseProvider.signIn({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({ kind: 'unknown' })
  })

  it('signOut: Authorization com o access token, escopo local', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await supabaseProvider.signOut({ refreshToken: 'r1', accessToken: 'a1' })

    const { url, headers, init } = lastCall()
    expect(url).toBe('https://proj.supabase.co/auth/v1/logout?scope=local')
    expect(init.method).toBe('POST')
    expect(headers.Authorization).toBe('Bearer a1')
    expect(headers.apikey).toBe('anon-public-key')
  })

  it('signOut: sem access token não chama a rede; sessão já encerrada (401) é sucesso; 5xx rejeita', async () => {
    await supabaseProvider.signOut({ refreshToken: 'r1' })
    expect(fetchMock).not.toHaveBeenCalled()

    fetchMock.mockResolvedValueOnce(jsonResponse(401, { code: 'bad_jwt' }))
    await expect(supabaseProvider.signOut({ refreshToken: 'r1', accessToken: 'a1' })).resolves.toBeUndefined()

    fetchMock.mockResolvedValueOnce(jsonResponse(500, {}))
    await expect(supabaseProvider.signOut({ refreshToken: 'r1', accessToken: 'a1' })).rejects.toMatchObject({ kind: 'network' })
  })

  it('requestPasswordReset: recover com redirect_to e e-mail no corpo', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}))
    await supabaseProvider.requestPasswordReset('ana@x.com')

    const { url, body, headers } = lastCall()
    expect(url).toBe(`https://proj.supabase.co/auth/v1/recover?redirect_to=${encodeURIComponent(`${window.location.origin}/redefinir-senha`)}`)
    expect(body).toEqual({ email: 'ana@x.com' })
    expect(headers.Authorization).toBe('Bearer anon-public-key')
  })

  it('updatePassword: PUT /user com o access token do link', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}))
    await supabaseProvider.updatePassword('link-token', 'NovaSenha#1')

    const { url, init, headers, body } = lastCall()
    expect(url).toBe('https://proj.supabase.co/auth/v1/user')
    expect(init.method).toBe('PUT')
    expect(headers.Authorization).toBe('Bearer link-token')
    expect(body).toEqual({ password: 'NovaSenha#1' })
  })

  const cases: Array<[string, number, unknown, AuthErrorKind]> = [
    ['invalid_credentials', 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 'invalid_credentials'],
    ['invalid_grant (OAuth)', 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' }, 'invalid_credentials'],
    ['refresh token já usado', 400, { error_code: 'refresh_token_already_used' }, 'invalid_credentials'],
    ['email_not_confirmed', 400, { error_code: 'email_not_confirmed' }, 'email_not_confirmed'],
    ['HTTP 429', 429, {}, 'rate_limited'],
    ['over_request_rate_limit', 400, { error_code: 'over_request_rate_limit' }, 'rate_limited'],
    ['over_email_send_rate_limit', 400, { error_code: 'over_email_send_rate_limit' }, 'rate_limited'],
    ['weak_password', 422, { error_code: 'weak_password', msg: 'Password is too weak' }, 'weak_password'],
    ['otp_expired', 403, { error_code: 'otp_expired' }, 'invalid_link'],
    ['bad_jwt', 401, { error_code: 'bad_jwt' }, 'invalid_link'],
    ['5xx', 503, {}, 'network'],
    ['corpo não JSON', 400, undefined, 'unknown'],
  ]

  it.each(cases)('signIn/erro %s -> %s', async (_name, status, body, kind) => {
    fetchMock.mockResolvedValue(body === undefined ? new Response('<html>', { status }) : jsonResponse(status, body))
    await expect(supabaseProvider.signIn({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({ kind })
  })

  it('updatePassword: 401 sem código vira invalid_link', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, {}))
    await expect(supabaseProvider.updatePassword('t', 'abcdefgh')).rejects.toMatchObject({ kind: 'invalid_link' })
  })

  it('falha de rede vira network sem vazar a causa', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch https://proj.supabase.co ... Segredo#123'))
    const error = await supabaseProvider.signIn({ email: 'a@b.com', password: 'Segredo#123' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AuthError)
    expect((error as AuthError).kind).toBe('network')
    expect((error as AuthError).message).not.toContain('Segredo')
  })

  it('mensagens são fixas: nunca ecoam o corpo do servidor, a senha nem tokens, e nada vai ao console', async () => {
    const spies = (['log', 'warn', 'error', 'info', 'debug'] as const).map((method) => vi.spyOn(console, method).mockImplementation(() => undefined))
    fetchMock.mockResolvedValue(jsonResponse(400, { error_code: 'invalid_credentials', msg: 'Segredo#123 refresh-token-xyz' }))
    const error = await supabaseProvider.signIn({ email: 'a@b.com', password: 'Segredo#123' }).catch((e: unknown) => e)

    expect((error as Error).message).not.toMatch(/Segredo|refresh-token-xyz|anon-public-key/)
    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled())
    spies.forEach((spy) => spy.mockRestore())
  })
})
