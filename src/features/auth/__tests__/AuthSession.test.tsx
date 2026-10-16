import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar'
import { AuthSessionCacheCleanup } from '../components/AuthSessionCacheCleanup'
import { apiClient } from '@/lib/axios'
import { clearAuthSession, getAuthState, setAuthSession } from '../session'
import type { UserProfileDTO } from '../types'

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
    clearAuthSession()
    setAuthSession('access-token', user)
  })

  afterEach(() => clearAuthSession())

  it('clears the in-memory session and query cache, then replaces the route with login', async () => {
    const { client } = renderSidebar()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sair' }))

    expect(getAuthState()).toEqual({ accessToken: null, user: null, isAuthenticated: false })
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
