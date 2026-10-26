import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser } from '../api/identity'
import { KeycloakAuthError, loginWithPassword, logoutSession } from '../api/keycloak'
import { LoginForm } from '../components/LoginForm'
import { REFRESH_TOKEN_STORAGE_KEY, clearAuthSession, getAuthState } from '../session'
import { ThemeProvider } from '@/app/theme-provider'

vi.mock('@/lib/demo-mode', () => ({ isDemoMode: false }))
vi.mock('../api/identity', () => ({
  getCurrentUser: vi.fn(),
  getDevelopmentToken: vi.fn(),
}))
vi.mock('../api/keycloak', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/keycloak')>()),
  loginWithPassword: vi.fn(),
  logoutSession: vi.fn(),
}))

const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresAt: Date.now() + 900_000 }
const profile = {
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

async function fill(user: ReturnType<typeof userEvent.setup>, { remember = false } = {}) {
  await user.type(screen.getByLabelText('E-mail'), 'ana@hospital.com.br')
  await user.type(screen.getByLabelText('Senha'), 'segredo-123')
  if (remember) await user.click(screen.getByLabelText('Lembrar de mim'))
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.mocked(logoutSession).mockResolvedValue(undefined)
  })
  afterEach(() => clearAuthSession())

  it('exibe campos com rótulo e sem "esqueci a senha"', () => {
    renderLogin()

    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByLabelText('Lembrar de mim')).not.toBeChecked()
    expect(screen.queryByText(/esqueci/i)).not.toBeInTheDocument()
  })

  it('valida e-mail inválido e senha vazia sem chamar o Keycloak', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'nao-e-email')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua senha.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true')
    expect(loginWithPassword).not.toHaveBeenCalled()
  })

  it('aceita senha curta: o tamanho mínimo é decisão do Keycloak', async () => {
    const user = userEvent.setup()
    vi.mocked(loginWithPassword).mockRejectedValue(new KeycloakAuthError('invalid_credentials'))
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'ana@hospital.com.br')
    await user.type(screen.getByLabelText('Senha'), 'a')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(loginWithPassword).toHaveBeenCalledOnce())
  })

  it('entra, grava o refresh token em sessionStorage e redireciona ao dashboard', async () => {
    const user = userEvent.setup()
    vi.mocked(loginWithPassword).mockResolvedValue(tokens)
    vi.mocked(getCurrentUser).mockResolvedValue(profile)
    renderLogin()

    await fill(user)

    expect(await screen.findByTestId('current-path')).toHaveTextContent('/dashboard')
    expect(loginWithPassword).toHaveBeenCalledWith({ email: 'ana@hospital.com.br', password: 'segredo-123' })
    expect(getCurrentUser).toHaveBeenCalledWith('access-1')
    expect(getAuthState()).toMatchObject({ accessToken: 'access-1', isAuthenticated: true, user: profile })
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-1')
    expect(window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('com "Lembrar de mim" grava o refresh token em localStorage', async () => {
    const user = userEvent.setup()
    vi.mocked(loginWithPassword).mockResolvedValue(tokens)
    vi.mocked(getCurrentUser).mockResolvedValue(profile)
    renderLogin()

    await fill(user, { remember: true })

    expect(await screen.findByTestId('current-path')).toHaveTextContent('/dashboard')
    expect(window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBe('refresh-1')
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it.each([
    ['invalid_credentials', /E-mail ou senha incorretos/],
    ['account_locked', /Muitas tentativas sem sucesso/],
    ['network', /Não foi possível conectar ao serviço de login/],
  ] as const)('mostra o erro %s sem expor a senha e limpa o campo', async (kind, expected) => {
    const user = userEvent.setup()
    vi.mocked(loginWithPassword).mockRejectedValue(new KeycloakAuthError(kind))
    renderLogin()

    await fill(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(expected)
    expect(document.body.textContent).not.toContain('segredo-123')
    expect(screen.getByLabelText('Senha')).toHaveValue('')
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@hospital.com.br')
    expect(getAuthState().isAuthenticated).toBe(false)
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(getCurrentUser).not.toHaveBeenCalled()
  })

  it('limpa a senha do formulário também quando o /me falha depois do login', async () => {
    const user = userEvent.setup()
    vi.mocked(loginWithPassword).mockResolvedValue(tokens)
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('falha no /me'))
    renderLogin()

    await fill(user)

    expect(await screen.findByText('falha no /me')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveValue('')
  })

  it('mostra "Conectando…" e desabilita o envio enquanto aguarda', async () => {
    const user = userEvent.setup()
    vi.mocked(loginWithPassword).mockImplementation(() => new Promise(() => undefined))
    renderLogin()

    await fill(user)

    const button = await screen.findByRole('button', { name: 'Conectando…' })
    expect(button).toBeDisabled()
    expect(screen.getByLabelText('E-mail')).toBeDisabled()
    expect(loginWithPassword).toHaveBeenCalledOnce()
  })

  it.each([
    ['USUARIO_NAO_CADASTRADO', 'Seu acesso ainda não foi liberado. Fale com o administrador.'],
    ['USUARIO_DESATIVADO', 'Seu usuário foi desativado. Fale com o administrador.'],
    ['ACESSO_NEGADO', 'Não foi possível liberar seu acesso. Fale com o administrador.'],
  ])('mostra tela própria no 403 %s, revoga o refresh token e não deixa sessão', async (code, message) => {
    const user = userEvent.setup()
    vi.mocked(loginWithPassword).mockResolvedValue(tokens)
    vi.mocked(getCurrentUser).mockRejectedValue({ response: { status: 403, data: { code } } })
    renderLogin()

    await fill(user, { remember: true })

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByLabelText('Senha')).not.toBeInTheDocument()
    expect(logoutSession).toHaveBeenCalledWith('refresh-1')
    expect(getAuthState().isAuthenticated).toBe(false)
    expect(window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Voltar ao login' }))
    expect(screen.getByLabelText('Senha')).toHaveValue('')
  })

  it('em falha do /me que não é 403 mostra erro no formulário e revoga o refresh token', async () => {
    const user = userEvent.setup()
    vi.mocked(loginWithPassword).mockResolvedValue(tokens)
    vi.mocked(getCurrentUser).mockRejectedValue({ response: { status: 500, data: { detail: 'Erro interno.' } } })
    renderLogin()

    await fill(user)

    expect(await screen.findByText('Erro interno.')).toBeInTheDocument()
    expect(logoutSession).toHaveBeenCalledWith('refresh-1')
    expect(getAuthState().isAuthenticated).toBe(false)
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('não grava sessão quando o papel não tem rota', async () => {
    const user = userEvent.setup()
    vi.mocked(loginWithPassword).mockResolvedValue(tokens)
    vi.mocked(getCurrentUser).mockResolvedValue({ ...profile, roles: [] })
    renderLogin()

    await fill(user)

    expect(await screen.findByText('Sua conta não possui um perfil de acesso reconhecido.')).toBeInTheDocument()
    expect(getAuthState().isAuthenticated).toBe(false)
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
    expect(logoutSession).toHaveBeenCalledWith('refresh-1')
  })
})
