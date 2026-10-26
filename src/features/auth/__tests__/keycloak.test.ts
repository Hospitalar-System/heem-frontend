import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KeycloakAuthError, loginWithPassword, logoutSession, refreshTokens } from '../api/keycloak'

const SECRET = 'S3nh@-Muito-Secreta'
const tokenUrl = 'http://localhost:8180/realms/heem/protocol/openid-connect/token'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)!
  return { url: String(url), init: init!, body: new URLSearchParams(String(init!.body)) }
}

async function failureOf(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    return error as KeycloakAuthError
  }
  throw new Error('esperava falha')
}

describe('cliente do Keycloak', () => {
  it('faz login por senha com corpo form-urlencoded e devolve os tokens', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    fetchMock.mockResolvedValue(jsonResponse({ access_token: 'acc', refresh_token: 'ref', expires_in: 900 }))

    const tokens = await loginWithPassword({ email: 'tecnico@heem.dev', password: SECRET })

    const { url, init, body } = lastCall()
    expect(url).toBe(tokenUrl)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded')
    expect(init.credentials).toBe('omit')
    expect(Object.fromEntries(body)).toEqual({
      grant_type: 'password',
      client_id: 'heem-frontend',
      username: 'tecnico@heem.dev',
      password: SECRET,
      scope: 'openid',
    })
    expect(tokens).toEqual({ accessToken: 'acc', refreshToken: 'ref', expiresAt: 1_000_000 + 900_000 })
  })

  it('renova com refresh_token e devolve o token rotacionado', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ access_token: 'acc2', refresh_token: 'ref2', expires_in: 60 }))

    const tokens = await refreshTokens('ref1')

    const { url, body } = lastCall()
    expect(url).toBe(tokenUrl)
    expect(Object.fromEntries(body)).toEqual({ grant_type: 'refresh_token', client_id: 'heem-frontend', refresh_token: 'ref1' })
    expect(tokens.refreshToken).toBe('ref2')
  })

  it('encerra a sessão enviando client_id e refresh_token ao endpoint de logout', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(logoutSession('ref1')).resolves.toBeUndefined()

    const { url, body } = lastCall()
    expect(url).toBe('http://localhost:8180/realms/heem/protocol/openid-connect/logout')
    expect(Object.fromEntries(body)).toEqual({ client_id: 'heem-frontend', refresh_token: 'ref1' })
  })

  it('trata sessão já encerrada no logout como sucesso, mas propaga falha de rede', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'invalid_grant' }, 400))
    await expect(logoutSession('ref1')).resolves.toBeUndefined()

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect((await failureOf(logoutSession('ref1'))).kind).toBe('network')
  })

  it('traduz invalid_grant como credenciais incorretas', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'invalid_grant', error_description: 'Invalid user credentials' }, 401))

    const error = await failureOf(loginWithPassword({ email: 'a@b.c', password: SECRET }))

    expect(error).toBeInstanceOf(KeycloakAuthError)
    expect(error.kind).toBe('invalid_credentials')
    expect(error.message).toContain('E-mail ou senha incorretos')
    expect(error.message).toContain('alguns minutos')
  })

  it('traduz invalid_grant de conta temporariamente desabilitada como bloqueio', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'invalid_grant', error_description: 'Account temporarily disabled' }, 400))

    const error = await failureOf(loginWithPassword({ email: 'a@b.c', password: SECRET }))

    expect(error.kind).toBe('account_locked')
    expect(error.message).toContain('15')
  })

  it('traduz 429 como bloqueio', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 429 }))
    expect((await failureOf(loginWithPassword({ email: 'a@b.c', password: SECRET }))).kind).toBe('account_locked')
  })

  it.each([502, 503, 504])('traduz %i como serviço indisponível', async (status) => {
    fetchMock.mockResolvedValue(new Response('', { status }))
    expect((await failureOf(refreshTokens('ref'))).kind).toBe('network')
  })

  it('traduz falha de rede', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    expect((await failureOf(loginWithPassword({ email: 'a@b.c', password: SECRET }))).kind).toBe('network')
  })

  it('classifica respostas inesperadas como unknown', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'server_error' }, 500))
    expect((await failureOf(refreshTokens('ref'))).kind).toBe('unknown')

    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: 'sem-refresh' }))
    expect((await failureOf(refreshTokens('ref'))).kind).toBe('unknown')
  })

  it('nunca expõe a senha ou tokens em mensagens de erro nem em console', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((name) => vi.spyOn(console, name).mockImplementation(() => {}))
    const responses = [
      jsonResponse({ error: 'invalid_grant', error_description: `senha ${SECRET} inválida` }, 401),
      jsonResponse({ error: 'invalid_grant', error_description: `Account temporarily disabled ${SECRET}` }, 400),
      jsonResponse({ error: 'x', error_description: SECRET }, 500),
    ]
    const errors: KeycloakAuthError[] = []
    for (const response of responses) {
      fetchMock.mockResolvedValueOnce(response)
      errors.push(await failureOf(loginWithPassword({ email: 'a@b.c', password: SECRET })))
    }
    fetchMock.mockRejectedValueOnce(new TypeError(`falhou com ${SECRET}`))
    errors.push(await failureOf(loginWithPassword({ email: 'a@b.c', password: SECRET })))

    for (const error of errors) {
      expect(error.message).not.toContain(SECRET)
      expect(JSON.stringify(error)).not.toContain(SECRET)
      expect(String(error.stack)).not.toContain(SECRET)
    }
    for (const spy of spies) expect(spy).not.toHaveBeenCalled()
  })
})
