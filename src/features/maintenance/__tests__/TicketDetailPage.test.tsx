import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { TicketDetailPage } from '../pages/TicketDetailPage'
import { chooseOption } from '@/test/select-helpers'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const ticket = {
  id: 'ticket-12345678', hospitalId: 'hospital-1', setorId: 'sector-1', equipamentoId: 'equipment-1',
  abertoPor: 'user-opener', descricao: 'Bomba apresenta falha de fluxo.', severidade: 'CRITICA', status: 'ABERTO', abertoEm: '2026-10-14T10:00:00Z',
  slaAtendimentoAte: '2026-10-14T10:15:00Z', slaResolucaoAte: '2026-10-14T14:00:00Z', slaStatus: 'em_risco',
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
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} } as never)
  })

  it('loads ticket details and the read-only history from their endpoints', async () => {
    render(<TicketDetailPage />, { wrapper: TestProviders })
    expect(await screen.findByText('Bomba de infusão')).toBeInTheDocument()
    expect(screen.getByText('Bomba apresenta falha de fluxo.')).toBeInTheDocument()
    expect(screen.getByText('Hospital Central · UTI Adulto')).toBeInTheDocument()
    expect(screen.getByText('Chamado aberto')).toBeInTheDocument()
    expect(screen.getByText('SLA em risco')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Prazos de SLA' })).getByText('14/10/2026, 07:15:00')).toBeInTheDocument()
    expect(screen.getByText('Status atualizado')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/chamados/ticket-12345678')
    expect(apiClient.get).toHaveBeenCalledWith('/chamados/ticket-12345678/historico')
    expect(screen.queryByRole('button', { name: /indisponível/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atribuir responsável' })).toBeEnabled()
  })

  it('generates a corrective work order and offers navigation only when the API returns its id', async () => {
    const user = userEvent.setup()
    render(<TicketDetailPage />, { wrapper: TestProviders })
    await user.click(await screen.findByRole('button', { name: 'Gerar OT corretiva' }))
    await user.type(screen.getByRole('textbox', { name: 'Código da OT' }), 'OT-1001')
    await chooseOption(user, 'Técnico responsável', 'Rafael')
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

  describe('ciclo do chamado', () => {
    function mockTicket(overrides: Record<string, unknown>) {
      const current = { ...ticket, ...overrides }
      const base = vi.mocked(apiClient.get).getMockImplementation()!
      vi.mocked(apiClient.get).mockImplementation(async (url, config) => (url === '/chamados/ticket-12345678' ? ({ data: current } as never) : base(url, config)))
    }
    function loginAs(role: 'admin_cliente' | 'tecnico' | 'interno_hospital', id = 'admin-1') {
      clearAuthSession()
      setAuthSession('token', { id, name: 'Usuário', roles: [role], tenantId: 'tenant-1' })
    }
    const buttonNames = () => screen.queryAllByRole('button').map((button) => button.textContent)

    it('shows the new fields: responsible, first response, cancellation, reopenings, solution and cause', async () => {
      mockTicket({ status: 'RESOLVIDO', tecnicoResponsavelId: 'tech-1', primeiraRespostaEm: '2026-10-14T10:05:00Z', canceladoEm: '2026-10-14T12:00:00Z', reaberturas: 2, solucao: 'Troca da válvula.', causaCategoria: 'falha_mecanica' })
      render(<TicketDetailPage />, { wrapper: TestProviders })
      const care = await screen.findByRole('region', { name: 'Atendimento' })
      expect(await within(care).findByText('Rafael')).toBeInTheDocument()
      expect(within(care).getByText('Primeira resposta')).toBeInTheDocument()
      expect(within(care).getByText('Cancelado em')).toBeInTheDocument()
      expect(within(care).getByText('2')).toBeInTheDocument()
      expect(within(care).getByText('Troca da válvula.')).toBeInTheDocument()
      expect(within(care).getByText('Falha mecânica')).toBeInTheDocument()
    })

    it('lets a technician assume an open ticket without responsible and hides admin-only actions', async () => {
      loginAs('tecnico', 'tech-1')
      mockTicket({})
      const user = userEvent.setup()
      render(<TicketDetailPage />, { wrapper: TestProviders })
      await user.click(await screen.findByRole('button', { name: 'Assumir chamado' }))
      await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/chamados/ticket-12345678/assumir'))
      expect(screen.queryByRole('button', { name: 'Atribuir responsável' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Reabrir' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Aguardando peça' })).not.toBeInTheDocument()
    })

    it('shows the server message when assuming fails with 409', async () => {
      loginAs('tecnico', 'tech-1')
      mockTicket({})
      vi.mocked(apiClient.put).mockRejectedValue({ response: { data: { code: 'CHAMADO_JA_ATRIBUIDO', detail: 'Já atribuído.' } } })
      const user = userEvent.setup()
      render(<TicketDetailPage />, { wrapper: TestProviders })
      await user.click(await screen.findByRole('button', { name: 'Assumir chamado' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Este chamado já possui um técnico responsável.')
    })

    it('does not offer assume when the ticket already has a responsible', async () => {
      loginAs('tecnico', 'tech-1')
      mockTicket({ tecnicoResponsavelId: 'tech-1' })
      render(<TicketDetailPage />, { wrapper: TestProviders })
      await screen.findByRole('region', { name: 'Atendimento' })
      expect(screen.queryByRole('button', { name: 'Assumir chamado' })).not.toBeInTheDocument()
    })

    it('assigns a responsible as admin and surfaces a 422 error', async () => {
      const user = userEvent.setup()
      render(<TicketDetailPage />, { wrapper: TestProviders })
      await user.click(await screen.findByRole('button', { name: 'Atribuir responsável' }))
      const dialog = await screen.findByRole('dialog', { name: 'Atribuir responsável' })
      vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { code: 'TECNICO_FORA_DO_HOSPITAL', detail: 'fora' } } })
      await chooseOption(user, within(dialog).getByRole('combobox', { name: 'Técnico responsável' }), 'Rafael')
      await user.click(within(dialog).getByRole('button', { name: 'Atribuir' }))
      expect(await within(dialog).findByRole('alert')).toHaveTextContent('não está vinculado ao hospital')
      await user.click(within(dialog).getByRole('button', { name: 'Atribuir' }))
      await waitFor(() => expect(apiClient.put).toHaveBeenLastCalledWith('/chamados/ticket-12345678/responsavel', { tecnicoId: 'tech-1' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('resolves with mandatory solution and optional cause, showing the OT_ABERTA server message', async () => {
      mockTicket({ status: 'EM_ANDAMENTO', prontoParaResolver: true })
      const user = userEvent.setup()
      render(<TicketDetailPage />, { wrapper: TestProviders })
      await user.click(await screen.findByRole('button', { name: 'Resolver' }))
      const dialog = await screen.findByRole('dialog', { name: 'Resolver chamado' })
      const submit = within(dialog).getByRole('button', { name: 'Resolver chamado' })
      expect(submit).toBeDisabled()
      await user.type(within(dialog).getByRole('textbox', { name: 'Solução aplicada' }), 'Troca da válvula')
      await chooseOption(user, within(dialog).getByRole('combobox', { name: 'Causa (opcional)' }), 'Falha elétrica')
      vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { data: { code: 'OT_ABERTA', detail: 'Há OT corretiva em execução.' } } })
      await user.click(submit)
      expect(await within(dialog).findByRole('alert')).toHaveTextContent('Há OT corretiva em execução.')
      await user.click(submit)
      await waitFor(() => expect(apiClient.put).toHaveBeenLastCalledWith('/chamados/ticket-12345678/status', { novoStatus: 'RESOLVIDO', solucao: 'Troca da válvula', causaCategoria: 'falha_eletrica' }))
    })

    it('disables resolving with a hint when the ticket is not ready to resolve', async () => {
      mockTicket({ status: 'EM_ANDAMENTO', prontoParaResolver: false })
      render(<TicketDetailPage />, { wrapper: TestProviders })
      const button = await screen.findByRole('button', { name: 'Resolver' })
      expect(button).toBeDisabled()
      expect(button).toHaveAccessibleDescription(/OT corretiva em aberto/)
    })

    it('requires a reason to cancel and confirms before sending', async () => {
      const user = userEvent.setup()
      render(<TicketDetailPage />, { wrapper: TestProviders })
      await user.click(await screen.findByRole('button', { name: 'Cancelar chamado' }))
      const dialog = await screen.findByRole('dialog', { name: 'Cancelar chamado' })
      const confirm = within(dialog).getByRole('button', { name: 'Confirmar cancelamento' })
      expect(confirm).toBeDisabled()
      expect(apiClient.put).not.toHaveBeenCalled()
      await user.type(within(dialog).getByRole('textbox', { name: 'Motivo do cancelamento' }), 'Duplicado')
      await user.click(confirm)
      await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/chamados/ticket-12345678/status', { novoStatus: 'CANCELADO', motivo: 'Duplicado' }))
    })

    it('toggles between em andamento and aguardando peça', async () => {
      mockTicket({ status: 'EM_ANDAMENTO' })
      const user = userEvent.setup()
      const { unmount } = render(<TicketDetailPage />, { wrapper: TestProviders })
      await user.click(await screen.findByRole('button', { name: 'Aguardando peça' }))
      await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/chamados/ticket-12345678/status', { novoStatus: 'AGUARDANDO_PECA' }))
      unmount()
      mockTicket({ status: 'AGUARDANDO_PECA' })
      render(<TicketDetailPage />, { wrapper: TestProviders })
      await user.click(await screen.findByRole('button', { name: 'Retomar atendimento' }))
      await waitFor(() => expect(apiClient.put).toHaveBeenLastCalledWith('/chamados/ticket-12345678/status', { novoStatus: 'EM_ANDAMENTO' }))
    })

    it('reopens only resolved tickets, as admin, with a reason', async () => {
      mockTicket({ status: 'RESOLVIDO', solucao: 'ok' })
      const user = userEvent.setup()
      render(<TicketDetailPage />, { wrapper: TestProviders })
      await user.click(await screen.findByRole('button', { name: 'Reabrir' }))
      const dialog = await screen.findByRole('dialog', { name: 'Reabrir chamado' })
      expect(within(dialog).getByRole('button', { name: 'Reabrir chamado' })).toBeDisabled()
      await user.type(within(dialog).getByRole('textbox', { name: 'Motivo da reabertura' }), 'Voltou a falhar')
      await user.click(within(dialog).getByRole('button', { name: 'Reabrir chamado' }))
      await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/chamados/ticket-12345678/reabrir', { motivo: 'Voltou a falhar' }))
    })

    it('never offers ABERTO to EM_ANDAMENTO as a manual transition', async () => {
      render(<TicketDetailPage />, { wrapper: TestProviders })
      await screen.findByRole('region', { name: 'Atendimento' })
      expect(buttonNames().join('|')).not.toMatch(/Retomar|Iniciar|Em andamento/i)
      expect(screen.queryByRole('button', { name: 'Resolver' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancelar chamado' })).toBeInTheDocument()
    })

    it('hides every action and the SLA from an internal user', async () => {
      loginAs('interno_hospital')
      mockTicket({ slaStatus: null, slaAtendimentoAte: null, slaResolucaoAte: null })
      render(<TicketDetailPage />, { wrapper: TestProviders })
      await screen.findByRole('region', { name: 'Atendimento' })
      expect(screen.queryByRole('region', { name: 'Prazos de SLA' })).not.toBeInTheDocument()
      for (const name of ['Assumir chamado', 'Atribuir responsável', 'Cancelar chamado', 'Reabrir', 'Gerar OT corretiva']) {
        expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
      }
    })
  })
})
