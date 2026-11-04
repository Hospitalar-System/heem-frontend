import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthError } from '../api/auth-error'
import type { AuthProvider } from '../api/auth-provider'
import { LoginForm } from '../components/LoginForm'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { ThemeProvider } from '@/app/theme-provider'

vi.mock('@/lib/demo-mode', () => ({ isDemoMode: false }))

const provider: AuthProvider = {
  name: 'supabase',
  supportsPasswordReset: true,
  signIn: vi.fn(),
  refresh: vi.fn(),
  signOut: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}
let active: AuthProvider = provider
vi.mock('../api/auth-provider', () => ({ getAuthProvider: () => active }))

// A URL real (fragmento) é definida antes do render; o MemoryRouter só serve para os links.
function renderAt(path: string, ui: ReactNode) {
  window.history.replaceState(null, '', path)
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/p']}>
          <Routes>
            <Route path="/p" element={ui} />
            <Route path="/login" element={<p>tela de login</p>} />
            <Route path="/esqueci-senha" element={<p>tela esqueci</p>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  active = provider
  window.localStorage.clear()
  window.sessionStorage.clear()
})
afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('/esqueci-senha', () => {
  it('envia o e-mail e mostra mensagem genérica de sucesso', async () => {
    vi.mocked(provider.requestPasswordReset).mockResolvedValue(undefined)
    renderAt('/p', <ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('E-mail'), 'naoexiste@x.com')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByText('Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.')).toBeInTheDocument()
    expect(provider.requestPasswordReset).toHaveBeenCalledWith('naoexiste@x.com')
    expect(screen.getByRole('link', { name: 'Voltar ao login' })).toHaveAttribute('href', '/login')
  })

  it('valida o e-mail antes de enviar', async () => {
    renderAt('/p', <ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('E-mail'), 'invalido')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(provider.requestPasswordReset).not.toHaveBeenCalled()
  })

  it.each([
    ['rate_limited', 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'],
    ['network', 'Não foi possível conectar ao serviço de login. Verifique sua conexão e tente novamente em instantes.'],
  ] as const)('erro %s mostra mensagem fixa e mantém o formulário', async (kind, message) => {
    vi.mocked(provider.requestPasswordReset).mockRejectedValue(new AuthError(kind))
    renderAt('/p', <ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@x.com')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar link' })).toBeEnabled()
  })

  it('sem suporte do provider mostra aviso e nenhum formulário', () => {
    active = { ...provider, name: 'keycloak', supportsPasswordReset: false }
    renderAt('/p', <ForgotPasswordPage />)
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
    expect(screen.getByText(/não está disponível neste ambiente/)).toBeInTheDocument()
  })
})

describe('/redefinir-senha', () => {
  const recovery = '/p#access_token=link-token&refresh_token=link-refresh&expires_in=3600&type=recovery'

  async function fill(newPassword: string, confirm: string) {
    await userEvent.type(screen.getByLabelText('Nova senha'), newPassword)
    await userEvent.type(screen.getByLabelText('Confirmação da nova senha'), confirm)
    await userEvent.click(screen.getByRole('button', { name: 'Salvar senha' }))
  }

  it('lê o fragmento, limpa a URL e envia o token do link com a nova senha', async () => {
    vi.mocked(provider.updatePassword).mockResolvedValue(undefined)
    renderAt(recovery, <ResetPasswordPage />)

    await waitFor(() => expect(window.location.hash).toBe(''))
    expect(window.location.href).not.toContain('link-token')
    expect(screen.getByRole('heading', { name: 'Redefinir senha' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('autocomplete', 'new-password')

    await fill('NovaSenha#123', 'NovaSenha#123')
    expect(await screen.findByText(/Sua senha foi salva/)).toBeInTheDocument()
    expect(provider.updatePassword).toHaveBeenCalledWith('link-token', 'NovaSenha#123')
  })

  it('convite (type=invite) usa o título Definir senha', () => {
    renderAt('/p#access_token=t&type=invite', <ResetPasswordPage />)
    expect(screen.getByRole('heading', { name: 'Definir senha' })).toBeInTheDocument()
  })

  it('sucesso redireciona ao login sem persistir tokens', async () => {
    vi.mocked(provider.updatePassword).mockResolvedValue(undefined)
    renderAt(recovery, <ResetPasswordPage />)
    await fill('NovaSenha#123', 'NovaSenha#123')
    await screen.findByText(/Sua senha foi salva/)
    expect(await screen.findByText('tela de login', {}, { timeout: 4500 })).toBeInTheDocument()

    // Nenhum token do link (nem refresh) é persistido; só preferências como o tema podem existir.
    const stored = JSON.stringify({ ...window.localStorage, ...window.sessionStorage })
    expect(stored).not.toMatch(/link-token|link-refresh|NovaSenha/)
    expect(window.localStorage.getItem('heem.auth.refresh')).toBeNull()
    expect(window.sessionStorage.getItem('heem.auth.refresh')).toBeNull()
  }, 10_000)

  it('valida mínimo de 8 caracteres e confirmação igual', async () => {
    renderAt(recovery, <ResetPasswordPage />)
    await fill('curta', 'curta')
    expect(await screen.findByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Nova senha'))
    await userEvent.clear(screen.getByLabelText('Confirmação da nova senha'))
    await fill('SenhaLonga#1', 'SenhaLonga#2')
    expect(await screen.findByText('As senhas não conferem.')).toBeInTheDocument()
    expect(provider.updatePassword).not.toHaveBeenCalled()
  })

  it('weak_password do servidor aparece e a senha sai do formulário', async () => {
    vi.mocked(provider.updatePassword).mockRejectedValue(new AuthError('weak_password'))
    renderAt(recovery, <ResetPasswordPage />)
    await fill('12345678', '12345678')

    expect(await screen.findByText('A senha é fraca demais. Use uma senha mais longa e menos previsível.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nova senha')).toHaveValue('')
    expect(screen.getByLabelText('Confirmação da nova senha')).toHaveValue('')
  })

  it('link rejeitado pelo servidor (invalid_link) leva ao estado de link inválido', async () => {
    vi.mocked(provider.updatePassword).mockRejectedValue(new AuthError('invalid_link'))
    renderAt(recovery, <ResetPasswordPage />)
    await fill('NovaSenha#123', 'NovaSenha#123')
    expect(await screen.findByRole('heading', { name: 'Link inválido ou expirado' })).toBeInTheDocument()
  })

  it.each([
    ['link expirado no fragmento', '/p#error=access_denied&error_code=otp_expired&error_description=expired'],
    ['link expirado na query', '/p?error=access_denied&error_code=otp_expired'],
    ['sem fragmento', '/p'],
    ['tipo desconhecido', '/p#access_token=t&type=magiclink'],
  ])('%s mostra link inválido com caminho para /esqueci-senha', async (_name, path) => {
    renderAt(path, <ResetPasswordPage />)
    expect(screen.getByRole('heading', { name: 'Link inválido ou expirado' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Solicitar novo link' }))
    expect(await screen.findByText('tela esqueci')).toBeInTheDocument()
  })
})

describe('LoginForm: Esqueci minha senha', () => {
  it('aparece quando o provider suporta recuperação', () => {
    renderAt('/p', <LoginForm />)
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/esqueci-senha')
  })

  it('não aparece com provider sem suporte', () => {
    active = { ...provider, name: 'keycloak', supportsPasswordReset: false }
    renderAt('/p', <LoginForm />)
    expect(screen.queryByRole('link', { name: 'Esqueci minha senha' })).not.toBeInTheDocument()
  })
})
