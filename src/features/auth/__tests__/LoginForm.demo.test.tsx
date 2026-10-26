import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, getDevelopmentToken } from '../api/identity'
import { loginWithPassword } from '../api/keycloak'
import { LoginForm } from '../components/LoginForm'
import { clearAuthSession, getAuthState } from '../session'

vi.mock('@/lib/demo-mode', () => ({ isDemoMode: true }))
vi.mock('../api/identity', () => ({
  getCurrentUser: vi.fn(),
  getDevelopmentToken: vi.fn(),
}))
vi.mock('../api/keycloak', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/keycloak')>()),
  loginWithPassword: vi.fn(),
}))

const profile = { id: 'user-1', name: 'Ana Silva', roles: ['admin_cliente' as const], tenantId: 'hospital-1' }

function CurrentPath() {
  return <p data-testid="current-path">{useLocation().pathname}</p>
}

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="*" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginForm em modo demonstração', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
  })
  afterEach(() => clearAuthSession())

  it('mantém o botão de demonstração, sem campos', () => {
    renderLogin()

    expect(screen.getByRole('button', { name: 'Entrar na demonstração' })).toBeInTheDocument()
    expect(screen.getByText(/Modo demonstração/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
  })

  it('entra com o token de demonstração sem usar o Keycloak', async () => {
    const user = userEvent.setup()
    vi.mocked(getDevelopmentToken).mockResolvedValue('demo-token')
    vi.mocked(getCurrentUser).mockResolvedValue(profile)
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Entrar na demonstração' }))

    expect(await screen.findByTestId('current-path')).toHaveTextContent('/dashboard')
    expect(getCurrentUser).toHaveBeenCalledWith('demo-token')
    expect(loginWithPassword).not.toHaveBeenCalled()
    expect(getAuthState()).toMatchObject({ accessToken: 'demo-token', isAuthenticated: true })
  })

  it('mostra a falha do backend no formulário', async () => {
    const user = userEvent.setup()
    vi.mocked(getDevelopmentToken).mockResolvedValue('demo-token')
    vi.mocked(getCurrentUser).mockRejectedValue({ response: { data: { detail: 'Token inválido.' } } })
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Entrar na demonstração' }))

    expect(await screen.findByText('Token inválido.')).toBeInTheDocument()
  })
})
