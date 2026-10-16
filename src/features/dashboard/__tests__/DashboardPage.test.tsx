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
vi.mock('../components/MtbfChart', () => ({ MtbfChart: () => null }))

const adminUser: UserProfileDTO = {
  id: 'user-admin',
  name: 'Ana Silva',
  email: 'ana@hospital.com.br',
  roles: ['admin_cliente'],
  tenantId: 'tenant-1',
}

function response() {
  return {
    tenant: { name: 'Hospital Exemplo', hospitalCount: 2 },
    kpis: {
      activeEquipment: { value: 1284, changePercent: 2.4 },
      openWorkOrders: { value: 47, newToday: 5 },
      emergencies: { value: 12, criticalOpen: 3 },
      availability: { percent: 97.4, weeklyChangePp: 0.8 },
      overdueSla: { count: 4 },
      overduePreventiveWorkOrders: { count: 7 },
      expiringDocuments: { count: 2, withinDays: 30 },
    },
    emergenciesBySeverity: [
      { severity: 'critical', count: 3 },
      { severity: 'high', count: 4 },
      { severity: 'medium', count: 3 },
      { severity: 'low', count: 2 },
    ],
    workOrdersByStatus: [
      { status: 'open', count: 16 },
      { status: 'inProgress', count: 19 },
      { status: 'completed', count: 8 },
      { status: 'overdue', count: 4 },
    ],
    mtbfBySector: [{ sector: 'UTI', hours: 320 }],
    recentTickets: [{
      id: 'CH-3391',
      equipmentName: 'Monitor multiparamétrico',
      hospitalName: 'Hospital Exemplo',
      sectorName: 'UTI',
      severity: 'critical',
      openedAt: '2026-10-15T15:30:00Z',
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
    expect(screen.getByText('Hospital Exemplo · 2 hospitais')).toBeInTheDocument()
    expect(screen.getByText('1.284')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Chamados recentes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CH-3391' })).toHaveAttribute('href', '/tickets/CH-3391')
    expect(screen.getByText('SLAs vencidos')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('apresenta o empty state para um agregado sem atividade', async () => {
    const empty = response()
    empty.kpis.activeEquipment.value = 0
    empty.kpis.openWorkOrders.value = 0
    empty.kpis.emergencies.value = 0
    empty.kpis.availability.percent = 0
    empty.kpis.overdueSla.count = 0
    empty.kpis.overduePreventiveWorkOrders.count = 0
    empty.kpis.expiringDocuments.count = 0
    empty.emergenciesBySeverity.forEach((entry) => { entry.count = 0 })
    empty.workOrdersByStatus.forEach((entry) => { entry.count = 0 })
    empty.mtbfBySector = []
    empty.recentTickets = []
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

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o dashboard')
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Hospital Exemplo · 2 hospitais')).toBeInTheDocument()
  })

  it('não renderiza como real uma resposta fora do contrato do agregado', async () => {
    get.mockResolvedValueOnce({ data: { kpis: {} } })
    setAuthSession('access-token', adminUser)
    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o dashboard')
    expect(screen.queryByText('1.284')).not.toBeInTheDocument()
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
