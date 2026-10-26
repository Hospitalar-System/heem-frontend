import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { TicketsPage } from '../pages/TicketsPage'
import { chooseOption } from '@/test/select-helpers'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const tickets = [
  { id: 'ticket-critical', hospitalId: 'hospital-1', setorId: 'sector-1', equipamentoId: 'equipment-1', abertoPor: 'user-2', descricao: 'Falha crítica de pressão', severidade: 'CRITICA', status: 'ABERTO', abertoEm: '2026-10-14T10:00:00Z', slaStatus: 'vencido', slaAtendimentoAte: '2026-10-14T10:15:00Z', slaResolucaoAte: '2026-10-14T14:00:00Z' },
  { id: 'ticket-resolved', hospitalId: 'hospital-1', setorId: 'sector-1', equipamentoId: 'equipment-1', abertoPor: 'user-2', descricao: 'Falha resolvida', severidade: 'ALTA', status: 'RESOLVIDO', abertoEm: '2026-10-13T10:00:00Z' },
]
let currentTickets = [...tickets]

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/tickets']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/tickets" element={children} /><Route path="/tickets/:id" element={<RouteLocation />} /></Routes></MemoryRouter></QueryClientProvider>
}

function RouteLocation() { const location = useLocation(); return <div data-testid="current-route">{location.pathname}</div> }

describe('TicketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentTickets = tickets.map((ticket) => ({ ...ticket }))
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/chamados') return { data: currentTickets } as never
      if (url === '/equipamentos') return { data: [{ id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-01', nome: 'Bomba de infusão' }] } as never
      if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }] } as never
      if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'UTI', nome: 'UTI Adulto' }] } as never
      if (url === '/users') return { data: [{ id: 'tech-1', codigo: 'T-1', nome: 'Rafael', email: 'rafael@test', role: 'tecnico', ativo: true }] } as never
      if (url === '/users/tech-1/hospitais') return { data: ['hospital-1'] } as never
      return { data: [] } as never
    })
    vi.mocked(apiClient.post).mockImplementation(async () => {
      currentTickets[0] = { ...currentTickets[0], status: 'EM_ANDAMENTO' }
      return { data: { id: 'ot-1', codigo: 'OT-2042' } } as never
    })
  })

  it('shows real ticket data and a trustworthy urgent count, and opens its detail route', async () => {
    const user = userEvent.setup()
    render(<TicketsPage />, { wrapper: TestProviders })
    expect(await screen.findByRole('status')).toHaveTextContent('1 chamado crítico ou alto aguardando atendimento')
    expect(screen.getAllByText('EQ-01 · Bomba de infusão')).toHaveLength(2)
    expect(screen.getAllByText('Santa Casa · UTI Adulto')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Gerar OT corretiva' })).toHaveLength(1)
    expect(screen.getByText('SLA vencido')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Abrir chamado ticket-critical' }))
    expect(screen.getByTestId('current-route')).toHaveTextContent('/tickets/ticket-critical')
  })

  it('generates a corrective work order with the required backend payload', async () => {
    const user = userEvent.setup()
    render(<TicketsPage />, { wrapper: TestProviders })
    await user.click(await screen.findByRole('button', { name: 'Gerar OT corretiva' }))
    await user.type(screen.getByRole('textbox', { name: 'Código da OT' }), 'OT-2042')
    await chooseOption(user, 'Técnico responsável', 'Rafael')
    await user.click(screen.getByRole('button', { name: 'Criar OT' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/ordens-de-trabalho/corretivas', {
      codigo: 'OT-2042', chamadoId: 'ticket-critical', tecnicoId: 'tech-1',
    }))
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })

  it('filters by status and hides corrective action for ineligible calls', async () => {
    render(<TicketsPage />, { wrapper: TestProviders })
    await screen.findByText('Falha crítica de pressão')
    await chooseOption(userEvent.setup(), 'Filtrar por status', 'Resolvido')
    expect(await screen.findByText('Falha resolvida')).toBeInTheDocument()
    const card = screen.getByRole('article')
    expect(within(card).queryByRole('button', { name: 'Gerar OT corretiva' })).not.toBeInTheDocument()
    expect(screen.queryByText('Falha crítica de pressão')).not.toBeInTheDocument()
  })
})
