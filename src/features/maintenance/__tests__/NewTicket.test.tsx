import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { chooseOption, listOptions } from '@/test/select-helpers'
import { TicketsPage } from '../pages/TicketsPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) => <main><h1>{title}</h1>{action}{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const TICKET_ID = '11111111-1111-4111-8111-111111111111'
const hospitals = [{ id: 'h1', nome: 'Santa Casa', cnpj: '' }, { id: 'h2', nome: 'Clínica Norte', cnpj: '' }]
const sectorsByHospital: Record<string, unknown[]> = {
  h1: [{ id: 's1', hospitalId: 'h1', codigo: 'UTI', nome: 'UTI Adulto' }, { id: 's2', hospitalId: 'h1', codigo: 'CC', nome: 'Centro Cirúrgico' }],
  h2: [{ id: 's3', hospitalId: 'h2', codigo: 'EM', nome: 'Emergência' }],
}
const equipments = [
  { id: 'e1', setorId: 's1', codigo: 'EQ-01', nome: 'Bomba de infusão' },
  { id: 'e2', setorId: 's2', codigo: 'EQ-02', nome: 'Ventilador' },
  { id: 'e3', setorId: 's3', codigo: 'EQ-03', nome: 'Desfibrilador' },
]
const users = [
  { id: 't1', codigo: 'T1', nome: 'Rafael', email: 'r@test', role: 'tecnico', ativo: true },
  { id: 't2', codigo: 'T2', nome: 'Inativo', email: 'i@test', role: 'tecnico', ativo: false },
  { id: 't3', codigo: 'T3', nome: 'Norte Tec', email: 'n@test', role: 'tecnico', ativo: true },
  { id: 'a1', codigo: 'A1', nome: 'Admin', email: 'a@test', role: 'admin_cliente', ativo: true },
]
const links: Record<string, string[]> = { t1: ['h1'], t2: ['h1'], t3: ['h2'], a1: ['h1'] }

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter initialEntries={['/tickets']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/tickets" element={children} /><Route path="/tickets/:id" element={<Where />} /></Routes>
  </MemoryRouter></QueryClientProvider>
}
function Where() { return <div data-testid="route">{useLocation().pathname}</div> }

function problem(status: number, code?: string, detail?: string) {
  return Object.assign(new Error('fail'), { response: { status, data: { code, detail } } })
}

async function openModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Novo chamado' }))
  return screen.findByRole('dialog', { name: 'Novo chamado' })
}

async function fillValid(user: ReturnType<typeof userEvent.setup>, description = 'Bomba não liga') {
  await chooseOption(user, 'Hospital', 'Santa Casa')
  await chooseOption(user, 'Equipamento', /EQ-01/)
  await user.type(screen.getByRole('textbox', { name: 'Descrição' }), description)
}

describe('Novo chamado (admin)', () => {
  let ticketListCalls = 0
  beforeEach(() => {
    vi.clearAllMocks()
    ticketListCalls = 0
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(TICKET_ID)
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/chamados') { ticketListCalls += 1; return { data: [], headers: { 'x-total-count': '0' } } as never }
      if (url === '/equipamentos') return { data: equipments } as never
      if (url === '/hospitais') return { data: hospitals } as never
      const sectorMatch = String(url).match(/^\/hospitais\/([^/]+)\/setores$/)
      if (sectorMatch) return { data: sectorsByHospital[sectorMatch[1]] ?? [] } as never
      if (url === '/users') return { data: users } as never
      const linkMatch = String(url).match(/^\/users\/([^/]+)\/hospitais$/)
      if (linkMatch) return { data: links[linkMatch[1]] ?? [] } as never
      return { data: [] } as never
    })
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: TICKET_ID } } as never)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('mostra o botão só para admin_cliente', async () => {
    render(<TicketsPage />, { wrapper: Providers })
    expect(await screen.findByRole('button', { name: 'Novo chamado' })).toBeInTheDocument()
  })

  it('não mostra o botão para o técnico', async () => {
    setAuthSession('token', { id: 'tec-1', name: 'Rafael', roles: ['tecnico'], tenantId: 'tenant-1' })
    render(<TicketsPage />, { wrapper: Providers })
    await screen.findByRole('heading', { name: 'Chamados de Emergência' })
    expect(screen.queryByRole('button', { name: 'Novo chamado' })).not.toBeInTheDocument()
  })

  it('valida os campos obrigatórios com mensagem por campo e foca o primeiro inválido', async () => {
    const user = userEvent.setup()
    render(<TicketsPage />, { wrapper: Providers })
    await openModal(user)
    await user.click(screen.getByRole('button', { name: 'Abrir chamado' }))
    expect(await screen.findByText('Selecione o hospital.')).toBeInTheDocument()
    expect(screen.getByText('Selecione o equipamento.')).toBeInTheDocument()
    expect(screen.getByText('Descreva o problema.')).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'Hospital' })).toHaveFocus()
  })

  it('não aceita descrição só com espaços', async () => {
    const user = userEvent.setup()
    render(<TicketsPage />, { wrapper: Providers })
    await openModal(user)
    await chooseOption(user, 'Hospital', 'Santa Casa')
    await chooseOption(user, 'Equipamento', /EQ-01/)
    await user.type(screen.getByRole('textbox', { name: 'Descrição' }), '   ')
    await user.click(screen.getByRole('button', { name: 'Abrir chamado' }))
    expect(await screen.findByText('Descreva o problema.')).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('equipamento depende de hospital e setor', async () => {
    const user = userEvent.setup()
    render(<TicketsPage />, { wrapper: Providers })
    await openModal(user)
    expect(screen.getByRole('combobox', { name: 'Equipamento' })).toBeDisabled()
    await chooseOption(user, 'Hospital', 'Santa Casa')
    expect(await listOptions(user, 'Equipamento')).toEqual(['EQ-01 · Bomba de infusão', 'EQ-02 · Ventilador'])
    await chooseOption(user, /Setor/, /Centro Cirúrgico/)
    expect(await listOptions(user, 'Equipamento')).toEqual(['EQ-02 · Ventilador'])
  })

  it('trocar o hospital limpa equipamento e técnico', async () => {
    const user = userEvent.setup()
    render(<TicketsPage />, { wrapper: Providers })
    await openModal(user)
    await chooseOption(user, 'Hospital', 'Santa Casa')
    await chooseOption(user, 'Equipamento', /EQ-01/)
    await chooseOption(user, /Atribuir a um técnico/, 'Rafael')
    await chooseOption(user, 'Hospital', 'Clínica Norte')
    expect(screen.getByRole('combobox', { name: 'Equipamento' })).toHaveTextContent('Selecione um equipamento')
    expect(screen.getByRole('combobox', { name: /Atribuir a um técnico/ })).toHaveTextContent('Sem técnico')
  })

  it('lista só técnicos ativos vinculados ao hospital escolhido', async () => {
    const user = userEvent.setup()
    render(<TicketsPage />, { wrapper: Providers })
    await openModal(user)
    expect(screen.getByRole('combobox', { name: /Atribuir a um técnico/ })).toBeDisabled()
    await chooseOption(user, 'Hospital', 'Santa Casa')
    await waitFor(async () => expect(await listOptions(user, /Atribuir a um técnico/)).toEqual(['Sem técnico (chamado fica aberto)', 'Rafael']))
    await chooseOption(user, 'Hospital', 'Clínica Norte')
    await waitFor(async () => expect(await listOptions(user, /Atribuir a um técnico/)).toEqual(['Sem técnico (chamado fica aberto)', 'Norte Tec']))
  })

  it('explica cada severidade e usa Média como padrão', async () => {
    const user = userEvent.setup()
    render(<TicketsPage />, { wrapper: Providers })
    const dialog = await openModal(user)
    const group = within(dialog).getByRole('group', { name: 'Severidade' })
    expect(within(group).getByRole('radio', { name: /Média/ })).toBeChecked()
    const help: Array<[RegExp, string]> = [[/Crítica/, 'Parado ou risco ao paciente'], [/Alta/, 'Funciona, mas com falha relevante'], [/Média/, 'Falha intermitente, sem urgência'], [/Baixa/, 'Ajuste, ruído ou estética']]
    for (const [name, text] of help) {
      await user.click(within(group).getByRole('radio', { name }))
      expect(within(group).getByText(new RegExp(text))).toBeInTheDocument()
    }
    expect(within(dialog).getByText('Não inclua nome ou dados de paciente.')).toBeInTheDocument()
  })

  it('envia o corpo exato sem técnico, invalida a lista e leva ao detalhe', async () => {
    const user = userEvent.setup()
    render(<TicketsPage />, { wrapper: Providers })
    await openModal(user)
    await fillValid(user, '  Bomba não liga  ')
    await user.click(screen.getByRole('radio', { name: /Crítica/ }))
    const callsBefore = ticketListCalls
    await user.click(screen.getByRole('button', { name: 'Abrir chamado' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/chamados', { id: TICKET_ID, equipamentoId: 'e1', descricao: 'Bomba não liga', severidade: 'CRITICA' }))
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).not.toHaveProperty('tecnicoResponsavelId')
    expect(await screen.findByTestId('route')).toHaveTextContent(`/tickets/${TICKET_ID}`)
    expect(ticketListCalls).toBeGreaterThanOrEqual(callsBefore)
  })

  it('envia tecnicoResponsavelId quando um técnico é escolhido', async () => {
    const user = userEvent.setup()
    render(<TicketsPage />, { wrapper: Providers })
    await openModal(user)
    await fillValid(user)
    await waitFor(async () => expect(await listOptions(user, /Atribuir a um técnico/)).toContain('Rafael'))
    await chooseOption(user, /Atribuir a um técnico/, 'Rafael')
    await user.click(screen.getByRole('button', { name: 'Abrir chamado' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/chamados', { id: TICKET_ID, equipamentoId: 'e1', descricao: 'Bomba não liga', severidade: 'MEDIA', tecnicoResponsavelId: 't1' }))
  })

  it('sucesso refaz a listagem de chamados', async () => {
    const user = userEvent.setup()
    let release: (value: unknown) => void = () => {}
    vi.mocked(apiClient.post).mockImplementation(() => new Promise((resolve) => { release = resolve }) as never)
    render(<TicketsPage />, { wrapper: Providers })
    await openModal(user)
    await fillValid(user)
    const before = ticketListCalls
    await user.click(screen.getByRole('button', { name: 'Abrir chamado' }))
    release({ data: { id: TICKET_ID } })
    await screen.findByTestId('route')
    expect(ticketListCalls).toBeGreaterThan(before)
  })

  it('desabilita o botão durante o envio e não duplica', async () => {
    const user = userEvent.setup()
    let release: (value: unknown) => void = () => {}
    vi.mocked(apiClient.post).mockImplementation(() => new Promise((resolve) => { release = resolve }) as never)
    render(<TicketsPage />, { wrapper: Providers })
    await openModal(user)
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Abrir chamado' }))
    const busy = await screen.findByRole('button', { name: 'Abrindo…' })
    expect(busy).toBeDisabled()
    await user.click(busy)
    await user.keyboard('{Enter}')
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    release({ data: { id: TICKET_ID } })
    await screen.findByTestId('route')
  })

  it.each([
    ['404', problem(404, 'EQUIPAMENTO_NAO_ENCONTRADO'), 'Equipamento não encontrado. Escolha outro equipamento.'],
    ['PAPEL_INVALIDO', problem(422, 'PAPEL_INVALIDO'), 'O usuário escolhido não é técnico.'],
    ['TECNICO_FORA_DO_HOSPITAL', problem(422, 'TECNICO_FORA_DO_HOSPITAL'), 'O técnico precisa estar ativo e vinculado ao hospital do equipamento.'],
    ['400', problem(400, 'DADOS_INVALIDOS', 'Descrição inválida.'), 'Descrição inválida.'],
    ['403', problem(403, 'ACESSO_NEGADO'), 'Você não tem permissão para abrir chamados.'],
    ['5xx', problem(503), 'O servidor não conseguiu abrir o chamado. Tente novamente em instantes.'],
    ['rede', new Error('Network Error'), 'Sem conexão com o servidor. Verifique a rede e tente novamente; os dados foram mantidos.'],
  ])('erro %s mostra mensagem clara e mantém os dados digitados', async (_name, error, message) => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockRejectedValueOnce(error)
    render(<TicketsPage />, { wrapper: Providers })
    await openModal(user)
    await fillValid(user, 'Texto que deve permanecer')
    await user.click(screen.getByRole('button', { name: 'Abrir chamado' }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByTestId('route')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Descrição' })).toHaveValue('Texto que deve permanecer')
    expect(screen.getByRole('combobox', { name: 'Hospital' })).toHaveTextContent('Santa Casa')
    expect(screen.getByRole('button', { name: 'Abrir chamado' })).toBeEnabled()
    // tentar de novo reenvia o mesmo id
    await user.click(screen.getByRole('button', { name: 'Abrir chamado' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2))
    expect(vi.mocked(apiClient.post).mock.calls[1][1]).toMatchObject({ id: TICKET_ID, descricao: 'Texto que deve permanecer' })
  })

  it('não vaza a descrição para console nem para a URL', async () => {
    const user = userEvent.setup()
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) => vi.spyOn(console, method).mockImplementation(() => {}))
    vi.mocked(apiClient.post).mockRejectedValueOnce(problem(503))
    render(<TicketsPage />, { wrapper: Providers })
    await openModal(user)
    await fillValid(user, 'segredo-clinico')
    await user.click(screen.getByRole('button', { name: 'Abrir chamado' }))
    await screen.findByText(/servidor não conseguiu/)
    for (const spy of spies) expect(JSON.stringify(spy.mock.calls)).not.toContain('segredo-clinico')
    expect(vi.mocked(apiClient.post).mock.calls[0][0]).toBe('/chamados')
  })
})
