import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from '@/app/RequireRole'
import { apiClient } from '@/lib/axios'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar'
import { SlaPolicyPage } from '../pages/SlaPolicyPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))

const initialPolicy = [
  { severidade: 'CRITICA', atendimentoMin: 15, resolucaoMin: 240, padrao: true },
  { severidade: 'ALTA', atendimentoMin: 30, resolucaoMin: 480, padrao: true },
  { severidade: 'MEDIA', atendimentoMin: 120, resolucaoMin: 1440, padrao: true },
  { severidade: 'BAIXA', atendimentoMin: 480, resolucaoMin: 4320, padrao: true },
]

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function renderSlaRoute() {
  return render(<TestProviders><MemoryRouter initialEntries={['/settings/sla']}><Routes>
    <Route path="/settings/sla" element={<RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><SlaPolicyPage /></RequireRole>} />
    <Route path="/access-denied" element={<h1>Acesso não permitido</h1>} />
  </Routes></MemoryRouter></TestProviders>)
}

describe('SlaPolicyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockResolvedValue({ data: initialPolicy } as never)
    vi.mocked(apiClient.put).mockResolvedValue({ data: initialPolicy.map((entry, index) => index === 0 ? { ...entry, atendimentoMin: 60, padrao: false } : entry) } as never)
  })

  afterEach(() => clearAuthSession())

  it('loads server defaults and displays all severities in urgency order', async () => {
    renderSlaRoute()
    expect(screen.getByLabelText('Carregando política de SLA')).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByRole('spinbutton', { name: 'Prazo de atendimento, Crítica' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Política de SLA' })).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/sla/politica')
    expect(screen.getByText('Crítica')).toBeInTheDocument()
    expect(screen.getByText('Alta')).toBeInTheDocument()
    expect(screen.getByText('Média')).toBeInTheDocument()
    expect(screen.getByText('Baixa')).toBeInTheDocument()
    expect(screen.getAllByText('Padrão do sistema')).toHaveLength(4)
    expect(screen.getByRole('spinbutton', { name: 'Prazo de atendimento, Crítica' })).toHaveValue(15)
    expect(screen.getByRole('combobox', { name: 'Unidade da resolução, Crítica' })).toHaveValue('h')
    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Política de SLA' })).toHaveAttribute('href', '/settings/sla')
  })

  it('accepts hour units, converts to minutes, saves all severities and explains future-only effect', async () => {
    const user = userEvent.setup()
    renderSlaRoute()
    await screen.findByRole('spinbutton', { name: 'Prazo de atendimento, Crítica' })
    await user.clear(screen.getByRole('spinbutton', { name: 'Prazo de atendimento, Crítica' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Prazo de atendimento, Crítica' }), '1')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Unidade do atendimento, Crítica' }), 'h')
    await user.click(screen.getByRole('button', { name: 'Salvar política' }))

    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/sla/politica', [
      { severidade: 'CRITICA', atendimentoMin: 60, resolucaoMin: 240 },
      { severidade: 'ALTA', atendimentoMin: 30, resolucaoMin: 480 },
      { severidade: 'MEDIA', atendimentoMin: 120, resolucaoMin: 1440 },
      { severidade: 'BAIXA', atendimentoMin: 480, resolucaoMin: 4320 },
    ]))
    expect(await screen.findByRole('status')).toHaveTextContent('vale apenas para chamados abertos a partir de agora')
    expect(screen.getByText('Personalizado')).toBeInTheDocument()
  })

  it('rejects zero and resolution shorter than service before calling the API', async () => {
    const user = userEvent.setup()
    renderSlaRoute()
    const service = await screen.findByRole('spinbutton', { name: 'Prazo de atendimento, Crítica' })
    const resolution = screen.getByRole('spinbutton', { name: 'Prazo de resolução, Crítica' })
    await user.clear(service)
    await user.type(service, '0')
    expect(await screen.findByText('Informe um prazo maior que zero.')).toBeInTheDocument()
    await user.clear(service)
    await user.type(service, '30')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Unidade da resolução, Crítica' }), 'min')
    await user.clear(resolution)
    await user.type(resolution, '10')
    expect(await screen.findByText('A resolução deve ser igual ou maior que o atendimento.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar política' })).toBeDisabled()
    expect(apiClient.put).not.toHaveBeenCalled()
  })

  it.each([['tecnico'], ['interno_hospital'], ['super_admin']] as const)('denies the %s role and hides the SLA menu item', async (role) => {
    setAuthSession('token', { id: 'other-1', name: 'Usuário', roles: [role], tenantId: 'tenant-1' })
    renderSlaRoute()
    expect(await screen.findByRole('heading', { name: 'Acesso não permitido' })).toBeInTheDocument()
    expect(apiClient.get).not.toHaveBeenCalled()
    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Política de SLA' })).not.toBeInTheDocument()
  })
})
