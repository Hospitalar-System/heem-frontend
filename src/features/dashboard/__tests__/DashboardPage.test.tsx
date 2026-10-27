import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from '@/app/RequireRole'
import { ThemeProvider } from '@/app/theme-provider'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import type { UserProfileDTO } from '@/features/auth/types'
import { DashboardPage } from '../pages/DashboardPage'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/lib/axios', () => ({ apiClient: { get } }))
vi.mock('../components/WorkOrdersChart', () => ({ WorkOrdersChart: () => null }))

const adminUser: UserProfileDTO = {
  id: 'user-admin',
  name: 'Ana Silva',
  email: 'ana@hospital.com.br',
  roles: ['admin_cliente'],
  tenantId: 'tenant-1',
}

function response() {
  return {
    agendadas: 2,
    emExecucao: 1,
    concluidas: 4,
    canceladas: 1,
    equipamentosAtivos: 1284,
    chamadosAbertosPorSeveridade: { BAIXA: 0, MEDIA: 1, ALTA: 1, CRITICA: 1 },
    chamadosSlaVencido: 4,
    disponibilidadePercentual: 77.68,
    otsPreventivasAtrasadas: 7,
    documentosVencendo30d: 2,
    chamadosRecentes: [{
      id: 'ticket-uuid-5',
      codigo: 'CH-5',
      hospitalId: 'h-1',
      equipamentoId: 'e-1',
      severidade: 'alta',
      status: 'aberto',
      abertoEm: '2026-10-03T22:07:46.304410Z',
      slaStatus: null,
    }],
  }
}

function indicators() {
  return { mttaHoras: 1.5, mttrHoras: 12.25, mtbfHoras: 340, severidadesConsideradas: [] }
}

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/login" element={<h1>Login</h1>} />
            <Route path="/platform/clients" element={<h1>Dashboard da plataforma</h1>} />
            <Route path="/field" element={<h1>Dashboard técnico</h1>} />
            <Route path="/dashboard" element={<RequireRole role="admin_cliente"><DashboardPage /></RequireRole>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    clearAuthSession()
    get.mockReset()
    get.mockImplementation(async (path: string) => ({ data: path === '/relatorios/indicadores' ? indicators() : response() }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('redireciona para login quando não há sessão autenticada', async () => {
    renderDashboard()
    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('permite acesso ao admin_cliente e carrega o agregado do backend', async () => {
    setAuthSession('access-token', adminUser)
    renderDashboard()

    expect(screen.getByLabelText('Carregando dashboard')).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByRole('region', { name: 'Indicadores operacionais' })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('/relatorios/dashboard')
    expect(screen.getByText('1.284')).toBeInTheDocument()
    expect(screen.getByText('77,68%')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Chamados recentes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CH-5' })).toHaveAttribute('href', '/tickets/ticket-uuid-5')
    expect(screen.getByText('SLAs vencidos')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('mostra MTTA, MTTR e MTBF dos últimos 30 dias com ajuda acessível', async () => {
    setAuthSession('access-token', adminUser)
    renderDashboard()
    const section = await screen.findByRole('region', { name: 'Tempos de manutenção' })
    await waitFor(() => expect(within(section).getByText('340 h')).toBeInTheDocument())
    expect(within(section).getByText('1,5 h')).toBeInTheDocument()
    expect(within(section).getByText('12,3 h')).toBeInTheDocument()
    const call = get.mock.calls.find(([path]) => path === '/relatorios/indicadores')
    expect(call?.[1].params.desde).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/)
    expect(call?.[1].params.ate).toMatch(/T23:59:59.999Z$/)
    const help = within(section).getByRole('button', { name: 'O que é MTBF' })
    expect(help).toHaveAttribute('aria-describedby', 'dashboard-mtbfHoras-hint')
    expect(within(section).getAllByRole('tooltip')[2]).toHaveTextContent('Tempo médio entre falhas')
  })

  it('indica sem dados no período quando o indicador é nulo', async () => {
    get.mockImplementation(async (path: string) => ({ data: path === '/relatorios/indicadores' ? { ...indicators(), mtbfHoras: null } : response() }))
    setAuthSession('access-token', adminUser)
    renderDashboard()
    const section = await screen.findByRole('region', { name: 'Tempos de manutenção' })
    await waitFor(() => expect(within(section).getByText('Sem dados no período')).toBeInTheDocument())
  })

  it('falha dos indicadores não derruba o restante do painel e permite tentar de novo', async () => {
    const user = userEvent.setup()
    let fail = true
    get.mockImplementation(async (path: string) => {
      if (path === '/relatorios/indicadores') {
        if (fail) throw new Error('falha')
        return { data: indicators() }
      }
      return { data: response() }
    })
    setAuthSession('access-token', adminUser)
    renderDashboard()
    expect(await screen.findByText('1.284')).toBeInTheDocument()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível carregar MTTA, MTTR e MTBF')
    fail = false
    await user.click(within(alert).getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('340 h')).toBeInTheDocument()
  })

  it('torna o cartão de documentos vencendo um atalho para a lista filtrada', async () => {
    setAuthSession('access-token', adminUser)
    renderDashboard()
    const link = await screen.findByRole('link', { name: /Documentos vencendo em 30 dias/ })
    expect(link).toHaveAttribute('href', '/assets?documentos=vencendo')
    link.focus()
    expect(link).toHaveFocus()
    expect(screen.queryByRole('link', { name: /SLAs vencidos/ })).not.toBeInTheDocument()
  })

  it('apresenta o empty state para um agregado sem atividade', async () => {
    const empty = { agendadas: 0, emExecucao: 0, concluidas: 0, canceladas: 0, equipamentosAtivos: 0, chamadosAbertosPorSeveridade: {}, chamadosSlaVencido: 0, disponibilidadePercentual: null, otsPreventivasAtrasadas: 0, documentosVencendo30d: 0, chamadosRecentes: [] }
    get.mockResolvedValueOnce({ data: empty })
    setAuthSession('access-token', adminUser)
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Ainda não há dados para exibir' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cadastrar equipamento' })).toHaveAttribute('href', '/assets/new')
  })

  it('mostra erro de contrato/API e tenta novamente sem recarregar a página', async () => {
    const user = userEvent.setup()
    get.mockRejectedValueOnce(new Error('falha de rede')).mockResolvedValueOnce({ data: response() })
    setAuthSession('access-token', adminUser)
    renderDashboard()

    const networkAlert = await screen.findByRole('alert')
    expect(networkAlert).toHaveTextContent('Não foi possível carregar o dashboard')
    expect(networkAlert).toHaveTextContent('Verifique sua conexão')
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(get.mock.calls.filter(([path]) => path === '/relatorios/dashboard')).toHaveLength(2))
    expect(await screen.findByText('1.284')).toBeInTheDocument()
  })

  it('não renderiza como real uma resposta fora do contrato do agregado', async () => {
    get.mockResolvedValueOnce({ data: { kpis: {} } })
    setAuthSession('access-token', adminUser)
    renderDashboard()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível carregar o dashboard')
    expect(alert).toHaveTextContent('formato que o painel ainda não reconhece')
    expect(screen.queryByText('1.284')).not.toBeInTheDocument()
  })

  it('não quebra com campos nulos, ausentes ou desconhecidos', async () => {
    get.mockResolvedValueOnce({ data: { equipamentosAtivos: 3, disponibilidadePercentual: null, chamadosRecentes: [{ id: 'x', codigo: null, severidade: 'desconhecida', slaStatus: 'novo' }], campoNovo: true } })
    setAuthSession('access-token', adminUser)
    renderDashboard()

    expect(await screen.findByRole('region', { name: 'Indicadores operacionais' })).toBeInTheDocument()
    expect(screen.getByText('Disponibilidade')).toBeInTheDocument()
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'x' })).toHaveAttribute('href', '/tickets/x')
  })

  it('abre notificações indisponíveis e oferece os três modos de tema', async () => {
    const user = userEvent.setup()
    setAuthSession('access-token', adminUser)
    renderDashboard()

    await user.click(screen.getByRole('button', { name: 'Notificações' }))
    expect(screen.getByRole('dialog', { name: 'Notificações' })).toBeInTheDocument()
    expect(screen.getByText('Notificações indisponíveis')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Selecionar tema' }))
    expect(screen.getByRole('menuitemradio', { name: 'Claro' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: 'Escuro' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: 'Automático' })).toBeInTheDocument()
  })
})
