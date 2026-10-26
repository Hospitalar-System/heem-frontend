import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar'
import { AuthSessionCacheCleanup } from '../components/AuthSessionCacheCleanup'
import { apiClient } from '@/lib/axios'
import { KeycloakAuthError, logoutSession } from '../api/keycloak'
import { REFRESH_TOKEN_STORAGE_KEY, clearAuthSession, getAuthState, setAuthSession } from '../session'
import type { UserProfileDTO } from '../types'

vi.mock('@/lib/demo-mode', () => ({ isDemoMode: false }))
vi.mock('../api/keycloak', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/keycloak')>()),
  logoutSession: vi.fn(),
}))

const user: UserProfileDTO = {
  id: 'user-1',
  name: 'Clara Mendes',
  roles: ['admin_cliente'],
}

function CurrentPath() {
  const location = useLocation()
  return <p data-testid="current-path">{location.pathname}</p>
}

function renderSidebar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(['private-dashboard'], { value: 'sensitive' })

  render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionCacheCleanup />
      <MemoryRouter initialEntries={['/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/dashboard" element={<DashboardSidebar />} />
          <Route path="/login" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return { client: queryClient }
}

describe('authenticated session logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(logoutSession).mockResolvedValue(undefined)
    clearAuthSession()
    window.localStorage.clear()
    window.sessionStorage.clear()
    setAuthSession('access-token', user, { refreshToken: 'refresh-token', expiresAt: Date.now() + 900_000, rememberMe: true })
  })

  afterEach(() => clearAuthSession())

  it('revokes the refresh token, clears memory, storages and query cache, then goes to login', async () => {
    const { client } = renderSidebar()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sair' }))

    expect(logoutSession).toHaveBeenCalledWith('refresh-token')
    expect(getAuthState()).toEqual({ accessToken: null, user: null, isAuthenticated: false })
    expect(window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(client.getQueryCache().getAll()).toHaveLength(0)
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login')
  })

  it('still clears the local session when revoking the token fails on the network', async () => {
    vi.mocked(logoutSession).mockRejectedValue(new KeycloakAuthError('network'))
    const { client } = renderSidebar()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sair' }))

    await waitFor(() => expect(logoutSession).toHaveBeenCalledWith('refresh-token'))
    expect(getAuthState().isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(client.getQueryCache().getAll()).toHaveLength(0)
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login')
  })

  it('clears the in-memory session after an unauthorized API response', async () => {
    const adapter = async (config: InternalAxiosRequestConfig) => {
      const response = {
        data: { code: 'AUTH_UNAUTHORIZED' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      }
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, response)
    }

    await expect(apiClient.get('/private-resource', { adapter })).rejects.toBeInstanceOf(AxiosError)
    expect(getAuthState()).toEqual({ accessToken: null, user: null, isAuthenticated: false })
  })
})
