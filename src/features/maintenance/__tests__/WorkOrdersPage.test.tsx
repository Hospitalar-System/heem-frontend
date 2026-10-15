import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { WorkOrdersPage } from '../pages/WorkOrdersPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

const orders = [{ id: 'ot-1', codigo: 'OT-1001', tipo: 'PREVENTIVA', status: 'AGENDADA', equipamentoId: 'equipment-1', checklistId: 'checklist-1', tecnicoId: 'tech-1', local: null, dataAgendada: '2026-10-20T13:00:00Z', iniciadaEm: null, concluidaEm: null, atrasada: true, planoPreventivoId: 'plan-1' }]

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/work-orders']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/work-orders" element={children} /><Route path="/work-orders/:id" element={<RouteLocation />} /></Routes></MemoryRouter></QueryClientProvider>
}
function RouteLocation() { const location = useLocation(); return <div data-testid="current-route">{location.pathname}</div> }

describe('WorkOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/ordens-de-trabalho') return { data: orders } as never
      if (url === '/equipamentos') return { data: [{ id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-01', nome: 'Bomba de infusão' }] } as never
      if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }] } as never
      if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'UTI', nome: 'UTI Adulto' }] } as never
      if (url === '/users') return { data: [
        { id: 'tech-1', codigo: 'T-1', nome: 'Rafael', email: 'rafael@test', role: 'tecnico', ativo: true },
        { id: 'tech-2', codigo: 'T-2', nome: 'Marina', email: 'marina@test', role: 'tecnico', ativo: true },
      ] } as never
      if (url === '/users/tech-1/hospitais') return { data: ['hospital-1'] } as never
      if (url === '/users/tech-2/hospitais') return { data: ['hospital-2'] } as never
      if (url === '/checklists') return { data: [{ id: 'checklist-1', nome: 'Inspeção preventiva', ativo: true }] } as never
      return { data: [] } as never
    })
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ...orders[0], id: 'ot-new', codigo: 'OT-NEW' } } as never)
  })

  it('lists API work orders, applies filters, and links to the order detail', async () => {
    const user = userEvent.setup()
    render(<WorkOrdersPage />, { wrapper: TestProviders })
    expect(await screen.findByText('OT-1001')).toBeInTheDocument()
    expect(screen.getByText('Bomba de infusão')).toBeInTheDocument()
    expect(screen.getAllByText('Agendada')).toHaveLength(2)
    expect(screen.getByText('Atrasada')).toBeInTheDocument()
    expect(screen.getByText('Plano preventivo')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Atrasadas' }))
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/ordens-de-trabalho', { params: { atrasadas: true } }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por tipo' }), 'CORRETIVA')
    expect(await screen.findByText('Nenhuma OT encontrada')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    await user.click(screen.getByRole('link', { name: 'OT-1001' }))
    expect(await screen.findByTestId('current-route')).toHaveTextContent('/work-orders/ot-1')
  })

  it('creates a preventive order using only a technician linked to the equipment hospital', async () => {
    const user = userEvent.setup()
    render(<WorkOrdersPage />, { wrapper: TestProviders })
    await user.click(await screen.findByRole('button', { name: 'Nova OT' }))
    await user.type(screen.getByRole('textbox', { name: 'Código da OT' }), 'OT-2042')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Equipamento' }), 'equipment-1')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Checklist preventivo' }), 'checklist-1')
    const technicianSelect = screen.getByRole('combobox', { name: 'Técnico responsável' })
    await waitFor(() => expect(withinOptions(technicianSelect)).toEqual(['Selecione um técnico', 'Rafael']))
    await user.selectOptions(technicianSelect, 'tech-1')
    await user.type(screen.getByLabelText('Data agendada'), '2026-10-22T10:30')
    await user.click(screen.getByRole('button', { name: 'Agendar OT' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/ordens-de-trabalho/preventivas', {
      codigo: 'OT-2042', equipamentoId: 'equipment-1', checklistId: 'checklist-1', tecnicoId: 'tech-1', dataAgendada: new Date('2026-10-22T10:30').toISOString(),
    }))
  })
})

function withinOptions(select: HTMLElement) {
  return Array.from((select as HTMLSelectElement).options).map((option) => option.textContent)
}
