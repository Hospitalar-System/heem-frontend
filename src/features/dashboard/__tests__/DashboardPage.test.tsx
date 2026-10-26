import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
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
    get.mockResolvedValue({ data: response() })
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
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
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
