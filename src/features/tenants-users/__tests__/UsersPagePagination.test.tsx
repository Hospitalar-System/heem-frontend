import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { UsersPage } from '../pages/UsersPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const TOTAL = 60
const allUsers = Array.from({ length: TOTAL }, (_, index) => ({ id: `user-${index + 1}`, codigo: `USR-${index + 1}`, nome: `Pessoa ${index + 1}`, email: `p${index + 1}@example.com`, role: 'tecnico', ativo: true }))

function Probe() { const location = useLocation(); return <div data-testid="search">{location.search}</div> }

function renderPage(entry: string) {
  function Providers({ children }: PropsWithChildren) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
    return <QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}>{children}<Probe /></MemoryRouter></QueryClientProvider>
  }
  return render(<UsersPage />, { wrapper: Providers })
}

const listParams = () => vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/users').at(-1)?.[1]?.params

describe('UsersPage com paginação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url, config) => {
      if (url === '/users') {
        const { pagina = 0, tamanho = 50 } = (config?.params ?? {}) as { pagina?: number; tamanho?: number }
        return { data: allUsers.slice(pagina * tamanho, pagina * tamanho + tamanho), headers: { 'x-total-count': String(TOTAL) } } as never
      }
      return { data: [] } as never
    })
  })

  it('pede a página do servidor, mostra o total do header e só carrega vínculos da página', async () => {
    const user = userEvent.setup()
    renderPage('/users')
    expect(await screen.findByText('Mostrando 1–25 de 60')).toBeInTheDocument()
    expect(listParams()).toEqual({ pagina: 0, tamanho: 25 })
    expect(screen.getByText('60 usuários')).toBeInTheDocument()
    expect(vi.mocked(apiClient.get).mock.calls.filter(([url]) => /^\/users\/.+\/hospitais$/.test(url))).toHaveLength(25)
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(await screen.findByText('Mostrando 26–50 de 60')).toBeInTheDocument()
    expect(listParams()).toEqual({ pagina: 1, tamanho: 25 })
    expect(screen.getByTestId('search')).toHaveTextContent('?pagina=2')
  })

  it('página fora do intervalo volta para a última válida', async () => {
    renderPage('/users?pagina=40&tamanho=50')
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?pagina=2&tamanho=50'))
    expect(await screen.findByText('Mostrando 51–60 de 60')).toBeInTheDocument()
  })

  it('usa o separador de linha compartilhado', async () => {
    renderPage('/users')
    expect(await screen.findByRole('row', { name: /^Pessoa 1 USR-1/ })).toHaveClass('row-divider')
  })
})
