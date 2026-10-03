import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from '@/app/RequireRole'
import { ThemeProvider } from '@/app/theme-provider'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import type { UserProfileDTO } from '@/features/auth/types'
import { DashboardPage } from '../pages/DashboardPage'

vi.mock('../components/WorkOrdersChart', () => ({ WorkOrdersChart: () => null }))
vi.mock('../components/MtbfChart', () => ({ MtbfChart: () => null }))

const adminUser: UserProfileDTO = {
  id: 'user-admin',
  name: 'Ana Silva',
  email: 'ana@hospital.com.br',
  roles: ['admin_cliente'],
  tenantId: 'tenant-1',
}

let unmountDashboard: (() => void) | undefined

function renderDashboard(state: 'default' | 'loading' | 'empty' | 'error' = 'default') {
  const view = render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<h1>Login</h1>} />
          <Route path="/platform/clients" element={<h1>Dashboard da plataforma</h1>} />
          <Route path="/field" element={<h1>Dashboard técnico</h1>} />
          <Route
            path="/dashboard"
            element={(
              <RequireRole>
                <DashboardPage state={state} />
              </RequireRole>
            )}
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
  unmountDashboard = view.unmount
  return view
}

describe('DashboardPage', () => {
  afterEach(() => {
    unmountDashboard?.()
    unmountDashboard = undefined
    clearAuthSession()
    vi.restoreAllMocks()
  })

  it('redireciona para login quando não há sessão autenticada', async () => {
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('exibe o perfil do usuário autenticado na sidebar', () => {
    setAuthSession('access-token', { ...adminUser, roles: ['tecnico'] })
    renderDashboard()

    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    expect(screen.getByText('Técnico')).toBeInTheDocument()
    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  it('mostra os indicadores e chamados demonstrativos para admin_cliente', () => {
    setAuthSession('access-token', adminUser)
    renderDashboard()

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Ana Silva')).toBeInTheDocument()
    expect(screen.getByText('Admin do Cliente')).toBeInTheDocument()
    expect(screen.getByText('Grupo Vitale Saúde · 2 hospitais')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Indicadores operacionais' })).toBeInTheDocument()
    expect(screen.getByText('Equipamentos ativos')).toBeInTheDocument()
    expect(screen.getByText('1.284')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Chamados recentes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'CH-3391' })).toHaveAttribute('href', '/tickets/CH-3391')
  })

  it('expõe os estados de loading, empty e error', () => {
    setAuthSession('access-token', adminUser)
    const { rerender } = renderDashboard('loading')

    expect(screen.getByLabelText('Carregando dashboard')).toHaveAttribute('aria-busy', 'true')

    rerender(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage state="empty" />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    )
    expect(screen.getByRole('heading', { name: 'Ainda não há dados para exibir' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cadastrar equipamento' })).toHaveAttribute('href', '/assets/new')
    expect(screen.getByRole('link', { name: 'Exportar relatório' })).toHaveAttribute('href', '/reports/export')

    rerender(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage state="error" />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar o dashboard')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('filtra os chamados pela pesquisa global', async () => {
    const user = userEvent.setup()
    setAuthSession('access-token', adminUser)
    renderDashboard()
    const search = screen.getByRole('searchbox', { name: 'Buscar equipamento, OT ou chamado' })

    await user.type(search, 'CH-3391')

    expect(screen.getByRole('link', { name: 'CH-3391' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'CH-3390' })).not.toBeInTheDocument()
  })

  it('abre notificações ancoradas e oferece os três modos de tema', async () => {
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
