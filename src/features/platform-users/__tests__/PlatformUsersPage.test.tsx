import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { apiClient } from '@/lib/axios'
import { PlatformUsersPage } from '../pages/PlatformUsersPage'

vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, subtitle, children, action }: PropsWithChildren<{ title: string; subtitle?: string; action?: ReactNode }>) => <main><h1>{title}</h1><p>{subtitle}</p>{action}{children}</main>,
}))
vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><PlatformUsersPage /></QueryClientProvider>)
}

const platformUser = { id: 'platform-1', codigo: 'SUP-001', nome: 'Clara Mendes', email: 'clara@heem.app', role: 'super_admin', ativo: true }

afterEach(() => vi.resetAllMocks())

describe('PlatformUsersPage', () => {
  it('lists internal users using only the platform endpoint', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [platformUser] } as never)
    renderPage()

    expect(await screen.findByText('Clara Mendes')).toBeInTheDocument()
    expect(screen.getByText('clara@heem.app')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/platform-users')
    expect(apiClient.get).not.toHaveBeenCalledWith('/users')
  })

  it('creates a platform user through POST /platform-users', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] } as never).mockResolvedValueOnce({ data: [platformUser] } as never)
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: platformUser } as never)
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Novo usuário' }))
    await user.type(screen.getByLabelText('Código'), 'SUP-001')
    await user.type(screen.getByLabelText('Nome'), 'Clara Mendes')
    await user.type(screen.getByLabelText('E-mail'), 'clara@heem.app')
    await user.click(screen.getByRole('button', { name: 'Criar usuário' }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/platform-users', { codigo: 'SUP-001', nome: 'Clara Mendes', email: 'clara@heem.app', role: 'super_admin' }))
    expect(await screen.findByText('Clara Mendes')).toBeInTheDocument()
  })

  it('loads the detail and updates an existing platform user through PUT', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [platformUser] } as never).mockResolvedValueOnce({ data: platformUser } as never).mockResolvedValueOnce({ data: [{ ...platformUser, nome: 'Clara Mendes Silva' }] } as never)
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { ...platformUser, nome: 'Clara Mendes Silva' } } as never)
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    const nameInput = await screen.findByLabelText('Nome')
    await user.clear(nameInput)
    await user.type(nameInput, 'Clara Mendes Silva')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/platform-users/platform-1'))
    expect(apiClient.put).toHaveBeenCalledWith('/platform-users/platform-1', { codigo: 'SUP-001', nome: 'Clara Mendes Silva', email: 'clara@heem.app', role: 'super_admin' })
    expect(apiClient.put).not.toHaveBeenCalledWith('/users/platform-1', expect.anything())
  })

  it('deactivates an internal user through the platform endpoint after confirmation', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [platformUser] } as never).mockResolvedValueOnce({ data: [{ ...platformUser, ativo: false }] } as never)
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: {} } as never)
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Desativar' }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/platform-users/platform-1/desativar'))
    expect(apiClient.post).not.toHaveBeenCalledWith('/users/platform-1/desativar')
    vi.unstubAllGlobals()
  })

  it('shows a recoverable error when the list request fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('offline'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os usuários da plataforma.')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
