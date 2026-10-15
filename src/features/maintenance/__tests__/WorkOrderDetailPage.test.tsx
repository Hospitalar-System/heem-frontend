import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { WorkOrderDetailPage } from '../pages/WorkOrderDetailPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

const order = {
  id: 'order-1', codigo: 'OT-2041', tipo: 'PREVENTIVA', status: 'EM_EXECUCAO', equipamentoId: 'equipment-1',
  checklistId: 'checklist-1', tecnicoId: 'tech-1', chamadoId: null, local: 'UTI Adulto',
  dataAgendada: '2026-10-12T13:00:00Z', iniciadaEm: '2026-10-12T13:15:00Z', concluidaEm: null,
}

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/work-orders/order-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/work-orders/:id" element={children} /><Route path="/work-orders" element={<p>Lista de ordens</p>} /></Routes></MemoryRouter></QueryClientProvider>
}

describe('WorkOrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/ordens-de-trabalho/order-1') return { data: order } as never
      if (url === '/checklists/checklist-1/itens') return { data: [
        { id: 'item-1', descricao: 'Conferir alimentação elétrica', obrigatorio: true, concluido: true, ordem: 1 },
        { id: 'item-2', descricao: 'Verificar alarmes', obrigatorio: true, concluido: false, ordem: 2 },
      ] } as never
      if (url === '/equipamentos/equipment-1') return { data: { id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-10', nome: 'Bomba de infusão' } } as never
      if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Hospital Central', cnpj: '' }] } as never
      if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'UTI', nome: 'UTI Adulto' }] } as never
      if (url === '/users') return { data: [
        { id: 'tech-1', nome: 'Rafael', role: 'tecnico', ativo: true },
        { id: 'tech-2', nome: 'Marina', role: 'tecnico', ativo: true },
        { id: 'tech-3', nome: 'Paulo', role: 'tecnico', ativo: true },
      ] } as never
      if (url === '/users/tech-1/hospitais') return { data: ['hospital-1'] } as never
      if (url === '/users/tech-2/hospitais') return { data: ['hospital-1'] } as never
      if (url === '/users/tech-3/hospitais') return { data: ['hospital-2'] } as never
      return { data: [] } as never
    })
    vi.mocked(apiClient.put).mockResolvedValue({ data: { ...order, tecnicoId: 'tech-2' } } as never)
  })

  it('shows API details, checklist progress when execution values exist, and unavailable areas without fabricated data', async () => {
    render(<WorkOrderDetailPage />, { wrapper: TestProviders })
    expect(await screen.findByRole('heading', { name: 'OT-2041' })).toBeInTheDocument()
    expect(screen.getByTitle('EQ-10 · Bomba de infusão')).toBeInTheDocument()
    expect(screen.getByText('Hospital Central · UTI Adulto')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progresso do checklist' })).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByText('50% concluído')).toBeInTheDocument()
    expect(screen.getByText(/não disponibiliza uma consulta de medições/)).toBeInTheDocument()
    expect(screen.getByText(/não disponibiliza o histórico de transições/)).toBeInTheDocument()
  })

  it('reassigns to a technician linked to the equipment hospital and sends no status field', async () => {
    const user = userEvent.setup()
    render(<WorkOrderDetailPage />, { wrapper: TestProviders })
    await user.click(await screen.findByRole('button', { name: 'Reatribuir técnico' }))
    const technician = screen.getByRole('combobox', { name: 'Técnico responsável' })
    await waitFor(() => expect(Array.from((technician as HTMLSelectElement).options).map((option) => option.textContent)).toEqual(['Selecione um técnico', 'Rafael', 'Marina']))
    await user.selectOptions(technician, 'tech-2')
    await user.click(screen.getByRole('button', { name: 'Salvar responsável' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/ordens-de-trabalho/order-1', { tecnicoId: 'tech-2' }))
    expect(screen.getByText('Em execução')).toBeInTheDocument()
  })

  it('does not invent an ad-hoc corrective checklist when the API has no checklist data', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/ordens-de-trabalho/order-1') return { data: { ...order, tipo: 'CORRETIVA', checklistId: null } } as never
      if (url === '/equipamentos/equipment-1') return { data: { id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-10', nome: 'Bomba de infusão' } } as never
      if (url === '/hospitais') return { data: [] } as never
      if (url === '/users') return { data: [] } as never
      return { data: [] } as never
    })
    render(<WorkOrderDetailPage />, { wrapper: TestProviders })
    expect(await screen.findByText(/checklist ad-hoc não foi retornado pela API/)).toBeInTheDocument()
    expect(screen.queryByText('Item de checklist corretivo')).not.toBeInTheDocument()
    expect(apiClient.get).not.toHaveBeenCalledWith('/checklists/null/itens')
  })
})
