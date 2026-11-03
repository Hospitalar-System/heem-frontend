import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { chooseOption } from '@/test/select-helpers'
import { ChecklistsPage } from '../pages/ChecklistsPage'
import { PreventiveCampaignsPage } from '../pages/PreventiveCampaignsPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) => <main><h1>{title}</h1>{action}{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const TOTAL = 60
const campaign = (index: number) => ({
  id: `camp-${index + 1}`, hospitalId: 'h1', nome: `Campanha ${String(index + 1).padStart(2, '0')}`, setorIds: [], categoriaIds: [], dataInicio: '2026-11-10', dataFim: null,
  recorrencia: 'avulsa', intervalo: null, proximaData: null, modoAtribuicao: 'equilibrado', tecnicoId: null, status: 'concluida', ativa: false, janelaAtual: '2026-11-10',
  execucao: { totalEquipamentos: 1, processadas: 1, geradas: 1, puladas: 0, pendencias: 0 }, ots: { total: 1, agendadas: 0, emExecucao: 0, concluidas: 1, canceladas: 0, atrasadas: 0 },
  pendenciasDetalhe: [], criadaEm: '2026-10-01T10:00:00Z', canceladaEm: null,
})
const checklist = (index: number) => ({ id: `ck-${index + 1}`, nome: `Checklist ${String(index + 1).padStart(2, '0')}`, ativo: true })

function Probe() { const location = useLocation(); return <div data-testid="search">{location.search}</div> }
function renderPage(node: ReactNode, entry: string) {
  function Providers({ children }: PropsWithChildren) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
    return <QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}>{children}<Probe /></MemoryRouter></QueryClientProvider>
  }
  return render(node, { wrapper: Providers })
}

function mockServer() {
  vi.mocked(apiClient.get).mockImplementation(async (url, config) => {
    const params = (config?.params ?? {}) as { pagina?: number; tamanho?: number }
    const paged = (rows: unknown[]) => {
      const size = params.tamanho ?? 50
      const start = (params.pagina ?? 0) * size
      return { data: rows.slice(start, start + size), headers: { 'x-total-count': String(rows.length) } } as never
    }
    if (url === '/campanhas-preventivas') return paged(Array.from({ length: TOTAL }, (_, index) => campaign(index)))
    if (url === '/checklists') return paged(Array.from({ length: TOTAL }, (_, index) => checklist(index)))
    if (url === '/hospitais') return { data: [{ id: 'h1', nome: 'Santa Casa', cnpj: '' }] } as never
    return { data: [] } as never
  })
}
const callsTo = (path: string) => vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === path)
const lastParams = (path: string) => callsTo(path).at(-1)?.[1]?.params

beforeEach(() => {
  vi.clearAllMocks()
  clearAuthSession()
  setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
  mockServer()
})

describe('Campanhas: paginação no servidor', () => {
  it('pede a primeira página com 25 itens, lê o total do header e avança na URL', async () => {
    const user = userEvent.setup()
    renderPage(<PreventiveCampaignsPage />, '/work-orders/campanhas')
    expect(await screen.findByText('Mostrando 1–25 de 60')).toBeInTheDocument()
    expect(lastParams('/campanhas-preventivas')).toEqual({ pagina: 0, tamanho: 25 })
    expect(within(screen.getByRole('table', { name: 'Lista de campanhas' })).getAllByRole('row')).toHaveLength(26)
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(await screen.findByText('Mostrando 26–50 de 60')).toBeInTheDocument()
    expect(lastParams('/campanhas-preventivas')).toEqual({ pagina: 1, tamanho: 25 })
    expect(screen.getByTestId('search')).toHaveTextContent('?pagina=2')
    expect(screen.getByRole('link', { name: 'Campanha 26' })).toBeInTheDocument()
  })

  it('lê página, tamanho e filtros da URL (link compartilhável)', async () => {
    renderPage(<PreventiveCampaignsPage />, '/work-orders/campanhas?pagina=3&tamanho=10&hospitalId=h1&status=concluida')
    expect(await screen.findByText('Mostrando 21–30 de 60')).toBeInTheDocument()
    expect(lastParams('/campanhas-preventivas')).toEqual({ pagina: 2, tamanho: 10, hospitalId: 'h1', status: 'concluida' })
  })

  it('mudar filtro volta para a página 1 mantendo o tamanho; trocar o tamanho também', async () => {
    const user = userEvent.setup()
    renderPage(<PreventiveCampaignsPage />, '/work-orders/campanhas?pagina=3&tamanho=10')
    await screen.findByText('Mostrando 21–30 de 60')
    await chooseOption(user, 'Filtrar por hospital', 'Santa Casa')
    await waitFor(() => expect(lastParams('/campanhas-preventivas')).toEqual({ pagina: 0, tamanho: 10, hospitalId: 'h1' }))
    expect(screen.getByTestId('search')).toHaveTextContent('?tamanho=10&hospitalId=h1')
    await chooseOption(user, 'Itens por página', '50')
    await waitFor(() => expect(lastParams('/campanhas-preventivas')).toEqual({ pagina: 0, tamanho: 50, hospitalId: 'h1' }))
  })
})

describe('Checklists: paginação no servidor', () => {
  it('pagina a lista no servidor, lê o total do header e guarda a página na URL', async () => {
    const user = userEvent.setup()
    renderPage(<ChecklistsPage />, '/checklists')
    expect(await screen.findByText('Mostrando 1–25 de 60')).toBeInTheDocument()
    expect(lastParams('/checklists')).toEqual({ pagina: 0, tamanho: 25 })
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(await screen.findByText('Mostrando 26–50 de 60')).toBeInTheDocument()
    expect(lastParams('/checklists')).toEqual({ pagina: 1, tamanho: 25 })
    expect(screen.getByTestId('search')).toHaveTextContent('?pagina=2')
    expect(screen.getByRole('button', { name: /Checklist 26/ })).toBeInTheDocument()
  })

  it('o checklist aberto continua no construtor depois de trocar de página', async () => {
    const user = userEvent.setup()
    renderPage(<ChecklistsPage />, '/checklists')
    await screen.findByText('Mostrando 1–25 de 60')
    expect(await screen.findByRole('heading', { name: 'Checklist 01' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    await screen.findByText('Mostrando 26–50 de 60')
    expect(screen.getByRole('heading', { name: 'Checklist 01' })).toBeInTheDocument()
  })

  it('lê página e tamanho da URL', async () => {
    renderPage(<ChecklistsPage />, '/checklists?pagina=2&tamanho=10')
    expect(await screen.findByText('Mostrando 11–20 de 60')).toBeInTheDocument()
    expect(lastParams('/checklists')).toEqual({ pagina: 1, tamanho: 10 })
  })
})
