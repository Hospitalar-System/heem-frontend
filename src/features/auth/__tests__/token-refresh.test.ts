import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ refreshTokens: vi.fn() }))

vi.mock('@/lib/demo-mode', () => ({ isDemoMode: false }))
vi.mock('../api/keycloak', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/keycloak')>()),
  refreshTokens: mocks.refreshTokens,
}))

import { apiClient } from '@/lib/axios'
import { MAX_TIMER_MS, REFRESH_LEAD_MS, REFRESH_RETRY_MAX_MS, REFRESH_RETRY_MS, startRefreshScheduler } from '../api/refresh-scheduler'
import { refreshAccessToken } from '../api/token-refresh'
import { KeycloakAuthError } from '../api/keycloak'
import { clearAuthSession, getAuthState, getRefreshToken, REFRESH_TOKEN_STORAGE_KEY as KEY, setAuthSession, updateAuthTokens } from '../session'
import type { UserProfileDTO } from '../types'

const user: UserProfileDTO = { id: 'u1', name: 'Clara', email: 'clara@heem.dev', roles: ['admin_cliente'] }
const originalAdapter = apiClient.defaults.adapter

/** Backend falso: 401 enquanto o Bearer não for o token válido. */
function backend(validToken: string) {
  const calls: Array<string | undefined> = []
  const adapter: AxiosAdapter = (config) => {
    const auth = config.headers.Authorization as string | undefined
    calls.push(auth)
    const ok = auth === `Bearer ${validToken}`
    const response = { status: ok ? 200 : 401, statusText: '', data: { ok }, headers: {}, config: config as InternalAxiosRequestConfig }
    return ok
      ? Promise.resolve(response)
      : Promise.reject(new AxiosError('401', 'ERR_BAD_REQUEST', config as InternalAxiosRequestConfig, null, response))
  }
  apiClient.defaults.adapter = adapter
  return calls
}

function login(rememberMe = false, expiresAt = Date.now() + 900_000) {
  setAuthSession('old', user, { refreshToken: 'ref1', expiresAt, rememberMe })
}

beforeEach(() => {
  clearAuthSession()
  window.sessionStorage.clear()
  window.localStorage.clear()
  mocks.refreshTokens.mockReset()
  mocks.refreshTokens.mockResolvedValue({ accessToken: 'new', refreshToken: 'ref2', expiresAt: Date.now() + 900_000 })
})

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  vi.useRealTimers()
})

describe('renovação no interceptor de 401', () => {
  it('várias requisições 401 simultâneas renovam uma única vez e todas são repetidas com o token novo', async () => {
    login()
    const calls = backend('new')
    let release!: () => void
    mocks.refreshTokens.mockReturnValue(
      new Promise((resolve) => { release = () => resolve({ accessToken: 'new', refreshToken: 'ref2', expiresAt: Date.now() + 900_000 }) }),
    )

    const all = Promise.all([apiClient.get('/a'), apiClient.get('/b'), apiClient.get('/c')])
    await vi.waitFor(() => expect(mocks.refreshTokens).toHaveBeenCalledTimes(1))
    release()
    const results = await all

    expect(results.map((r) => r.status)).toEqual([200, 200, 200])
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1)
    expect(mocks.refreshTokens).toHaveBeenCalledWith('ref1')
    expect(calls.filter((auth) => auth === 'Bearer new')).toHaveLength(3)
    expect(getAuthState().accessToken).toBe('new')
  })

  it('repete só uma vez: segundo 401 limpa a sessão, sem loop', async () => {
    login()
    const calls = backend('nunca-valido')

    await expect(apiClient.get('/a')).rejects.toMatchObject({ response: { status: 401 } })

    expect(calls).toEqual(['Bearer old', 'Bearer new'])
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1)
    expect(getAuthState().isAuthenticated).toBe(false)
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })

  it('refresh recusado (invalid_credentials) limpa a sessão e rejeita', async () => {
    login()
    backend('new')
    mocks.refreshTokens.mockRejectedValue(new KeycloakAuthError('invalid_credentials'))

    await expect(apiClient.get('/a')).rejects.toMatchObject({ response: { status: 401 } })

    expect(getAuthState().isAuthenticated).toBe(false)
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })

  it('falha de rede na renovação NÃO limpa a sessão', async () => {
    login()
    backend('new')
    mocks.refreshTokens.mockRejectedValue(new KeycloakAuthError('network'))

    await expect(apiClient.get('/a')).rejects.toMatchObject({ response: { status: 401 } })

    expect(getAuthState().isAuthenticated).toBe(true)
    expect(getRefreshToken()).toBe('ref1')
    expect(window.sessionStorage.getItem(KEY)).toBe('ref1')
  })

  it('sem refresh token, o 401 limpa a sessão direto, sem tentar renovar', async () => {
    setAuthSession('old', user)
    backend('new')

    await expect(apiClient.get('/a')).rejects.toMatchObject({ response: { status: 401 } })

    expect(mocks.refreshTokens).not.toHaveBeenCalled()
    expect(getAuthState().isAuthenticated).toBe(false)
  })

  it.each([
    ['sessionStorage', false],
    ['localStorage', true],
  ])('a rotação grava o refresh novo no mesmo storage (%s)', async (_name, rememberMe) => {
    login(rememberMe)
    backend('new')
    const [used, other] = rememberMe ? [window.localStorage, window.sessionStorage] : [window.sessionStorage, window.localStorage]

    await apiClient.get('/a')

    expect(used.getItem(KEY)).toBe('ref2')
    expect(other.getItem(KEY)).toBeNull()
  })

  it('não ressuscita a sessão se houve logout durante a renovação', async () => {
    login()
    let release!: () => void
    mocks.refreshTokens.mockReturnValue(
      new Promise((resolve) => { release = () => resolve({ accessToken: 'new', refreshToken: 'ref2', expiresAt: 1 }) }),
    )
    const pending = refreshAccessToken()
    clearAuthSession()
    release()

    await expect(pending).rejects.toThrow()
    expect(getAuthState().isAuthenticated).toBe(false)
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })
})

describe('corridas de sessão durante a renovação', () => {
  it('logout + login de outro usuário durante o refresh em voo: tokens de A não entram na sessão de B', async () => {
    login()
    let release!: () => void
    mocks.refreshTokens.mockReturnValueOnce(
      new Promise((resolve) => { release = () => resolve({ accessToken: 'accA', refreshToken: 'refA2', expiresAt: 1 }) }),
    )
    const pending = refreshAccessToken()
    clearAuthSession()
    setAuthSession('accB', user, { refreshToken: 'refB', expiresAt: Date.now() + 900_000 })
    release()

    await expect(pending).rejects.toThrow()
    expect(getAuthState().accessToken).toBe('accB')
    expect(getRefreshToken()).toBe('refB')
    expect(window.sessionStorage.getItem(KEY)).toBe('refB')
  })

  it('invalid_grant da sessão antiga não derruba o login de B', async () => {
    login()
    let fail!: () => void
    mocks.refreshTokens.mockReturnValueOnce(new Promise((_, reject) => { fail = () => reject(new KeycloakAuthError('invalid_credentials')) }))
    const pending = refreshAccessToken()
    clearAuthSession()
    setAuthSession('accB', user, { refreshToken: 'refB', expiresAt: Date.now() + 900_000 })
    fail()

    await expect(pending).rejects.toBeInstanceOf(KeycloakAuthError)
    expect(getAuthState().isAuthenticated).toBe(true)
    expect(getRefreshToken()).toBe('refB')
  })

  it('invalid_credentials com token já rotacionado por outra aba: adota o do storage e tenta uma vez', async () => {
    login(true)
    mocks.refreshTokens.mockImplementation(async (token: string) => {
      if (token === 'ref1') {
        window.localStorage.setItem(KEY, 'refOutraAba') // a outra aba rotacionou no meio
        throw new KeycloakAuthError('invalid_credentials')
      }
      return { accessToken: 'new', refreshToken: 'ref3', expiresAt: Date.now() + 900_000 }
    })

    await refreshAccessToken()

    expect(mocks.refreshTokens.mock.calls.map((c) => c[0])).toEqual(['ref1', 'refOutraAba'])
    expect(getAuthState().isAuthenticated).toBe(true)
    expect(window.localStorage.getItem(KEY)).toBe('ref3')
  })

  it('token do storage igual ao usado e recusado: limpa a sessão', async () => {
    login(true)
    mocks.refreshTokens.mockRejectedValue(new KeycloakAuthError('invalid_credentials'))

    await expect(refreshAccessToken()).rejects.toBeInstanceOf(KeycloakAuthError)

    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1)
    expect(getAuthState().isAuthenticated).toBe(false)
  })

  it('token adotado também recusado: limpa a sessão', async () => {
    login(true)
    mocks.refreshTokens.mockImplementation(async (token: string) => {
      if (token === 'ref1') window.localStorage.setItem(KEY, 'refOutraAba')
      throw new KeycloakAuthError('invalid_credentials')
    })

    await expect(refreshAccessToken()).rejects.toBeInstanceOf(KeycloakAuthError)

    expect(mocks.refreshTokens).toHaveBeenCalledTimes(2)
    expect(getAuthState().isAuthenticated).toBe(false)
  })

  it('mantém o rememberMe da sessão mesmo se o storage foi esvaziado por outra aba', async () => {
    login(true)
    window.localStorage.removeItem(KEY)

    await refreshAccessToken()

    expect(window.localStorage.getItem(KEY)).toBe('ref2')
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })

  it('401 com token já substituído por outra renovação repete sem renovar de novo', async () => {
    login()
    const calls = backend('new')
    const inner = apiClient.defaults.adapter as AxiosAdapter
    // outra renovação conclui enquanto a requisição com o token velho está em voo
    apiClient.defaults.adapter = (config) => {
      if (calls.length === 0) updateAuthTokens({ accessToken: 'new', refreshToken: 'ref2', expiresAt: Date.now() + 900_000 })
      return inner(config)
    }
    await apiClient.get('/a')

    expect(mocks.refreshTokens).not.toHaveBeenCalled()
    expect(calls).toEqual(['Bearer old', 'Bearer new'])
  })
})

describe('agendador de renovação antecipada', () => {
  let stop: () => void

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    stop?.()
  })

  it('renova ~60 s antes da expiração e reagenda com o novo prazo', async () => {
    login(false, Date.now() + 900_000)
    stop = startRefreshScheduler()

    await vi.advanceTimersByTimeAsync(900_000 - REFRESH_LEAD_MS - 1)
    expect(mocks.refreshTokens).not.toHaveBeenCalled()
    mocks.refreshTokens.mockImplementationOnce(async () => ({ accessToken: 'new', refreshToken: 'ref2', expiresAt: Date.now() + 900_000 }))
    await vi.advanceTimersByTimeAsync(1)
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1)
    expect(getAuthState().accessToken).toBe('new')

    mocks.refreshTokens.mockImplementationOnce(async () => ({ accessToken: 'new2', refreshToken: 'ref3', expiresAt: Date.now() + 900_000 }))
    await vi.advanceTimersByTimeAsync(900_000 - REFRESH_LEAD_MS)
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(2)
    expect(mocks.refreshTokens).toHaveBeenLastCalledWith('ref2')
  })

  it('agenda ao fazer login depois de iniciado', async () => {
    stop = startRefreshScheduler()
    login(false, Date.now() + 120_000)

    await vi.advanceTimersByTimeAsync(120_000 - REFRESH_LEAD_MS)

    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1)
  })

  it('cancela o timer no logout', async () => {
    login()
    stop = startRefreshScheduler()
    clearAuthSession()

    await vi.advanceTimersByTimeAsync(1_000_000)

    expect(mocks.refreshTokens).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('falha transitória tenta de novo depois, sem derrubar a sessão', async () => {
    login(false, Date.now() + 120_000)
    stop = startRefreshScheduler()
    mocks.refreshTokens.mockRejectedValueOnce(new KeycloakAuthError('network'))

    await vi.advanceTimersByTimeAsync(120_000 - REFRESH_LEAD_MS)
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1)
    expect(getAuthState().isAuthenticated).toBe(true)

    await vi.advanceTimersByTimeAsync(REFRESH_RETRY_MS)
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(2)
    expect(getAuthState().accessToken).toBe('new')
  })

  it('backoff exponencial até o teto e reset após sucesso', async () => {
    login(false, Date.now() + 120_000)
    stop = startRefreshScheduler()
    mocks.refreshTokens.mockRejectedValue(new KeycloakAuthError('network'))

    await vi.advanceTimersByTimeAsync(120_000 - REFRESH_LEAD_MS)
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(REFRESH_RETRY_MS - 1)
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(REFRESH_RETRY_MS * 2)
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(3)
    for (let i = 0; i < 6; i++) await vi.advanceTimersByTimeAsync(REFRESH_RETRY_MAX_MS)
    const before = mocks.refreshTokens.mock.calls.length
    await vi.advanceTimersByTimeAsync(REFRESH_RETRY_MAX_MS)
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(before + 1) // no teto: 1 tentativa por 5 min
  })

  it('limita o atraso ao máximo do setTimeout', () => {
    const spy = vi.spyOn(globalThis, 'setTimeout')
    login(false, Date.now() + 40 * 24 * 3_600_000)
    stop = startRefreshScheduler()

    expect(spy.mock.calls.every(([, ms]) => (ms ?? 0) <= MAX_TIMER_MS)).toBe(true)
    expect(spy).toHaveBeenCalledWith(expect.any(Function), MAX_TIMER_MS)
  })

  it('invalid_credentials derruba a sessão e não reagenda', async () => {
    login(false, Date.now() + 120_000)
    stop = startRefreshScheduler()
    mocks.refreshTokens.mockRejectedValue(new KeycloakAuthError('invalid_credentials'))

    await vi.advanceTimersByTimeAsync(120_000 - REFRESH_LEAD_MS)

    expect(getAuthState().isAuthenticated).toBe(false)
    await vi.advanceTimersByTimeAsync(REFRESH_RETRY_MS * 2)
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('ao voltar para a aba depois do prazo, renova na hora', async () => {
    login(false, Date.now() + 900_000)
    stop = startRefreshScheduler()
    // aba em segundo plano: o tempo passou, mas o timer não disparou
    vi.setSystemTime(Date.now() + 900_000)
    document.dispatchEvent(new Event('visibilitychange'))

    await vi.advanceTimersByTimeAsync(0)

    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1)
  })
})
