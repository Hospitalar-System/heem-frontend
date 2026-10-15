import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { TicketDetailPage } from '../pages/TicketDetailPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const ticket = {
  id: 'ticket-12345678', hospitalId: 'hospital-1', setorId: 'sector-1', equipamentoId: 'equipment-1',
  abertoPor: 'user-opener', descricao: 'Bomba apresenta falha de fluxo.', severidade: 'CRITICA', status: 'ABERTO', abertoEm: '2026-10-14T10:00:00Z',
}
const timeline = [
  { acao: 'ABRIR_CHAMADO', atorId: 'user-opener', ocorridoEm: '2026-10-14T10:00:00Z' },
  { acao: 'TRANSICIONAR_CHAMADO', atorId: 'user-2', ocorridoEm: '2026-10-14T10:15:00Z' },
]

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/tickets/ticket-12345678']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/tickets/:id" element={children} /><Route path="/tickets" element={<p>Lista de chamados</p>} /><Route path="/work-orders/:id" element={<RouteLocation />} /></Routes></MemoryRouter></QueryClientProvider>
}

function RouteLocation() { const location = useLocation(); return <p data-testid="current-route">{location.pathname}</p> }

describe('TicketDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/chamados/ticket-12345678') return { data: ticket } as never
      if (url === '/chamados/ticket-12345678/historico') return { data: timeline } as never
      if (url === '/equipamentos/equipment-1') return { data: { id: 'equipment-1', codigo: 'EQ-10', nome: 'Bomba de infusão' } } as never
      if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Hospital Central', cnpj: '' }] } as never
      if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'UTI', nome: 'UTI Adulto' }] } as never
      if (url === '/users') return { data: [{ id: 'tech-1', nome: 'Rafael', role: 'tecnico', ativo: true }] } as never
      if (url === '/users/tech-1/hospitais') return { data: ['hospital-1'] } as never
      if (url === '/users/user-opener') return { data: { id: 'user-opener', nome: 'Ana' } } as never
      return { data: [] } as never
    })
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'ot-1', codigo: 'OT-1001' } } as never)
  })

  it('loads ticket details and the read-only history from their endpoints', async () => {
    render(<TicketDetailPage />, { wrapper: TestProviders })
    expect(await screen.findByText('Bomba de infusão')).toBeInTheDocument()
    expect(screen.getByText('Bomba apresenta falha de fluxo.')).toBeInTheDocument()
    expect(screen.getByText('Hospital Central · UTI Adulto')).toBeInTheDocument()
    expect(screen.getByText('Chamado aberto')).toBeInTheDocument()
    expect(screen.getByText('Status atualizado')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/chamados/ticket-12345678')
    expect(apiClient.get).toHaveBeenCalledWith('/chamados/ticket-12345678/historico')
    expect(screen.getByRole('button', { name: 'Atribuir técnico indisponível' })).toBeDisabled()
    expect(screen.getByText(/endpoint de status não aceita um técnico responsável/)).toBeInTheDocument()
  })

  it('generates a corrective work order and offers navigation only when the API returns its id', async () => {
    const user = userEvent.setup()
    render(<TicketDetailPage />, { wrapper: TestProviders })
    await user.click(await screen.findByRole('button', { name: 'Gerar OT corretiva' }))
    await user.type(screen.getByRole('textbox', { name: 'Código da OT' }), 'OT-1001')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Técnico responsável' }), 'tech-1')
    await user.click(screen.getByRole('button', { name: 'Criar OT' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/ordens-de-trabalho/corretivas', {
      codigo: 'OT-1001', chamadoId: 'ticket-12345678', tecnicoId: 'tech-1',
    }))
    const { toast } = await import('sonner')
    expect(toast.success).toHaveBeenCalledWith('OT corretiva OT-1001 criada.', expect.objectContaining({ action: expect.objectContaining({ label: 'Abrir OT' }) }))
  })

  it('keeps ticket detail available when history is empty and links back to the ticket list', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/chamados/ticket-12345678') return { data: ticket } as never
      if (url === '/chamados/ticket-12345678/historico') return { data: [] } as never
      if (url === '/equipamentos/equipment-1') return { data: { id: 'equipment-1', codigo: 'EQ-10', nome: 'Bomba de infusão' } } as never
      if (url === '/hospitais') return { data: [] } as never
      if (url === '/users/user-opener') return { data: { id: 'user-opener', nome: 'Ana' } } as never
      return { data: [] } as never
    })
    const user = userEvent.setup()
    render(<TicketDetailPage />, { wrapper: TestProviders })
    expect(await screen.findByText('Nenhum evento de histórico foi retornado.')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Voltar aos chamados' }))
    expect(screen.getByText('Lista de chamados')).toBeInTheDocument()
  })

  it('renders a recoverable state for an unavailable or inaccessible ticket', async () => {
    vi.mocked(apiClient.get).mockRejectedValue({ response: { data: { detail: 'Chamado não encontrado.' } } })
    render(<TicketDetailPage />, { wrapper: TestProviders })
    expect(await screen.findByRole('alert')).toHaveTextContent('Chamado não encontrado.')
    expect(screen.getByRole('button', { name: 'Voltar à lista' })).toBeInTheDocument()
  })
})
