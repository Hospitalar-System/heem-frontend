import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { chooseOption } from '@/test/select-helpers'
import { TicketsPage } from '../pages/TicketsPage'
import { WorkOrdersPage } from '../pages/WorkOrdersPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const TOTAL = 120
const makeTickets = () => Array.from({ length: TOTAL }, (_, index) => ({ id: `ticket-${String(index + 1).padStart(3, '0')}`, hospitalId: 'h1', setorId: 's1', equipamentoId: 'e1', abertoPor: 'u', descricao: `Chamado ${index + 1}`, severidade: 'MEDIA', status: 'ABERTO', abertoEm: '2026-10-14T10:00:00Z' }))
const makeOrders = () => Array.from({ length: TOTAL }, (_, index) => ({ id: `ot-${index + 1}`, codigo: `OT-${index + 1}`, tipo: 'PREVENTIVA', status: 'AGENDADA', equipamentoId: 'e1', checklistId: 'c1', tecnicoId: 't1', local: null, dataAgendada: '2026-10-20T13:00:00Z', iniciadaEm: null, concluidaEm: null, atrasada: false, planoPreventivoId: null }))

let serverTotal = TOTAL

function mockServer(path: '/chamados' | '/ordens-de-trabalho', rows: Array<Record<string, unknown>>) {
  vi.mocked(apiClient.get).mockImplementation(async (url, config) => {
    const params = (config?.params ?? {}) as { pagina?: number; tamanho?: number }
    if (url === path) {
      const start = (params.pagina ?? 0) * (params.tamanho ?? 50)
      return { data: rows.slice(start, start + (params.tamanho ?? 50)), headers: { 'x-total-count': String(serverTotal) } } as never
    }
    if (url === '/equipamentos') return { data: [{ id: 'e1', setorId: 's1', codigo: 'EQ-01', nome: 'Bomba' }] } as never
    if (url === '/hospitais') return { data: [{ id: 'h1', nome: 'Santa Casa', cnpj: '' }] } as never
    if (url === '/hospitais/h1/setores') return { data: [{ id: 's1', hospitalId: 'h1', codigo: 'UTI', nome: 'UTI' }] } as never
    return { data: [] } as never
  })
}

const listCalls = (path: string) => vi.mocked(apiClient.get).mock.calls.filter(([url, config]) => url === path && (config?.params as { pagina?: number } | undefined)?.pagina !== undefined && (config?.params as { tamanho?: number }).tamanho !== 200)
const lastParams = (path: string) => listCalls(path).at(-1)?.[1]?.params

function Probe() { const location = useLocation(); return <div data-testid="search">{location.search}</div> }

function renderPage(node: React.ReactNode, entry: string) {
  function Providers({ children }: PropsWithChildren) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
    return <QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}>{children}<Probe /></MemoryRouter></QueryClientProvider>
  }
  return render(node, { wrapper: Providers })
}

beforeEach(() => {
  vi.clearAllMocks()
  serverTotal = TOTAL
  clearAuthSession()
  setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
})

describe('TicketsPage com paginação', () => {
  it('pede a primeira página com 25 itens, lê o total do header e avança na URL', async () => {
    const user = userEvent.setup()
    mockServer('/chamados', makeTickets())
    renderPage(<TicketsPage />, '/tickets')
    expect(await screen.findByText('Mostrando 1–25 de 120')).toBeInTheDocument()
    expect(lastParams('/chamados')).toEqual({ pagina: 0, tamanho: 25 })
    expect(screen.getAllByRole('article')).toHaveLength(25)
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(await screen.findByText('Mostrando 26–50 de 120')).toBeInTheDocument()
    expect(lastParams('/chamados')).toEqual({ pagina: 1, tamanho: 25 })
    expect(screen.getByTestId('search')).toHaveTextContent('?pagina=2')
  })

  it('lê página e tamanho da URL (link compartilhável)', async () => {
    mockServer('/chamados', makeTickets())
    renderPage(<TicketsPage />, '/tickets?pagina=3&tamanho=10')
    expect(await screen.findByText('Mostrando 21–30 de 120')).toBeInTheDocument()
    expect(lastParams('/chamados')).toEqual({ pagina: 2, tamanho: 10 })
  })

  it('trocar o tamanho volta para a página 1', async () => {
    const user = userEvent.setup()
    mockServer('/chamados', makeTickets())
    renderPage(<TicketsPage />, '/tickets?pagina=3')
    await screen.findByText('Mostrando 51–75 de 120')
    await chooseOption(user, 'Itens por página', '50')
    expect(await screen.findByText('Mostrando 1–50 de 120')).toBeInTheDocument()
    expect(lastParams('/chamados')).toEqual({ pagina: 0, tamanho: 50 })
  })

  it('mudar o filtro de status envia o status ao servidor e volta para a página 1 mantendo o tamanho', async () => {
    const user = userEvent.setup()
    mockServer('/chamados', makeTickets())
    renderPage(<TicketsPage />, '/tickets?pagina=3&tamanho=10')
    await screen.findByText('Mostrando 21–30 de 120')
    await chooseOption(user, 'Filtrar por status', 'Aberto')
    await waitFor(() => expect(lastParams('/chamados')).toEqual({ pagina: 0, tamanho: 10, status: 'ABERTO' }))
    expect(screen.getByTestId('search')).toHaveTextContent('?tamanho=10&status=ABERTO')
  })

  it('página fora do intervalo volta para a última página válida', async () => {
    mockServer('/chamados', makeTickets())
    renderPage(<TicketsPage />, '/tickets?pagina=99')
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?pagina=5'))
    expect(await screen.findByText('Mostrando 101–120 de 120')).toBeInTheDocument()
  })

  it('sem o header X-Total-Count usa o tamanho da lista recebida', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url) => (url === '/chamados' ? { data: makeTickets().slice(0, 3) } : { data: [] }) as never)
    renderPage(<TicketsPage />, '/tickets')
    expect(await screen.findByText('Mostrando 1–3 de 3')).toBeInTheDocument()
  })
})

describe('WorkOrdersPage com paginação', () => {
  it('pagina no servidor e preserva status, tipo e atrasadas na URL e na requisição', async () => {
    const user = userEvent.setup()
    mockServer('/ordens-de-trabalho', makeOrders())
    renderPage(<WorkOrdersPage />, '/work-orders?status=AGENDADA&atrasadas=1&pagina=2')
    expect(await screen.findByText('Mostrando 26–50 de 120')).toBeInTheDocument()
    expect(lastParams('/ordens-de-trabalho')).toEqual({ pagina: 1, tamanho: 25, status: 'AGENDADA', atrasadas: true })
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    await waitFor(() => expect(lastParams('/ordens-de-trabalho')).toEqual({ pagina: 2, tamanho: 25, status: 'AGENDADA', atrasadas: true }))
    expect(screen.getByTestId('search')).toHaveTextContent('status=AGENDADA')
    expect(screen.getByTestId('search')).toHaveTextContent('atrasadas=1')
  })

  it('mudar o tipo volta para a página 1', async () => {
    const user = userEvent.setup()
    mockServer('/ordens-de-trabalho', makeOrders())
    renderPage(<WorkOrdersPage />, '/work-orders?pagina=3')
    await screen.findByText('Mostrando 51–75 de 120')
    await chooseOption(user, 'Filtrar por tipo', 'Corretiva')
    await waitFor(() => expect(lastParams('/ordens-de-trabalho')).toEqual({ pagina: 0, tamanho: 25, tipo: 'CORRETIVA' }))
  })

  it('usa o separador de linha compartilhado, sem borda branca forçada', async () => {
    mockServer('/ordens-de-trabalho', makeOrders())
    renderPage(<WorkOrdersPage />, '/work-orders')
    const row = (await screen.findByRole('link', { name: 'Abrir OT-1' }))
    expect(row).toHaveClass('row-divider')
    expect(row.className).not.toMatch(/border-white|bg-white|border-border\/70/)
  })
})
