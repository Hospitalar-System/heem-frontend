import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toAbortError } from '../api/auth-error'
import { getCurrentUser } from '../api/identity'
import { loginWithPassword, logoutSession } from '../api/keycloak'
import { LoginForm } from '../components/LoginForm'
import { LOGIN_TIMEOUT_MS, WAKING_NOTICE_MS } from '../hooks/useLogin'
import { REFRESH_TOKEN_STORAGE_KEY, clearAuthSession, getAuthState } from '../session'
import { ThemeProvider } from '@/app/theme-provider'

vi.mock('@/lib/demo-mode', () => ({ isDemoMode: false }))
vi.mock('../api/identity', () => ({ getCurrentUser: vi.fn(), getDevelopmentToken: vi.fn() }))
vi.mock('../api/keycloak', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/keycloak')>()),
  loginWithPassword: vi.fn(),
  logoutSession: vi.fn(),
}))

const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresAt: Date.now() + 900_000 }
const wakingText = 'O servidor está acordando, isso pode levar até 1 minuto. Aguarde…'
const timeoutText = 'O servidor demorou para responder. Ele pode estar acordando; tente novamente em instantes.'

/** Simula o provedor: fica pendente até o signal abortar e então rejeita como o provedor real. */
function hangUntilAborted() {
  const signals: AbortSignal[] = []
  vi.mocked(loginWithPassword).mockImplementation((_credentials, options) => {
    const signal = options!.signal!
    signals.push(signal)
    return new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(toAbortError(signal)))
    })
  })
  return signals
}

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="*" element={<p>destino</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}

// fireEvent em vez de userEvent: com fake timers o userEvent do RTL não avança o relógio e trava.
const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

async function submit() {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ana@hospital.com.br' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo-123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  await advance(0)
}


describe('LoginForm: servidor acordando', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    clearAuthSession()
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.mocked(logoutSession).mockResolvedValue(undefined)
  })
  afterEach(() => {
    clearAuthSession()
    vi.useRealTimers()
  })

  it('mostra o aviso e o Cancelar só depois de 8 s', async () => {
    hangUntilAborted()
    renderLogin()
    await submit()

    expect(screen.getByRole('button', { name: 'Conectando…' })).toBeDisabled()
    await advance(WAKING_NOTICE_MS - 1)
    expect(screen.queryByText(wakingText)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()

    await advance(1)
    expect(screen.getByRole('status')).toHaveTextContent(wakingText)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('type', 'button')
  })

  it('sucesso antes dos 8 s não mostra o aviso', async () => {
    vi.mocked(loginWithPassword).mockResolvedValue(tokens)
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1', name: 'Ana', email: 'ana@hospital.com.br', roles: ['admin_cliente'], tenantId: 't1',
    })
    renderLogin()
    await submit()
    await advance(WAKING_NOTICE_MS * 2)

    expect(screen.queryByText(wakingText)).not.toBeInTheDocument()
    expect(screen.getByText('destino')).toBeInTheDocument()
    expect(getAuthState().isAuthenticated).toBe(true)
  })

  it('cancelar aborta, não mostra erro e devolve o formulário com a senha limpa e foco nela', async () => {
    const signals = hangUntilAborted()
    renderLogin()
    await submit()
    await advance(WAKING_NOTICE_MS)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await advance(1)

    expect(signals[0].aborted).toBe(true)
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
    expect(screen.queryByText(wakingText)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@hospital.com.br')
    expect(screen.getByLabelText('Senha')).toHaveValue('')
    expect(screen.getByLabelText('Senha')).toHaveFocus()
    expect(getAuthState().isAuthenticated).toBe(false)
  })

  it('estoura em 40 s: mostra a mensagem fixa e não persiste sessão', async () => {
    hangUntilAborted()
    renderLogin()
    await submit()
    await advance(LOGIN_TIMEOUT_MS)

    expect(screen.getByRole('alert')).toHaveTextContent(timeoutText)
    expect(screen.queryByText(wakingText)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveValue('')
    expect(getAuthState().isAuthenticated).toBe(false)
    expect(window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('prazo vencido no /me revoga o refresh token e não persiste sessão', async () => {
    vi.mocked(loginWithPassword).mockResolvedValue(tokens)
    vi.mocked(getCurrentUser).mockImplementation((_token, signal) => new Promise((_resolve, reject) => {
      signal!.addEventListener('abort', () => reject(new Error('canceled')))
    }))
    renderLogin()
    await submit()
    await advance(LOGIN_TIMEOUT_MS)

    expect(screen.getByRole('alert')).toHaveTextContent(timeoutText)
    expect(logoutSession).toHaveBeenCalledWith('refresh-1')
    expect(getAuthState().isAuthenticated).toBe(false)
  })

  it('nova tentativa reinicia o contador do aviso', async () => {
    hangUntilAborted()
    renderLogin()
    await submit()
    await advance(WAKING_NOTICE_MS)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await advance(1)

    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await advance(0)
    await advance(WAKING_NOTICE_MS - 1)
    expect(screen.queryByText(wakingText)).not.toBeInTheDocument()
    await advance(1)
    expect(screen.getByText(wakingText)).toBeInTheDocument()
  })
})
