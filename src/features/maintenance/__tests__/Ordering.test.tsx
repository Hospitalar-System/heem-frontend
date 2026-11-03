import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { chooseOption, listOptions } from '@/test/select-helpers'
import { TicketsPage } from '../pages/TicketsPage'
import { WorkOrdersPage } from '../pages/WorkOrdersPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const ticket = (id: string, severidade: string) => ({ id, hospitalId: 'h1', setorId: 's1', equipamentoId: 'e1', abertoPor: 'u', descricao: `Desc ${id}`, severidade, status: 'ABERTO', abertoEm: '2026-10-14T10:00:00Z' })
const order = (id: string, codigo: string) => ({ id, codigo, tipo: 'PREVENTIVA', status: 'AGENDADA', equipamentoId: 'e1', checklistId: 'c1', tecnicoId: null, dataAgendada: '2026-11-10T10:00:00Z' })
const httpError = (code: string) => Object.assign(new Error('http'), { response: { status: 400, data: { code } } })

let ticketRows: unknown[] = []
let orderRows: unknown[] = []
let rejectOrdering: string | undefined // valor de `ordenar` que o servidor recusa

function mockServer() {
  vi.mocked(apiClient.get).mockImplementation(async (url, config) => {
    const params = (config?.params ?? {}) as { ordenar?: string }
    if (url === '/chamados' || url === '/ordens-de-trabalho') {
      if (params.ordenar && params.ordenar === rejectOrdering) throw httpError(url === '/chamados' ? 'ORDENACAO_INDISPONIVEL' : 'ORDENACAO_INVALIDA')
      const rows = url === '/chamados' ? ticketRows : orderRows
      return { data: rows, headers: { 'x-total-count': '120' } } as never
    }
    if (url === '/equipamentos') return { data: [{ id: 'e1', setorId: 's1', codigo: 'EQ-01', nome: 'Bomba' }] } as never
    if (url === '/hospitais') return { data: [{ id: 'h1', nome: 'Santa Casa', cnpj: '' }] } as never
    return { data: [] } as never
  })
}

// Ignora a contagem de urgentes (tamanho 200), que também consulta /chamados.
const listCalls = (path: string) => vi.mocked(apiClient.get).mock.calls.filter(([url, config]) => { const params = config?.params as { pagina?: number; tamanho?: number } | undefined; return url === path && params?.pagina !== undefined && params.tamanho !== 200 })
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
  rejectOrdering = undefined
  ticketRows = [ticket('t-baixa', 'BAIXA'), ticket('t-critica', 'CRITICA'), ticket('t-media', 'MEDIA')]
  orderRows = [order('ot-2', 'OT-B'), order('ot-1', 'OT-A')]
  clearAuthSession()
  setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
  mockServer()
})

describe('TicketsPage: ordenação no servidor', () => {
  it('pede severidade primeiro (crítica, alta, média, baixa) por padrão, sem poluir a URL', async () => {
    renderPage(<TicketsPage />, '/tickets')
    await screen.findByText('Mostrando 1–25 de 120')
    expect(lastParams('/chamados')).toMatchObject({ ordenar: 'severidade', direcao: 'asc' })
    expect(screen.getByRole('combobox', { name: 'Ordenar chamados' })).toHaveTextContent('Severidade (mais urgente primeiro)')
    expect(screen.getByTestId('search')).toHaveTextContent(/^$/)
  })

  it('oferece as ordens em pt-BR e o prazo de SLA para admin e técnico', async () => {
    const user = userEvent.setup()
    renderPage(<TicketsPage />, '/tickets')
    await screen.findByText('Mostrando 1–25 de 120')
    expect(await listOptions(user, 'Ordenar chamados')).toEqual(['Severidade (mais urgente primeiro)', 'Mais recentes', 'Prazo de resolução (SLA)'])
  })

  it('não oferece o prazo de SLA ao papel interno (o servidor responderia ORDENACAO_INDISPONIVEL)', async () => {
    const user = userEvent.setup()
    clearAuthSession()
    setAuthSession('token', { id: 'int-1', name: 'Rui', roles: ['interno_hospital'], tenantId: 'tenant-1' })
    renderPage(<TicketsPage />, '/tickets')
    await screen.findByText('Mostrando 1–25 de 120')
    expect(await listOptions(user, 'Ordenar chamados')).toEqual(['Severidade (mais urgente primeiro)', 'Mais recentes'])
  })

  it('escolher outra ordem manda ordenar/direcao ao servidor, grava na URL e volta para a página 1', async () => {
    const user = userEvent.setup()
    renderPage(<TicketsPage />, '/tickets?pagina=3&tamanho=10&status=ABERTO')
    await screen.findByText('Mostrando 21–30 de 120')
    await chooseOption(user, 'Ordenar chamados', 'Mais recentes')
    await waitFor(() => expect(lastParams('/chamados')).toEqual({ pagina: 0, tamanho: 10, status: 'ABERTO', ordenar: 'abertoEm', direcao: 'desc' }))
    const search = screen.getByTestId('search').textContent ?? ''
    expect(search).toContain('ordenar=abertoEm')
    expect(search).toContain('direcao=desc')
    expect(search).toContain('status=ABERTO')
    expect(search).not.toContain('pagina=')
    await chooseOption(user, 'Ordenar chamados', 'Prazo de resolução (SLA)')
    await waitFor(() => expect(lastParams('/chamados')).toMatchObject({ ordenar: 'slaResolucaoAte', direcao: 'asc' }))
  })

  it('voltar à ordem padrão limpa ordenar e direcao da URL', async () => {
    const user = userEvent.setup()
    renderPage(<TicketsPage />, '/tickets?ordenar=abertoEm&direcao=desc')
    await screen.findByText('Mostrando 1–25 de 120')
    expect(lastParams('/chamados')).toMatchObject({ ordenar: 'abertoEm', direcao: 'desc' })
    await chooseOption(user, 'Ordenar chamados', 'Severidade (mais urgente primeiro)')
    await waitFor(() => expect(lastParams('/chamados')).toMatchObject({ ordenar: 'severidade', direcao: 'asc' }))
    expect(screen.getByTestId('search')).toHaveTextContent(/^$/)
  })

  it('o cliente não reordena: mostra as linhas na ordem em que o servidor devolveu', async () => {
    renderPage(<TicketsPage />, '/tickets')
    await screen.findByText('Mostrando 1–25 de 120')
    const rows = within(screen.getByRole('table', { name: 'Lista de chamados' })).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('link')[0].getAttribute('aria-label'))).toEqual(['Abrir chamado t-baixa', 'Abrir chamado t-critica', 'Abrir chamado t-media'])
  })

  it('ORDENACAO_INDISPONIVEL: mostra a mensagem e volta à ordem padrão', async () => {
    rejectOrdering = 'slaResolucaoAte'
    renderPage(<TicketsPage />, '/tickets?ordenar=slaResolucaoAte&direcao=asc')
    expect((await screen.findAllByText('Esta ordenação não está disponível para o seu perfil. Voltamos para a ordem padrão.')).length).toBeGreaterThan(0)
    await waitFor(() => expect(lastParams('/chamados')).toMatchObject({ ordenar: 'severidade', direcao: 'asc' }))
    expect(screen.getByTestId('search')).toHaveTextContent(/^$/)
    expect(await screen.findByText('Mostrando 1–25 de 120')).toBeInTheDocument()
  })

  it('ordenação desconhecida na URL cai na ordem padrão sem erro', async () => {
    renderPage(<TicketsPage />, '/tickets?ordenar=banana&direcao=desc')
    await screen.findByText('Mostrando 1–25 de 120')
    expect(lastParams('/chamados')).toMatchObject({ ordenar: 'severidade', direcao: 'asc' })
  })
})

describe('WorkOrdersPage: ordenação no servidor', () => {
  it('sem escolha não manda ordenar (vale a ordem padrão do servidor) e a direção fica desabilitada', async () => {
    renderPage(<WorkOrdersPage />, '/work-orders')
    await screen.findByText('Mostrando 1–25 de 120')
    expect(lastParams('/ordens-de-trabalho')).toEqual({ pagina: 0, tamanho: 25 })
    expect(screen.getByRole('combobox', { name: 'Direção da ordenação' })).toBeDisabled()
  })

  it('oferece Data agendada, Status, Código e Concluída em', async () => {
    const user = userEvent.setup()
    renderPage(<WorkOrdersPage />, '/work-orders')
    await screen.findByText('Mostrando 1–25 de 120')
    expect(await listOptions(user, 'Ordenar por')).toEqual(['Ordem padrão', 'Data agendada', 'Status', 'Código', 'Concluída em'])
  })

  it.each([['Data agendada', 'dataAgendada'], ['Status', 'status'], ['Código', 'codigo'], ['Concluída em', 'concluidaEm']])('ordenar por %s manda ordenar=%s, grava na URL e volta para a página 1', async (label, field) => {
    const user = userEvent.setup()
    renderPage(<WorkOrdersPage />, '/work-orders?pagina=3&status=AGENDADA')
    await screen.findByText('Mostrando 51–75 de 120')
    await chooseOption(user, 'Ordenar por', label)
    await waitFor(() => expect(lastParams('/ordens-de-trabalho')).toEqual({ pagina: 0, tamanho: 25, status: 'AGENDADA', ordenar: field, direcao: 'asc' }))
    expect(screen.getByTestId('search').textContent).toContain(`ordenar=${field}`)
    expect(screen.getByTestId('search').textContent).not.toContain('pagina=')
  })

  it('a direção decrescente vai ao servidor, preserva o campo e volta para a página 1', async () => {
    const user = userEvent.setup()
    renderPage(<WorkOrdersPage />, '/work-orders?ordenar=codigo&pagina=2')
    await screen.findByText('Mostrando 26–50 de 120')
    await chooseOption(user, 'Direção da ordenação', 'Decrescente')
    await waitFor(() => expect(lastParams('/ordens-de-trabalho')).toEqual({ pagina: 0, tamanho: 25, ordenar: 'codigo', direcao: 'desc' }))
    expect(screen.getByTestId('search').textContent).toContain('direcao=desc')
    await chooseOption(user, 'Ordenar por', 'Status')
    await waitFor(() => expect(lastParams('/ordens-de-trabalho')).toMatchObject({ ordenar: 'status', direcao: 'desc' }))
  })

  it('o cliente não reordena: mantém a ordem recebida do servidor mesmo pedindo código crescente', async () => {
    renderPage(<WorkOrdersPage />, '/work-orders?ordenar=codigo&direcao=asc')
    await screen.findByText('Mostrando 1–25 de 120')
    const rows = screen.getAllByRole('link', { name: /^Abrir OT-/ })
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual(['Abrir OT-B', 'Abrir OT-A'])
  })

  it('ORDENACAO_INVALIDA: mostra a mensagem e volta à ordem padrão', async () => {
    rejectOrdering = 'concluidaEm'
    renderPage(<WorkOrdersPage />, '/work-orders?ordenar=concluidaEm&direcao=desc')
    expect((await screen.findAllByText('Esta ordenação não é válida. Voltamos para a ordem padrão.')).length).toBeGreaterThan(0)
    await waitFor(() => expect(lastParams('/ordens-de-trabalho')).toEqual({ pagina: 0, tamanho: 25 }))
    expect(screen.getByTestId('search')).toHaveTextContent(/^$/)
    expect(await screen.findByText('Mostrando 1–25 de 120')).toBeInTheDocument()
  })
})
