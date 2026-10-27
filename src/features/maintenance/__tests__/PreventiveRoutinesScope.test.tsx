import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { chooseOption } from '@/test/select-helpers'
import { PreventiveRoutinesPage } from '../pages/PreventiveRoutinesPage'
import type { Campaign } from '../types/campaigns'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) => <main><h1>{title}</h1>{action}{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const plan = (id: string, equipamentoId: string, extra: Record<string, unknown> = {}) => ({
  id, equipamentoId, checklistId: 'checklist-1', tecnicoPadraoId: 'tech-1', intervaloDias: 30, dataAncora: '2026-01-05', proximaData: '2026-12-01',
  ativo: true, pendencia: false, createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z', otsGeradas: 4, otsConcluidas: 1, proximaExecucao: '2026-11-20', ...extra,
})
const campaign = (id: string, nome: string, extra: Partial<Campaign> = {}): Campaign => ({
  id, hospitalId: 'hospital-1', nome, setorIds: [], categoriaIds: [], dataInicio: '2026-10-01', dataFim: null, recorrencia: 'meses', intervalo: 6, proximaData: '2026-11-10',
  modoAtribuicao: 'equilibrado', tecnicoId: null, status: 'concluida', ativa: true, janelaAtual: '2026-10-01',
  execucao: { totalEquipamentos: 10, processadas: 10, geradas: 8, puladas: 0, pendencias: 2 },
  ots: { total: 8, agendadas: 3, emExecucao: 1, concluidas: 4, canceladas: 0, atrasadas: 0 },
  pendenciasDetalhe: [], criadaEm: '2026-10-01T10:00:00Z', canceladaEm: null, ...extra,
})

let planItems: unknown[] = []
let planTotal = 0
let campaignItems: Campaign[] = []

function mockApi() {
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/planos-preventivos') return { data: planItems, headers: { 'x-total-count': String(planTotal) } } as never
    if (url === '/campanhas-preventivas') return { data: campaignItems } as never
    if (url === '/equipamentos') return { data: [{ id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-01', nome: 'Bomba de infusão' }, { id: 'equipment-2', setorId: 'sector-1', codigo: 'EQ-02', nome: 'Monitor' }] } as never
    if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }, { id: 'hospital-2', nome: 'Clínica Norte', cnpj: '' }] } as never
    if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'UTI', nome: 'UTI Adulto' }, { id: 'sector-9', hospitalId: 'hospital-1', codigo: 'CC', nome: 'Centro Cirúrgico' }] } as never
    if (url === '/hospitais/hospital-2/setores') return { data: [{ id: 'sector-2', hospitalId: 'hospital-2', codigo: 'EM', nome: 'Emergência' }] } as never
    if (url === '/users') return { data: [{ id: 'tech-1', codigo: 'T-1', nome: 'Rafael', email: 'r@test', role: 'tecnico', ativo: true }] } as never
    if (url === '/users/tech-1/hospitais') return { data: ['hospital-1'] } as never
    if (url === '/checklists') return { data: [{ id: 'checklist-1', hospitalId: null, nome: 'Inspeção geral', ativo: true }] } as never
    return { data: [] } as never
  })
}

function Where() { const location = useLocation(); return <div data-testid="where">{location.pathname}{location.search}</div> }
function renderAt(entry = '/work-orders/rotinas') {
  function Providers({ children }: PropsWithChildren) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }))
    return <QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter></QueryClientProvider>
  }
  return render(<Routes><Route path="/work-orders/rotinas" element={<PreventiveRoutinesPage />} /><Route path="*" element={<Where />} /></Routes>, { wrapper: Providers })
}
const rowOf = (text: string | RegExp) => screen.getAllByRole('row').find((row) => within(row).queryByText(text)) as HTMLElement
const callsTo = (url: string) => vi.mocked(apiClient.get).mock.calls.filter(([path]) => path === url)
const httpError = (status: number, data: Record<string, unknown> = {}) => Object.assign(new Error('http'), { response: { status, data } })

describe('PreventiveRoutinesPage: escopos, progresso e links para as OTs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    planItems = [plan('plan-1', 'equipment-1')]
    planTotal = 1
    campaignItems = [
      campaign('camp-hospital', 'Preventiva do parque'),
      campaign('camp-setor', 'Preventiva da UTI', { setorIds: ['sector-1'], proximaData: '2026-11-05', status: 'processando', ots: { total: 6, agendadas: 5, emExecucao: 0, concluidas: 1, canceladas: 0, atrasadas: 0 } }),
    ]
    mockApi()
  })

  it('em Todos mostra planos e campanhas juntos, ordenados pela próxima execução, com escopo, progresso e situação', async () => {
    renderAt()
    await screen.findByText('Preventiva da UTI')
    await screen.findByText('Bomba de infusão')
    const names = screen.getAllByRole('row').slice(1).map((row) => within(row).queryByText(/^(Preventiva da UTI|Preventiva do parque|Bomba de infusão)$/)?.textContent)
    expect(names).toEqual(['Preventiva da UTI', 'Preventiva do parque', 'Bomba de infusão'])

    const sector = rowOf('Preventiva da UTI')
    expect(within(sector).getByText('Setor')).toBeInTheDocument()
    expect(await within(sector).findByText('Santa Casa · UTI Adulto')).toBeInTheDocument()
    expect(within(sector).getByText('05/11/2026')).toBeInTheDocument()
    expect(within(sector).getByText('Em execução')).toBeInTheDocument()
    expect(within(sector).getByText('1/6 concluídas')).toBeInTheDocument()

    const hospital = rowOf('Preventiva do parque')
    expect(within(hospital).getByText('Hospital')).toBeInTheDocument()
    expect(within(hospital).getByText('Ativa')).toBeInTheDocument()
    expect(within(hospital).getByText('4/8 concluídas')).toBeInTheDocument()

    const equipment = rowOf('Bomba de infusão')
    expect(within(equipment).getByText('Equipamento')).toBeInTheDocument()
    expect(within(equipment).getByText('20/11/2026')).toBeInTheDocument() // proximaExecucao, não a proximaData (01/12)
    expect(within(equipment).getByText('1/4 concluídas')).toBeInTheDocument()
    expect(within(equipment).getByRole('progressbar', { name: 'Progresso de Bomba de infusão' })).toHaveAttribute('aria-valuenow', '1')
  })

  it('avisa quando a lista de planos está paginada em Todos', async () => {
    planTotal = 60
    renderAt()
    expect(await screen.findByText(/A paginação vale para os planos de equipamento/)).toBeInTheDocument()
  })

  it('filtro de escopo Setor lista só campanhas de setor, sem consultar planos, e Hospital as de hospital', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Bomba de infusão')
    await chooseOption(user, 'Filtrar por escopo', 'Setor')
    await waitFor(() => expect(screen.queryByText('Bomba de infusão')).not.toBeInTheDocument())
    expect(screen.getByText('Preventiva da UTI')).toBeInTheDocument()
    expect(screen.queryByText('Preventiva do parque')).not.toBeInTheDocument()
    const planCallsBefore = callsTo('/planos-preventivos').length
    await chooseOption(user, 'Filtrar por escopo', 'Hospital')
    expect(await screen.findByText('Preventiva do parque')).toBeInTheDocument()
    expect(screen.queryByText('Preventiva da UTI')).not.toBeInTheDocument()
    expect(callsTo('/planos-preventivos')).toHaveLength(planCallsBefore)
  })

  it('escopo Equipamento pagina no servidor e não consulta campanhas', async () => {
    planTotal = 45
    renderAt('/work-orders/rotinas?escopo=equipamento')
    expect(await screen.findByText('Mostrando 1–25 de 45')).toBeInTheDocument()
    expect(screen.queryByText('Preventiva da UTI')).not.toBeInTheDocument()
    expect(callsTo('/campanhas-preventivas')).toHaveLength(0)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Próxima página' }))
    await waitFor(() => expect(callsTo('/planos-preventivos').at(-1)?.[1]).toEqual({ params: { pagina: 1, tamanho: 25, ativo: true } }))
  })

  it('pagina as campanhas no cliente nos escopos Setor e Hospital', async () => {
    campaignItems = Array.from({ length: 12 }, (_, index) => campaign(`camp-${index}`, `Campanha ${String(index + 1).padStart(2, '0')}`, { proximaData: `2026-11-${String(index + 1).padStart(2, '0')}` }))
    const user = userEvent.setup()
    renderAt('/work-orders/rotinas?escopo=hospital&tamanho=10')
    expect(await screen.findByText('Mostrando 1–10 de 12')).toBeInTheDocument()
    expect(screen.getByText('Campanha 10')).toBeInTheDocument()
    expect(screen.queryByText('Campanha 11')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(await screen.findByText('Mostrando 11–12 de 12')).toBeInTheDocument()
    expect(screen.getByText('Campanha 11')).toBeInTheDocument()
  })

  it('Ver OTs de um plano leva à lista de OTs com planoPreventivoId', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Bomba de infusão')
    await user.click(within(rowOf('Bomba de infusão')).getByRole('link', { name: 'Ver OTs de Bomba de infusão' }))
    expect(await screen.findByTestId('where')).toHaveTextContent('/work-orders?planoPreventivoId=plan-1')
  })

  it('Ver OTs de uma campanha usa campanhaPreventivaId', async () => {
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('Preventiva do parque')
    await user.click(within(rowOf('Preventiva do parque')).getByRole('link', { name: 'Ver OTs de Preventiva do parque' }))
    expect(await screen.findByTestId('where')).toHaveTextContent('/work-orders?campanhaPreventivaId=camp-hospital')
  })

  it('situação normalizada: campanha cancelada, falhou e concluída sem repetição, plano inativo', async () => {
    campaignItems = [
      campaign('c1', 'Camp cancelada', { status: 'cancelada', ativa: false, proximaData: null }),
      campaign('c2', 'Camp falhou', { status: 'falhou' }),
      campaign('c3', 'Camp avulsa concluída', { recorrencia: 'avulsa', intervalo: null, ativa: false, proximaData: null }),
    ]
    planItems = [plan('plan-9', 'equipment-2', { ativo: false })]
    renderAt('/work-orders/rotinas?status=todos')
    await screen.findByText('Camp cancelada')
    expect(within(rowOf('Camp cancelada')).getByText('Cancelada')).toBeInTheDocument()
    expect(within(rowOf('Camp falhou')).getByText('Falhou')).toBeInTheDocument()
    expect(within(rowOf('Camp avulsa concluída')).getByText('Concluída')).toBeInTheDocument()
    expect(within(await screen.findByRole('row', { name: /Monitor/ })).getByText('Inativa')).toBeInTheDocument()
  })

  it('situação padrão Ativas esconde campanhas canceladas e Inativas as mostra', async () => {
    campaignItems = [campaign('c1', 'Camp cancelada', { status: 'cancelada', ativa: false, proximaData: null }), campaign('c2', 'Camp ativa')]
    const user = userEvent.setup()
    renderAt('/work-orders/rotinas?escopo=hospital')
    await screen.findByText('Camp ativa')
    expect(screen.queryByText('Camp cancelada')).not.toBeInTheDocument()
    await chooseOption(user, 'Filtrar por situação', 'Inativas')
    expect(await screen.findByText('Camp cancelada')).toBeInTheDocument()
    expect(screen.queryByText('Camp ativa')).not.toBeInTheDocument()
  })

  it('erro nas campanhas mostra nova tentativa que recarrega', async () => {
    const user = userEvent.setup()
    let fail = true
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/campanhas-preventivas' && fail) throw httpError(500)
      if (url === '/campanhas-preventivas') return { data: campaignItems } as never
      return { data: [], headers: { 'x-total-count': '0' } } as never
    })
    renderAt('/work-orders/rotinas?escopo=hospital')
    expect(await screen.findByText('Não foi possível carregar as rotinas preventivas.')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Preventiva do parque')).toBeInTheDocument()
  })

  it('403 nas campanhas mostra acesso negado sem nova tentativa', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/campanhas-preventivas') throw httpError(403, { code: 'ACESSO_NEGADO' })
      return { data: [], headers: { 'x-total-count': '0' } } as never
    })
    renderAt('/work-orders/rotinas?escopo=setor')
    expect(await screen.findByText(/Acesso não permitido\. Apenas o administrador do cliente/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  describe('Nova rotina', () => {
    it('Equipamento recorrente abre o formulário de plano existente', async () => {
      const user = userEvent.setup()
      renderAt()
      await screen.findByText('Bomba de infusão')
      await user.click(screen.getByRole('button', { name: 'Nova rotina' }))
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      expect(await screen.findByRole('dialog', { name: 'Novo plano preventivo' })).toBeInTheDocument()
    })

    it('Equipamento avulsa leva ao agendamento de OT preventiva', async () => {
      const user = userEvent.setup()
      renderAt()
      await screen.findByText('Bomba de infusão')
      await user.click(screen.getByRole('button', { name: 'Nova rotina' }))
      await user.click(screen.getByRole('radio', { name: 'Avulsa (agendar uma OT)' }))
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      expect(await screen.findByTestId('where')).toHaveTextContent('/work-orders/new')
    })

    it('Hospital abre o fluxo de campanha com o hospital pré-selecionado', async () => {
      const user = userEvent.setup()
      renderAt()
      await screen.findByText('Bomba de infusão')
      await user.click(screen.getByRole('button', { name: 'Nova rotina' }))
      await user.click(screen.getByRole('radio', { name: 'Hospital' }))
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled()
      await chooseOption(user, 'Hospital', 'Clínica Norte')
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      expect(await screen.findByTestId('where')).toHaveTextContent('/work-orders/campanhas/new?hospitalId=hospital-2')
    })

    it('Setor exige hospital e setor e abre a campanha com os dois pré-selecionados', async () => {
      const user = userEvent.setup()
      renderAt()
      await screen.findByText('Bomba de infusão')
      await user.click(screen.getByRole('button', { name: 'Nova rotina' }))
      await user.click(screen.getByRole('radio', { name: 'Setor' }))
      expect(screen.getByRole('combobox', { name: 'Setor' })).toBeDisabled()
      await chooseOption(user, 'Hospital', 'Santa Casa')
      await chooseOption(user, 'Setor', 'CC · Centro Cirúrgico')
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      expect(await screen.findByTestId('where')).toHaveTextContent('/work-orders/campanhas/new?hospitalId=hospital-1&setorId=sector-9')
    })
  })
})
