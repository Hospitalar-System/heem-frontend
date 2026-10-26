import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from '@/app/RequireRole'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar'
import { apiClient } from '@/lib/axios'
import { chooseDate } from '@/test/date-helpers'
import { chooseOption, listOptions } from '@/test/select-helpers'
import { PreventivePlansPage } from '../pages/PreventivePlansPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Fixture no formato de PlanoPreventivoResponse (backend 9.1/9.2).
const plans = [
  { id: 'plan-1', equipamentoId: 'equipment-1', checklistId: 'checklist-1', tecnicoPadraoId: 'tech-1', intervaloDias: 30, dataAncora: '2026-01-05', proximaData: '2026-11-04', ativo: true, pendencia: false, createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z' },
  { id: 'plan-2', equipamentoId: 'equipment-2', checklistId: 'checklist-1', tecnicoPadraoId: 'tech-1', intervaloDias: 1, dataAncora: '2026-10-01', proximaData: '2026-10-27', ativo: true, pendencia: true, createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z' },
]
const httpError = (status: number, data: Record<string, unknown> = {}) => Object.assign(new Error('http'), { response: { status, data } })

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
}

function mockApi(listResult: () => unknown = () => ({ data: plans, headers: { 'x-total-count': String(plans.length) } })) {
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/planos-preventivos') return listResult() as never
    if (url === '/equipamentos') return { data: [
      { id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-01', nome: 'Bomba de infusão' },
      { id: 'equipment-2', setorId: 'sector-1', codigo: 'EQ-02', nome: 'Monitor' },
      { id: 'equipment-3', setorId: 'sector-2', codigo: 'EQ-03', nome: 'Ventilador' },
    ] } as never
    if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }, { id: 'hospital-2', nome: 'Clínica Norte', cnpj: '' }] } as never
    if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'UTI', nome: 'UTI Adulto' }] } as never
    if (url === '/hospitais/hospital-2/setores') return { data: [{ id: 'sector-2', hospitalId: 'hospital-2', codigo: 'EM', nome: 'Emergência' }] } as never
    if (url === '/users') return { data: [
      { id: 'tech-1', codigo: 'T-1', nome: 'Rafael', email: 'rafael@test', role: 'tecnico', ativo: true },
      { id: 'tech-2', codigo: 'T-2', nome: 'Marina', email: 'marina@test', role: 'tecnico', ativo: true },
      { id: 'tech-3', codigo: 'T-3', nome: 'Inativo', email: 'inativo@test', role: 'tecnico', ativo: false },
      { id: 'admin-1', codigo: 'A-1', nome: 'Clara', email: 'clara@test', role: 'admin_cliente', ativo: true },
    ] } as never
    if (url === '/users/tech-1/hospitais') return { data: ['hospital-1'] } as never
    if (url === '/users/tech-2/hospitais') return { data: ['hospital-2'] } as never
    if (url === '/users/tech-3/hospitais') return { data: ['hospital-1'] } as never
    if (url === '/users/admin-1/hospitais') return { data: ['hospital-1'] } as never
    if (url === '/checklists') return { data: [
      { id: 'checklist-1', hospitalId: null, nome: 'Inspeção geral', ativo: true },
      { id: 'checklist-2', hospitalId: 'hospital-2', nome: 'Checklist Norte', ativo: true },
      { id: 'checklist-3', hospitalId: null, nome: 'Checklist antigo', ativo: false },
    ] } as never
    return { data: [] } as never
  })
}

function renderPage() { return render(<PreventivePlansPage />, { wrapper: Providers }) }
const listCalls = () => vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/planos-preventivos')

async function fillValidCreateForm(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  await chooseOption(user, 'Equipamento', 'EQ-01 · Bomba de infusão')
  await waitFor(async () => expect(await listOptions(user, screen.getByRole('combobox', { name: 'Técnico padrão' }))).toEqual(['Rafael']))
  await chooseOption(user, 'Checklist', 'Inspeção geral')
  await chooseOption(user, 'Técnico padrão', 'Rafael')
  await user.type(within(dialog).getByRole('textbox', { name: 'Intervalo (dias)' }), '30')
  await chooseDate(user, 'Data âncora', '2026-11-10')
}

describe('PreventivePlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    mockApi()
    vi.mocked(apiClient.post).mockResolvedValue({ data: plans[0] } as never)
    vi.mocked(apiClient.put).mockResolvedValue({ data: plans[0] } as never)
  })

  afterEach(() => clearAuthSession())

  it('lista os planos do backend com equipamento, checklist, periodicidade, próxima geração, técnico e status', async () => {
    renderPage()
    const row = (await screen.findByText('Bomba de infusão')).closest('tr') as HTMLElement
    expect(within(row).getByText('EQ-01')).toBeInTheDocument()
    expect(within(row).getByText('Inspeção geral')).toBeInTheDocument()
    expect(within(row).getByText(/A cada 30 dias/)).toBeInTheDocument()
    expect(within(row).getByText('04/11/2026')).toBeInTheDocument()
    expect(within(row).getByText('Rafael')).toBeInTheDocument()
    expect(within(row).getByText('Ativo')).toBeInTheDocument()
    expect(within(row).queryByText('Pendência')).not.toBeInTheDocument()
    const pending = screen.getByText('Monitor').closest('tr') as HTMLElement
    expect(within(pending).getByText('Pendência')).toBeInTheDocument()
    expect(within(pending).getByText(/A cada 1 dia\b/)).toBeInTheDocument()
    expect(listCalls()[0][1]).toEqual({ params: { pagina: 0, tamanho: 20, ativo: true } })
    expect(screen.queryByText(/dependem das Stories/)).not.toBeInTheDocument()
  })

  it('mostra skeleton enquanto carrega', async () => {
    mockApi(() => new Promise(() => undefined))
    renderPage()
    expect(await screen.findByLabelText('Carregando planos preventivos')).toHaveAttribute('aria-busy', 'true')
  })

  it('mostra EmptyState sem planos e leva ao formulário', async () => {
    const user = userEvent.setup()
    mockApi(() => ({ data: [], headers: { 'x-total-count': '0' } }))
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Nenhum plano preventivo cadastrado' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Novo plano' })[1])
    expect(await screen.findByRole('dialog', { name: 'Novo plano preventivo' })).toBeInTheDocument()
  })

  it('mostra erro com nova tentativa quando a listagem falha', async () => {
    const user = userEvent.setup()
    let fail = true
    mockApi(() => { if (fail) throw httpError(500); return { data: plans, headers: {} } })
    renderPage()
    expect(await screen.findByText('Não foi possível carregar os planos preventivos.')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Bomba de infusão')).toBeInTheDocument()
  })

  it('trata 403 com mensagem de acesso e sem nova tentativa', async () => {
    mockApi(() => { throw httpError(403, { code: 'ACESSO_NEGADO' }) })
    renderPage()
    expect(await screen.findByText(/Acesso não permitido\. Apenas o administrador do cliente/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
  })

  it('filtra por status e por equipamento enviando os parâmetros do contrato', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Bomba de infusão')
    await chooseOption(user, 'Filtrar por status', 'Inativos')
    await waitFor(() => expect(listCalls().at(-1)?.[1]).toEqual({ params: { pagina: 0, tamanho: 20, ativo: false } }))
    await chooseOption(user, 'Filtrar por status', 'Todos os status')
    await chooseOption(user, 'Filtrar por equipamento', 'EQ-02 · Monitor')
    await waitFor(() => expect(listCalls().at(-1)?.[1]).toEqual({ params: { pagina: 0, tamanho: 20, equipamentoId: 'equipment-2' } }))
  })

  it('pagina usando X-Total-Count', async () => {
    const user = userEvent.setup()
    mockApi(() => ({ data: plans, headers: { 'x-total-count': '45' } }))
    renderPage()
    expect(await screen.findByText('45 plano(s) · página 1 de 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    await waitFor(() => expect(listCalls().at(-1)?.[1]).toEqual({ params: { pagina: 1, tamanho: 20, ativo: true } }))
  })

  it('cria um plano enviando o corpo exato do contrato, só com opções válidas para o hospital, e atualiza a lista', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Bomba de infusão')
    await user.click(screen.getByRole('button', { name: 'Novo plano' }))
    const dialog = await screen.findByRole('dialog', { name: 'Novo plano preventivo' })
    await chooseOption(user, 'Equipamento', 'EQ-01 · Bomba de infusão')
    await waitFor(async () => expect(await listOptions(user, screen.getByRole('combobox', { name: 'Técnico padrão' }))).toEqual(['Rafael']))
    expect(await listOptions(user, screen.getByRole('combobox', { name: 'Checklist' }))).toEqual(['Inspeção geral'])
    await chooseOption(user, 'Checklist', 'Inspeção geral')
    await chooseOption(user, 'Técnico padrão', 'Rafael')
    await user.type(within(dialog).getByRole('textbox', { name: 'Intervalo (dias)' }), '30')
    await chooseDate(user, 'Data âncora', '2026-11-10')
    const callsBefore = listCalls().length
    await user.click(within(dialog).getByRole('button', { name: 'Criar plano' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/planos-preventivos', {
      equipamentoId: 'equipment-1', checklistId: 'checklist-1', tecnicoPadraoId: 'tech-1', intervaloDias: 30, dataAncora: '2026-11-10',
    }))
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(callsBefore))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('filtra checklists e técnicos pelo hospital do equipamento', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Bomba de infusão')
    await user.click(screen.getByRole('button', { name: 'Novo plano' }))
    await chooseOption(user, 'Equipamento', 'EQ-03 · Ventilador')
    await waitFor(async () => expect(await listOptions(user, screen.getByRole('combobox', { name: 'Checklist' }))).toEqual(['Inspeção geral', 'Checklist Norte']))
    await waitFor(async () => expect(await listOptions(user, screen.getByRole('combobox', { name: 'Técnico padrão' }))).toEqual(['Marina']))
  })

  it('avisa quando o equipamento não tem checklist disponível', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/checklists') return { data: [{ id: 'checklist-9', hospitalId: 'hospital-2', nome: 'Só do Norte', ativo: true }] } as never
      if (url === '/planos-preventivos') return { data: plans, headers: {} } as never
      if (url === '/equipamentos') return { data: [{ id: 'equipment-1', setorId: 'sector-1', codigo: 'EQ-01', nome: 'Bomba de infusão' }] } as never
      if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }] } as never
      if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'UTI', nome: 'UTI Adulto' }] } as never
      return { data: [] } as never
    })
    renderPage()
    await screen.findByText('Bomba de infusão', { selector: 'span' })
    await user.click(screen.getByRole('button', { name: 'Novo plano' }))
    await chooseOption(user, 'Equipamento', 'EQ-01 · Bomba de infusão')
    expect(await screen.findByText(/Não há checklist ativo disponível para o hospital deste equipamento/)).toBeInTheDocument()
  })

  it('valida por campo em pt-BR sem chamar a API', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Bomba de infusão')
    await user.click(screen.getByRole('button', { name: 'Novo plano' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Criar plano' }))
    expect(await within(dialog).findByText('Selecione um equipamento.')).toBeInTheDocument()
    expect(within(dialog).getByText('Selecione um checklist.')).toBeInTheDocument()
    expect(within(dialog).getByText('Selecione o técnico padrão.')).toBeInTheDocument()
    expect(within(dialog).getByText('Informe o intervalo em dias.')).toBeInTheDocument()
    expect(within(dialog).getByText('Informe a data âncora.')).toBeInTheDocument()
    const interval = within(dialog).getByRole('textbox', { name: 'Intervalo (dias)' })
    expect(interval).toHaveAttribute('aria-invalid', 'true')
    await user.type(interval, '0')
    await user.click(within(dialog).getByRole('button', { name: 'Criar plano' }))
    expect(await within(dialog).findByText('O intervalo mínimo é de 1 dia.')).toBeInTheDocument()
    await user.clear(interval)
    await user.type(interval, '1,5')
    await user.click(within(dialog).getByRole('button', { name: 'Criar plano' }))
    expect(await within(dialog).findByText('Use apenas números inteiros, com até 5 dígitos.')).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it.each([
    ['PLANO_DUPLICADO', 'Já existe um plano ativo para este equipamento e checklist.', 'Checklist'],
    ['TECNICO_PADRAO_INVALIDO', 'O técnico padrão precisa ter papel de técnico e estar vinculado ao hospital do equipamento.', 'Técnico padrão'],
    ['CHECKLIST_DE_OUTRO_HOSPITAL', 'Este checklist pertence a outro hospital.', 'Checklist'],
  ])('mapeia o erro %s para o campo correspondente', async (code, message, field) => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockRejectedValue(httpError(409, { code, detail: 'texto do servidor' }))
    renderPage()
    await screen.findByText('Bomba de infusão')
    await user.click(screen.getByRole('button', { name: 'Novo plano' }))
    const dialog = await screen.findByRole('dialog')
    await fillValidCreateForm(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Criar plano' }))
    expect(await within(dialog).findByText(message)).toBeInTheDocument()
    expect(within(dialog).getByRole('combobox', { name: field })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('edita enviando só técnico, intervalo e âncora, com equipamento e checklist fixos', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Editar plano de EQ-01 · Bomba de infusão' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar plano preventivo' })
    expect(within(dialog).getByRole('combobox', { name: 'Equipamento' })).toBeDisabled()
    expect(within(dialog).getByRole('combobox', { name: 'Checklist' })).toBeDisabled()
    const interval = within(dialog).getByRole('textbox', { name: 'Intervalo (dias)' })
    expect(interval).toHaveValue('30')
    await user.clear(interval)
    await user.type(interval, '45')
    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/planos-preventivos/plan-1', { tecnicoPadraoId: 'tech-1', intervaloDias: 45, dataAncora: '2026-01-05' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('PLANO_INATIVO na edição mostra a mensagem e recarrega a lista', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.put).mockRejectedValue(httpError(409, { code: 'PLANO_INATIVO' }))
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Editar plano de EQ-01 · Bomba de infusão' }))
    const dialog = await screen.findByRole('dialog')
    const callsBefore = listCalls().length
    await user.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }))
    expect(await within(dialog).findByText('Este plano foi desativado e não pode mais ser editado.')).toBeInTheDocument()
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(callsBefore))
  })

  it('desativa só depois da confirmação, de forma otimista, e recarrega a lista', async () => {
    const user = userEvent.setup()
    let resolveDeactivate: (value: unknown) => void = () => undefined
    vi.mocked(apiClient.post).mockImplementation(() => new Promise((resolve) => { resolveDeactivate = resolve }) as never)
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Desativar plano de EQ-01 · Bomba de infusão' }))
    expect(apiClient.post).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('dialog', { name: 'Desativar plano preventivo' })
    const callsBefore = listCalls().length
    await user.click(within(dialog).getByRole('button', { name: 'Desativar plano' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/planos-preventivos/plan-1/desativar'))
    const row = screen.getByText('Bomba de infusão', { selector: 'span' }).closest('tr') as HTMLElement
    await waitFor(() => expect(within(row).getByText('Inativo')).toBeInTheDocument())
    resolveDeactivate({ data: { ...plans[0], ativo: false } })
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(callsBefore))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('cancelar a confirmação não desativa nada; falha desfaz o estado otimista e mostra o erro', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockRejectedValue(httpError(404, { code: 'NAO_ENCONTRADO' }))
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Desativar plano de EQ-01 · Bomba de infusão' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(apiClient.post).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Desativar plano de EQ-01 · Bomba de infusão' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Desativar plano' }))
    expect(await screen.findByText('Plano preventivo não encontrado. A lista foi atualizada.')).toBeInTheDocument()
  })

  it('planos inativos não oferecem edição nem desativação', async () => {
    mockApi(() => ({ data: [{ ...plans[0], ativo: false }], headers: { 'x-total-count': '1' } }))
    renderPage()
    expect(await screen.findByText('Inativo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Editar plano|Desativar plano/ })).not.toBeInTheDocument()
  })
})

describe('PreventivePlansPage acesso', () => {
  beforeEach(() => {
    clearAuthSession()
    setAuthSession('token', { id: 'technician-1', name: 'Rafael', roles: ['tecnico'], tenantId: 'tenant-1' })
  })
  afterEach(() => clearAuthSession())

  it('nega outros papéis e esconde o link do menu', () => {
    render(<MemoryRouter initialEntries={['/preventive-plans']}><Routes>
      <Route path="/preventive-plans" element={<RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><PreventivePlansPage /></RequireRole>} />
      <Route path="/access-denied" element={<h1>Acesso não permitido</h1>} />
    </Routes></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Acesso não permitido' })).toBeInTheDocument()
    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Planos preventivos' })).not.toBeInTheDocument()
  })
})
