import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ refreshTokens: vi.fn() }))

vi.mock('@/lib/demo-mode', () => ({ isDemoMode: false }))
vi.mock('../api/keycloak', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/keycloak')>()),
  refreshTokens: mocks.refreshTokens,
}))

import { apiClient } from '@/lib/axios'
import { restoreSession } from '../api/restore-session'
import { clearAuthSession, getAuthState, REFRESH_TOKEN_STORAGE_KEY as KEY } from '../session'

function failWith(status?: number): AxiosAdapter {
  return (config) => {
    const response = status
      ? { status, statusText: '', data: {}, headers: {}, config: config as InternalAxiosRequestConfig }
      : undefined
    return Promise.reject(new AxiosError('falha', status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK', config as InternalAxiosRequestConfig, null, response))
  }
}

beforeEach(() => {
  clearAuthSession()
  window.sessionStorage.clear()
  window.localStorage.clear()
  window.sessionStorage.setItem(KEY, 'ref1')
  mocks.refreshTokens.mockReset()
  mocks.refreshTokens.mockResolvedValue({ accessToken: 'acc2', refreshToken: 'ref2', expiresAt: 1 })
})

describe('restoreSession com o interceptor real do apiClient', () => {
  it('401 no /me após refresh bem-sucedido limpa a sessão e o refresh token', async () => {
    apiClient.defaults.adapter = failWith(401)

    await restoreSession()

    expect(window.sessionStorage.getItem(KEY)).toBeNull()
    expect(getAuthState().isAuthenticated).toBe(false)
  })

  it.each([undefined, 500, 503])('falha no /me (%s) preserva o refresh token rotacionado', async (status) => {
    apiClient.defaults.adapter = failWith(status)

    await restoreSession()

    expect(window.sessionStorage.getItem(KEY)).toBe('ref2')
    expect(getAuthState().isAuthenticated).toBe(false)
  })
})
