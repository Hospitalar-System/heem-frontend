import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { chooseOption, listOptions } from '@/test/select-helpers'
import { WorkOrdersPage } from '../pages/WorkOrdersPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) => <main><h1>{title}</h1>{action}{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

const order = (extra: Record<string, unknown>) => ({
  id: 'ot-1', codigo: 'OT-1001', tipo: 'PREVENTIVA', status: 'AGENDADA', equipamentoId: 'equipment-1', checklistId: 'checklist-1', tecnicoId: 'tech-1', local: null,
  dataAgendada: '2026-10-20T13:00:00Z', iniciadaEm: null, concluidaEm: null, atrasada: false,
  hospitalId: 'hospital-1', hospitalNome: 'Santa Casa', setorId: 'sector-1', setorNome: 'UTI Adulto', planoPreventivoId: null, campanhaPreventivaId: null, ...extra,
})
let orders: unknown[] = []

function mockApi() {
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/ordens-de-trabalho') return { data: orders, headers: { 'x-total-count': String(orders.length) } } as never
    if (url === '/planos-preventivos/plan-1') return { data: { id: 'plan-1', equipamentoId: 'equipment-1', checklistId: 'checklist-1', tecnicoPadraoId: 'tech-1', intervaloDias: 30, dataAncora: '2026-01-05', proximaData: '2026-12-01', ativo: true, pendencia: false, createdAt: '', updatedAt: '' } } as never
    if (url === '/campanhas-preventivas/camp-1') return { data: { id: 'camp-1', nome: 'Preventiva semestral', status: 'concluida', ativa: true } } as never
    if (url === '/equipamentos') return { data: [{ id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-01', nome: 'Bomba de infusão' }] } as never
    if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }, { id: 'hospital-2', nome: 'Clínica Norte', cnpj: '' }] } as never
    if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'UTI', nome: 'UTI Adulto' }, { id: 'sector-9', hospitalId: 'hospital-1', codigo: 'CC', nome: 'Centro Cirúrgico' }] } as never
    if (url === '/hospitais/hospital-2/setores') return { data: [{ id: 'sector-2', hospitalId: 'hospital-2', codigo: 'EM', nome: 'Emergência' }] } as never
    if (url === '/users') return { data: [{ id: 'tech-1', codigo: 'T-1', nome: 'Rafael', email: 'r@test', role: 'tecnico', ativo: true }] } as never
    if (url === '/users/tech-1/hospitais') return { data: ['hospital-1'] } as never
    if (url === '/checklists') return { data: [{ id: 'checklist-1', nome: 'Inspeção preventiva', ativo: true }] } as never
    return { data: [] } as never
  })
}

function Where() { const location = useLocation(); return <div data-testid="where">{location.pathname}{location.search}</div> }
function renderAt(entry = '/work-orders') {
  function Providers({ children }: PropsWithChildren) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }))
    return <QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter></QueryClientProvider>
  }
  return render(<><WorkOrdersPage /><Where /></>, { wrapper: Providers })
}
const listCalls = () => vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/ordens-de-trabalho')
const lastListParams = () => listCalls().at(-1)?.[1]

describe('WorkOrdersPage: hospital, setor e rotina (Story F7.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    orders = [order({})]
    mockApi()
  })

  it('mostra hospital e setor da lista vindos do servidor', async () => {
    renderAt()
    expect(await screen.findByText('OT-1001')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Hospital / Setor' })).toBeInTheDocument()
    const row = screen.getByRole('link', { name: 'Abrir OT-1001' })
    expect(within(row).getByText('Santa Casa')).toBeInTheDocument()
    expect(within(row).getByText('UTI Adulto')).toBeInTheDocument()
  })

  it('filtra por hospital no servidor, zera a página e o setor só depende do hospital escolhido', async () => {
    const user = userEvent.setup()
    renderAt('/work-orders?pagina=2')
    await screen.findByText('OT-1001')
    expect(screen.getByRole('combobox', { name: 'Filtrar por setor' })).toBeDisabled()
    await chooseOption(user, 'Filtrar por hospital', 'Santa Casa')
    await waitFor(() => expect(lastListParams()).toEqual({ params: { pagina: 0, tamanho: 25, hospitalId: 'hospital-1' } }))
    expect(screen.getByTestId('where')).toHaveTextContent('hospitalId=hospital-1')
    expect(screen.getByRole('combobox', { name: 'Filtrar por setor' })).toBeEnabled()
    await waitFor(async () => expect(await listOptions(user, 'Filtrar por setor')).toEqual(['Todos os setores', 'UTI Adulto', 'Centro Cirúrgico']))
    await chooseOption(user, 'Filtrar por setor', 'Centro Cirúrgico')
    await waitFor(() => expect(lastListParams()).toEqual({ params: { pagina: 0, tamanho: 25, hospitalId: 'hospital-1', setorId: 'sector-9' } }))
    expect(screen.getByTestId('where')).toHaveTextContent('setorId=sector-9')
  })

  it('trocar o hospital limpa o setor escolhido', async () => {
    const user = userEvent.setup()
    renderAt('/work-orders?hospitalId=hospital-1&setorId=sector-9')
    await screen.findByText('OT-1001')
    expect(lastListParams()).toEqual({ params: { pagina: 0, tamanho: 25, hospitalId: 'hospital-1', setorId: 'sector-9' } })
    await chooseOption(user, 'Filtrar por hospital', 'Clínica Norte')
    await waitFor(() => expect(lastListParams()).toEqual({ params: { pagina: 0, tamanho: 25, hospitalId: 'hospital-2' } }))
  })

  it('ignora setor da URL quando não há hospital', async () => {
    renderAt('/work-orders?setorId=sector-9')
    await screen.findByText('OT-1001')
    expect(lastListParams()).toEqual({ params: { pagina: 0, tamanho: 25 } })
  })

  it('lê planoPreventivoId da URL, envia ao servidor e mostra o chip removível com o nome da rotina', async () => {
    const user = userEvent.setup()
    orders = [order({ planoPreventivoId: 'plan-1' })]
    renderAt('/work-orders?planoPreventivoId=plan-1')
    await screen.findByText('OT-1001')
    expect(lastListParams()).toEqual({ params: { pagina: 0, tamanho: 25, planoPreventivoId: 'plan-1' } })
    expect(await screen.findByText('Rotina: plano de EQ-01 · Bomba de infusão')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remover filtro de rotina' }))
    await waitFor(() => expect(lastListParams()).toEqual({ params: { pagina: 0, tamanho: 25 } }))
    expect(screen.queryByText(/^Rotina:/)).not.toBeInTheDocument()
    expect(screen.getByTestId('where')).not.toHaveTextContent('planoPreventivoId')
  })

  it('lê campanhaPreventivaId da URL e mostra o nome da campanha no chip', async () => {
    orders = [order({ campanhaPreventivaId: 'camp-1' })]
    renderAt('/work-orders?campanhaPreventivaId=camp-1')
    await screen.findByText('OT-1001')
    expect(lastListParams()).toEqual({ params: { pagina: 0, tamanho: 25, campanhaPreventivaId: 'camp-1' } })
    expect(await screen.findByText('Rotina: Preventiva semestral')).toBeInTheDocument()
    expect(screen.getByText('Campanha')).toBeInTheDocument()
  })

  it('"Limpar filtros" na lista vazia remove hospital, setor e rotina', async () => {
    const user = userEvent.setup()
    orders = []
    renderAt('/work-orders?hospitalId=hospital-1&campanhaPreventivaId=camp-1')
    expect(await screen.findByText('Nenhuma OT encontrada')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    await waitFor(() => expect(lastListParams()).toEqual({ params: { pagina: 0, tamanho: 25 } }))
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/work-orders$/)
  })

  it('OT sem responsável (campanha) aparece como "Sem responsável"', async () => {
    orders = [order({ tecnicoId: null, campanhaPreventivaId: 'camp-1' })]
    renderAt()
    await screen.findByText('OT-1001')
    expect(screen.getByText('Sem responsável')).toBeInTheDocument()
  })

  it('mantém erro com nova tentativa e vazio da lista', async () => {
    const user = userEvent.setup()
    let fail = true
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/ordens-de-trabalho' && fail) throw Object.assign(new Error('http'), { response: { status: 500, data: {} } })
      if (url === '/ordens-de-trabalho') return { data: [], headers: { 'x-total-count': '0' } } as never
      return { data: [] } as never
    })
    renderAt('/work-orders?hospitalId=hospital-1')
    expect(await screen.findByText('Não foi possível carregar as ordens de trabalho.')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Nenhuma OT encontrada')).toBeInTheDocument()
  })
})
