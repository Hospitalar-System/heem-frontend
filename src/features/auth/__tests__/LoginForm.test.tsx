import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login } from '../api/login'
import { LoginForm } from '../components/LoginForm'
import { ThemeProvider } from '@/app/theme-provider'

vi.mock('../api/login', () => ({ login: vi.fn() }))
vi.mock('sonner', () => ({
  Toaster: () => null,
  toast: { error: vi.fn(), success: vi.fn() },
}))

const successfulLogin = {
  accessToken: 'test-access-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: {
    id: 'user-1',
    name: 'Ana Silva',
    email: 'ana@hospital.com.br',
    roles: ['admin_cliente' as const],
    tenantId: 'hospital-1',
  },
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

  it('renderiza os campos e a ação de entrar', () => {
    renderLogin()

    expect(screen.getByRole('textbox', { name: 'E-mail' })).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Lembrar-me' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('mostra erros Zod para campos vazios e e-mail inválido', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'E-mail' }), 'nao-e-email')
    await user.type(screen.getByLabelText('Senha'), '123456')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('alterna entre senha oculta e visível sem apagar o valor', async () => {
    const user = userEvent.setup()
    renderLogin()
    const password = screen.getByLabelText('Senha')
    await user.type(password, 'segredo123')
    expect(password).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('segredo123')
    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('envia as credenciais e lembra-me e redireciona após sucesso', async () => {
    const user = userEvent.setup()
    vi.mocked(login).mockResolvedValue(successfulLogin)
    renderLogin()

    await user.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@hospital.com.br')
    await user.type(screen.getByLabelText('Senha'), 'senha-segura')
    await user.click(screen.getByRole('checkbox', { name: 'Lembrar-me' }))
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(login).toHaveBeenCalledWith({
      email: 'ana@hospital.com.br',
      password: 'senha-segura',
      rememberMe: true,
    }))
    expect(await screen.findByTestId('current-path')).toHaveTextContent('/dashboard')
  })

  it('notifica erro RFC 7807 de credenciais inválidas', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    vi.mocked(login).mockRejectedValue({
      response: {
        data: {
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          detail: 'E-mail ou senha inválidos.',
          code: 'AUTH_INVALID_CREDENTIALS',
        },
      },
    })
    renderLogin()

    await user.type(screen.getByRole('textbox', { name: 'E-mail' }), 'ana@hospital.com.br')
    await user.type(screen.getByLabelText('Senha'), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('E-mail ou senha inválidos.'))
    expect(screen.getByRole('textbox', { name: 'E-mail' })).toHaveValue('ana@hospital.com.br')
  })
})
