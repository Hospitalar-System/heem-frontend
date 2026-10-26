import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAuthSession,
  getAccessTokenExpiresAt,
  getAuthState,
  getRefreshToken,
  REFRESH_TOKEN_STORAGE_KEY as KEY,
  setAuthSession,
  updateAuthTokens,
} from '../session'
import type { UserProfileDTO } from '../types'

const user: UserProfileDTO = { id: 'u1', name: 'Clara', email: 'clara@heem.dev', roles: ['admin_cliente'] }

beforeEach(() => {
  clearAuthSession()
  window.sessionStorage.clear()
  window.localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function allStoredValues() {
  return [window.sessionStorage, window.localStorage].flatMap((storage) =>
    Array.from({ length: storage.length }, (_, index) => storage.getItem(storage.key(index)!)),
  )
}

describe('sessão com refresh token', () => {
  it('mantém a assinatura antiga: sem opções não persiste nada', () => {
    setAuthSession('acc', user)

    expect(getAuthState()).toEqual({ accessToken: 'acc', user, isAuthenticated: true })
    expect(getRefreshToken()).toBeNull()
    expect(allStoredValues()).toEqual([])
  })

  it('guarda o refresh token em sessionStorage por padrão', () => {
    setAuthSession('acc', user, { refreshToken: 'ref', expiresAt: 123 })

    expect(window.sessionStorage.getItem(KEY)).toBe('ref')
    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(getRefreshToken()).toBe('ref')
    expect(getAccessTokenExpiresAt()).toBe(123)
  })

  it('guarda em localStorage somente com rememberMe', () => {
    setAuthSession('acc', user, { refreshToken: 'ref', rememberMe: true })

    expect(window.localStorage.getItem(KEY)).toBe('ref')
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })

  it('nunca mantém o token nos dois storages ao mudar a escolha', () => {
    setAuthSession('acc', user, { refreshToken: 'ref1', rememberMe: true })
    setAuthSession('acc', user, { refreshToken: 'ref2', rememberMe: false })

    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(window.sessionStorage.getItem(KEY)).toBe('ref2')
  })

  it('nunca persiste access token, usuário nem e-mail', () => {
    setAuthSession('acc-secreto', user, { refreshToken: 'ref', expiresAt: 1, rememberMe: true })
    setAuthSession('acc-secreto', user, { refreshToken: 'ref', expiresAt: 1, rememberMe: false })

    const stored = JSON.stringify(allStoredValues())
    expect(stored).not.toContain('acc-secreto')
    expect(stored).not.toContain('clara')
    expect(stored).not.toContain('u1')
  })

  it('clearAuthSession limpa memória e os dois storages', () => {
    setAuthSession('acc', user, { refreshToken: 'ref', expiresAt: 5 })
    window.localStorage.setItem(KEY, 'sobra')

    clearAuthSession()

    expect(getAuthState()).toEqual({ accessToken: null, user: null, isAuthenticated: false })
    expect(getRefreshToken()).toBeNull()
    expect(getAccessTokenExpiresAt()).toBeNull()
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
    expect(window.localStorage.getItem(KEY)).toBeNull()
  })

  it('updateAuthTokens grava o refresh token rotacionado no mesmo storage', () => {
    setAuthSession('acc', user, { refreshToken: 'ref1', expiresAt: 1, rememberMe: true })

    updateAuthTokens({ accessToken: 'acc2', refreshToken: 'ref2', expiresAt: 99 })

    expect(getAuthState().accessToken).toBe('acc2')
    expect(getAuthState().user).toBe(user)
    expect(getAccessTokenExpiresAt()).toBe(99)
    expect(window.localStorage.getItem(KEY)).toBe('ref2')
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })

  it('tolera storage indisponível sem lançar e mantém a sessão em memória', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('bloqueado') })

    expect(() => setAuthSession('acc', user, { refreshToken: 'ref' })).not.toThrow()
    expect(getAuthState().isAuthenticated).toBe(true)
    expect(getRefreshToken()).toBe('ref')
    expect(() => clearAuthSession()).not.toThrow()
    expect(getRefreshToken()).toBeNull()
  })
})
