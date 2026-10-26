import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from '@/app/RequireRole'

const mocks = vi.hoisted(() => ({
  demo: false,
  refreshTokens: vi.fn(),
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/demo-mode', () => ({
  get isDemoMode() { return mocks.demo },
}))
vi.mock('../api/identity', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('../api/keycloak', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/keycloak')>()),
  refreshTokens: mocks.refreshTokens,
}))

import { restoreSession } from '../api/restore-session'
import { KeycloakAuthError } from '../api/keycloak'
import { clearAuthSession, getAuthRestoring, getAuthState, REFRESH_TOKEN_STORAGE_KEY as KEY } from '../session'

const user = { id: 'u1', name: 'Clara', roles: ['admin_cliente'] as const }

beforeEach(() => {
  mocks.demo = false
  mocks.refreshTokens.mockReset()
  mocks.getCurrentUser.mockReset()
  clearAuthSession()
  window.sessionStorage.clear()
  window.localStorage.clear()
})

afterEach(() => {
  clearAuthSession()
})

describe('restoreSession', () => {
  it('restaura a sessão: refresh, /me e grava o refresh token novo', async () => {
    window.sessionStorage.setItem(KEY, 'ref1')
    mocks.refreshTokens.mockResolvedValue({ accessToken: 'acc2', refreshToken: 'ref2', expiresAt: 500 })
    mocks.getCurrentUser.mockResolvedValue(user)

    await restoreSession()

    expect(mocks.refreshTokens).toHaveBeenCalledWith('ref1')
    expect(mocks.getCurrentUser).toHaveBeenCalledWith('acc2')
    expect(getAuthState()).toEqual({ accessToken: 'acc2', user, isAuthenticated: true })
    expect(window.sessionStorage.getItem(KEY)).toBe('ref2')
    expect(getAuthRestoring()).toBe(false)
  })

  it('preserva a escolha de lembrar de mim (localStorage)', async () => {
    window.localStorage.setItem(KEY, 'ref1')
    mocks.refreshTokens.mockResolvedValue({ accessToken: 'a', refreshToken: 'ref2', expiresAt: 1 })
    mocks.getCurrentUser.mockResolvedValue(user)

    await restoreSession()

    expect(window.localStorage.getItem(KEY)).toBe('ref2')
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
  })

  it('limpa o storage quando o refresh é recusado (invalid_grant)', async () => {
    window.localStorage.setItem(KEY, 'ref1')
    mocks.refreshTokens.mockRejectedValue(new KeycloakAuthError('invalid_credentials'))

    await restoreSession()

    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(window.sessionStorage.getItem(KEY)).toBeNull()
    expect(getAuthState().isAuthenticated).toBe(false)
    expect(getAuthRestoring()).toBe(false)
  })

  it('preserva o refresh token em erro de rede', async () => {
    window.sessionStorage.setItem(KEY, 'ref1')
    mocks.refreshTokens.mockRejectedValue(new KeycloakAuthError('network'))

    await restoreSession()

    expect(window.sessionStorage.getItem(KEY)).toBe('ref1')
    expect(getAuthState().isAuthenticated).toBe(false)
    expect(getAuthRestoring()).toBe(false)
  })

  it('não perde o refresh token rotacionado se o /me falhar', async () => {
    window.sessionStorage.setItem(KEY, 'ref1')
    mocks.refreshTokens.mockResolvedValue({ accessToken: 'a', refreshToken: 'ref2', expiresAt: 1 })
    mocks.getCurrentUser.mockRejectedValue(new Error('rede'))

    await restoreSession()

    expect(window.sessionStorage.getItem(KEY)).toBe('ref2')
    expect(getAuthState().isAuthenticated).toBe(false)
  })

  it('não faz nada sem refresh token armazenado', async () => {
    await restoreSession()

    expect(mocks.refreshTokens).not.toHaveBeenCalled()
    expect(getAuthRestoring()).toBe(false)
  })

  it('não faz nada em modo demonstração', async () => {
    mocks.demo = true
    window.sessionStorage.setItem(KEY, 'ref1')

    await restoreSession()

    expect(mocks.refreshTokens).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(KEY)).toBe('ref1')
  })

  it('rotas protegidas mostram o estado de restauração e não vão ao login enquanto aguardam', async () => {
    window.sessionStorage.setItem(KEY, 'ref1')
    let resolveRefresh!: (value: unknown) => void
    mocks.refreshTokens.mockReturnValue(new Promise((resolve) => { resolveRefresh = resolve }))
    mocks.getCurrentUser.mockResolvedValue(user)

    let pending!: Promise<void>
    await act(async () => { pending = restoreSession() })
    render(
      <MemoryRouter initialEntries={['/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RequireRole><p>conteudo protegido</p></RequireRole>
      </MemoryRouter>,
    )

    expect(screen.getByText('Restaurando sua sessão…')).toBeTruthy()
    expect(screen.queryByText('conteudo protegido')).toBeNull()

    resolveRefresh({ accessToken: 'a', refreshToken: 'ref2', expiresAt: 1 })
    await act(async () => { await pending })

    expect(await screen.findByText('conteudo protegido')).toBeTruthy()
  })
})

describe('restoreSession: falhas transitórias e abas concorrentes', () => {
  it.each(['account_locked', 'network', 'unknown'] as const)('refresh com %s não limpa a sessão', async (kind) => {
    window.sessionStorage.setItem(KEY, 'ref1')
    mocks.refreshTokens.mockRejectedValue(new KeycloakAuthError(kind))

    await restoreSession()

    expect(window.sessionStorage.getItem(KEY)).toBe('ref1')
  })

  it('invalid_grant não apaga o token se outra aba já o rotacionou', async () => {
    window.localStorage.setItem(KEY, 'ref1')
    mocks.refreshTokens.mockImplementation(async () => {
      window.localStorage.setItem(KEY, 'ref-da-outra-aba')
      throw new KeycloakAuthError('invalid_credentials')
    })

    await restoreSession()

    expect(window.localStorage.getItem(KEY)).toBe('ref-da-outra-aba')
  })
})
