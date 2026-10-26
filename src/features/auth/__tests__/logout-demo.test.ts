import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logoutSession } from '../api/keycloak'
import { logout } from '../api/logout'
import { clearAuthSession, getAuthState, setAuthSession } from '../session'

vi.mock('@/lib/demo-mode', () => ({ isDemoMode: true }))
vi.mock('../api/keycloak', () => ({ logoutSession: vi.fn() }))

describe('logout em modo demonstração', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
  })

  it('apenas limpa a sessão local, sem chamar o Keycloak', async () => {
    setAuthSession('demo-token', { id: 'u1', name: 'Clara', roles: ['admin_cliente'] })

    await logout()

    expect(getAuthState().isAuthenticated).toBe(false)
    expect(logoutSession).not.toHaveBeenCalled()
  })
})
