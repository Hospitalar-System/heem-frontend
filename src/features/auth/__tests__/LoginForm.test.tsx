import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, getDevelopmentToken } from '../api/identity'
import { LoginForm } from '../components/LoginForm'
import { ThemeProvider } from '@/app/theme-provider'

vi.mock('../api/identity', () => ({
  getCurrentUser: vi.fn(),
  getDevelopmentToken: vi.fn(),
}))
vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: { error: vi.fn(), success: vi.fn() },
}))

const developmentUser = {
  id: 'user-1',
  name: 'Ana Silva',
  email: 'ana@hospital.com.br',
  roles: ['admin_cliente' as const],
  tenantId: 'hospital-1',
}

function CurrentPath() {
  const location = useLocation()
  return <p data-testid="current-path">{location.pathname}</p>
}

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="*" element={<CurrentPath />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

describe('LoginForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('apresenta acesso de desenvolvimento como Admin do Cliente', () => {
    renderLogin()

    expect(screen.getByRole('button', { name: 'Entrar como Admin do Cliente' })).toBeInTheDocument()
    expect(screen.getByText('Admin do Cliente')).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
  })

  it('obtém token, consulta a identidade e redireciona ao dashboard', async () => {
    const user = userEvent.setup()
    vi.mocked(getDevelopmentToken).mockResolvedValue('test-access-token')
    vi.mocked(getCurrentUser).mockResolvedValue(developmentUser)
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Entrar como Admin do Cliente' }))

    await waitFor(() => expect(getDevelopmentToken).toHaveBeenCalledOnce())
    expect(getCurrentUser).toHaveBeenCalledWith('test-access-token')
    expect(await screen.findByTestId('current-path')).toHaveTextContent('/dashboard')
    expect(developmentUser.roles).toContain('admin_cliente')
  })

  it('mostra falha retornada pelo backend', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    vi.mocked(getDevelopmentToken).mockResolvedValue('test-access-token')
    vi.mocked(getCurrentUser).mockRejectedValue({
      response: { data: { detail: 'Token inválido.', code: 'AUTH_INVALID_TOKEN' } },
    })
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Entrar como Admin do Cliente' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Token inválido.'))
  })
})
