import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireRole } from '@/app/RequireRole'
import { addDays, isoOf, parseDate, todayCivil } from '@/components/ui/civil-date'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar'
import { apiClient } from '@/lib/axios'
import { chooseDate } from '@/test/date-helpers'
import { chooseOption } from '@/test/select-helpers'
import { PreventiveCampaignDetailPage } from '../pages/PreventiveCampaignDetailPage'
import { PreventiveCampaignFormPage } from '../pages/PreventiveCampaignFormPage'
import { PreventiveCampaignsPage } from '../pages/PreventiveCampaignsPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) => <main><h1>{title}</h1>{action}{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const httpError = (status: number, data: Record<string, unknown> = {}) => Object.assign(new Error('http'), { response: { status, data } })
const startDate = isoOf(addDays(parseDate(isoOf(todayCivil()))!, 40))

// Fixtures no formato de CampanhaPreventivaResponse / PreviaCampanhaResponse (backend Story 15.2).
const baseCampaign = {
  id: 'camp-1', hospitalId: 'hospital-1', nome: 'Preventiva semestral', setorIds: [], categoriaIds: [], dataInicio: '2026-11-10', dataFim: null,
  recorrencia: 'meses', intervalo: 6, proximaData: '2027-05-10', modoAtribuicao: 'equilibrado', tecnicoId: null, status: 'concluida', ativa: true,
  janelaAtual: '2026-11-10', execucao: { totalEquipamentos: 10, processadas: 10, geradas: 7, puladas: 1, pendencias: 2 },
  ots: { total: 7, agendadas: 5, emExecucao: 1, concluidas: 1, canceladas: 0, atrasadas: 1 },
  pendenciasDetalhe: [
    { equipamentoId: 'eq-1', codigo: 'EQ-77', motivo: 'SEM_CATEGORIA' },
    { equipamentoId: 'eq-2', codigo: 'EQ-88', motivo: 'CATEGORIA_SEM_CHECKLIST' },
  ],
  criadaEm: '2026-10-01T10:00:00Z', canceladaEm: null,
}
const listCampaigns = [baseCampaign, { ...baseCampaign, id: 'camp-2', nome: 'Avulsa UTI', recorrencia: 'avulsa', intervalo: null, proximaData: null, status: 'falhou', ativa: false, pendenciasDetalhe: [] }]
const previewResponse = {
  totalEquipamentos: 12, aGerar: 9, puladas: 1, totalPendencias: 2,
  pendenciasPorMotivo: { SEM_CATEGORIA: 1, CATEGORIA_SEM_CHECKLIST: 1, CHECKLIST_INDISPONIVEL: 0, SEM_TECNICO_DISPONIVEL: 0 },
  pendencias: [{ equipamentoId: 'eq-1', codigo: 'EQ-77', motivo: 'SEM_CATEGORIA' }, { equipamentoId: 'eq-2', codigo: 'EQ-88', motivo: 'CATEGORIA_SEM_CHECKLIST' }],
  distribuicaoPorTecnico: [{ tecnicoId: 'tech-1', nome: 'Rafael', quantidade: 5 }, { tecnicoId: 'tech-2', nome: 'Marina', quantidade: 4 }],
}

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function mockApi(overrides: Record<string, () => unknown> = {}) {
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (overrides[url as string]) return overrides[url as string]() as never
    if (url === '/campanhas-preventivas') return { data: listCampaigns } as never
    if (url === '/campanhas-preventivas/camp-1') return { data: baseCampaign } as never
    if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }, { id: 'hospital-2', nome: 'Clínica Norte', cnpj: '' }] } as never
    if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'UTI', nome: 'UTI Adulto' }, { id: 'sector-2', hospitalId: 'hospital-1', codigo: 'CC', nome: 'Centro Cirúrgico' }] } as never
    if (url === '/categorias-equipamento') return { data: [{ id: 'cat-1', nome: 'Monitor', ativa: true, checklistPadraoId: 'checklist-1' }, { id: 'cat-2', nome: 'Ventilador', ativa: true, checklistPadraoId: null }] } as never
    if (url === '/users') return { data: [
      { id: 'tech-1', codigo: 'T-1', nome: 'Rafael', email: 'rafael@test', role: 'tecnico', ativo: true },
      { id: 'tech-2', codigo: 'T-2', nome: 'Marina', email: 'marina@test', role: 'tecnico', ativo: true },
      { id: 'tech-3', codigo: 'T-3', nome: 'Inativo', email: 'inativo@test', role: 'tecnico', ativo: false },
    ] } as never
    if (url === '/users/tech-1/hospitais') return { data: ['hospital-1'] } as never
    if (url === '/users/tech-2/hospitais') return { data: ['hospital-2'] } as never
    if (url === '/users/tech-3/hospitais') return { data: ['hospital-1'] } as never
    return { data: [] } as never
  })
}

const rowOf = (name: string) => screen.getAllByRole('row').find((row) => within(row).queryByRole('link', { name })) as HTMLElement
const getCalls = (path: string) => vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === path)
const postCalls = (path: string) => vi.mocked(apiClient.post).mock.calls.filter(([url]) => url === path)

function renderList() { return render(<MemoryRouter><PreventiveCampaignsPage /></MemoryRouter>, { wrapper: Providers }) }
function renderFlow(initial = '/work-orders/campanhas/new') {
  return render(<MemoryRouter initialEntries={[initial]}><Routes>
    <Route path="/work-orders/campanhas" element={<PreventiveCampaignsPage />} />
    <Route path="/work-orders/campanhas/new" element={<PreventiveCampaignFormPage />} />
    <Route path="/work-orders/campanhas/:id" element={<PreventiveCampaignDetailPage />} />
  </Routes></MemoryRouter>, { wrapper: Providers })
}

type User = ReturnType<typeof userEvent.setup>
async function fillForm(user: User, { name = 'Preventiva semestral' }: { name?: string } = {}) {
  await user.type(await screen.findByRole('textbox', { name: 'Nome da campanha' }), name)
  await chooseOption(user, 'Hospital', 'Santa Casa')
  await user.click(await screen.findByRole('checkbox', { name: 'UTI · UTI Adulto' }))
  await user.click(screen.getByRole('checkbox', { name: 'Monitor' }))
  await chooseDate(user, 'Data de início', startDate)
}
const expectedBody = {
  hospitalId: 'hospital-1', nome: 'Preventiva semestral', setorIds: ['sector-1'], categoriaIds: ['cat-1'], dataInicio: startDate,
  recorrencia: 'avulsa', modoAtribuicao: 'equilibrado',
}

describe('Campanha de preventiva', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    mockApi()
    vi.mocked(apiClient.post).mockImplementation(async (url) => {
      if (url === '/campanhas-preventivas/previa') return { data: previewResponse } as never
      if (url === '/campanhas-preventivas') return { data: { id: 'camp-1', status: 'pendente' } } as never
      return { data: { ...baseCampaign, status: 'cancelada', ativa: false } } as never
    })
  })
  afterEach(() => { clearAuthSession(); vi.useRealTimers() })

  describe('lista', () => {
    it('mostra hospital, status, recorrência, próxima data e contadores da última execução', async () => {
      renderList()
      await screen.findByRole('link', { name: 'Preventiva semestral' })
      const row = rowOf('Preventiva semestral')
      expect(within(row).getByText('Santa Casa')).toBeInTheDocument()
      expect(within(row).getByText('Concluída')).toBeInTheDocument()
      expect(within(row).getByText('A cada 6 meses')).toBeInTheDocument()
      expect(within(row).getByText('10/05/2027')).toBeInTheDocument()
      expect(within(row).getByText(/7 geradas · 1 puladas · 2 pendências/)).toBeInTheDocument()
      const other = rowOf('Avulsa UTI')
      expect(within(other).getByText('Falhou')).toBeInTheDocument()
      expect(within(other).getByText('Avulsa')).toBeInTheDocument()
      expect(getCalls('/campanhas-preventivas')[0][1]).toEqual({ params: {} })
    })

    it('mantém a ação principal "Nova campanha" acessível como link para o formulário', async () => {
      renderList()
      await screen.findByRole('link', { name: 'Preventiva semestral' })
      expect(screen.getByRole('link', { name: 'Nova campanha' })).toHaveAttribute('href', '/work-orders/campanhas/new')
    })

    it('filtra por hospital e status enviando os parâmetros do contrato', async () => {
      const user = userEvent.setup()
      renderList()
      await screen.findByRole('link', { name: 'Preventiva semestral' })
      await chooseOption(user, 'Filtrar por hospital', 'Santa Casa')
      await chooseOption(user, 'Filtrar por status', 'Concluída')
      await waitFor(() => expect(getCalls('/campanhas-preventivas').at(-1)![1]).toEqual({ params: { hospitalId: 'hospital-1', status: 'concluida' } }))
    })

    it('mostra skeleton, EmptyState (com e sem filtro), erro com nova tentativa e 403', async () => {
      const user = userEvent.setup()
      mockApi({ '/campanhas-preventivas': () => new Promise(() => undefined) })
      const { unmount: unmountFirst } = renderList()
      expect(await screen.findByLabelText('Carregando campanhas')).toHaveAttribute('aria-busy', 'true')
      unmountFirst()

      mockApi({ '/campanhas-preventivas': () => ({ data: [] }) })
      const { unmount: unmountSecond } = renderList()
      expect(await screen.findByRole('heading', { name: 'Nenhuma campanha criada' })).toBeInTheDocument()
      await chooseOption(user, 'Filtrar por status', 'Falhou')
      expect(await screen.findByRole('heading', { name: 'Nenhuma campanha encontrada' })).toBeInTheDocument()
      unmountSecond()

      let fail = true
      mockApi({ '/campanhas-preventivas': () => { if (fail) throw httpError(500); return { data: listCampaigns } } })
      const { unmount: unmountThird } = renderList()
      expect(await screen.findByText('O servidor está indisponível no momento. Tente novamente em instantes.')).toBeInTheDocument()
      fail = false
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
      expect(await screen.findByRole('link', { name: 'Preventiva semestral' })).toBeInTheDocument()
      unmountThird()

      mockApi({ '/campanhas-preventivas': () => { throw httpError(403, { code: 'ACESSO_NEGADO' }) } })
      renderList()
      expect(await screen.findByText(/Acesso não permitido\. Apenas o administrador do cliente/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument()
    })
  })

  describe('nova campanha', () => {
    it('valida os campos obrigatórios com mensagens por campo e não chama a API', async () => {
      const user = userEvent.setup()
      renderFlow()
      await user.click(await screen.findByRole('button', { name: 'Gerar prévia' }))
      expect(await screen.findByText('Informe o nome da campanha.')).toBeInTheDocument()
      expect(screen.getByText('Selecione o hospital.')).toBeInTheDocument()
      expect(screen.getByText('Informe a data de início.')).toBeInTheDocument()
      expect(postCalls('/campanhas-preventivas/previa')).toHaveLength(0)
    })

    it('exige intervalo na recorrência periódica e técnico no modo "um técnico"', async () => {
      const user = userEvent.setup()
      renderFlow()
      await fillForm(user)
      await chooseOption(user, 'Recorrência', 'A cada N dias')
      await chooseOption(user, 'Atribuição das OTs', 'Um técnico')
      await user.click(screen.getByRole('button', { name: 'Gerar prévia' }))
      expect(await screen.findByText('Informe o intervalo da recorrência.')).toBeInTheDocument()
      expect(screen.getByText('Selecione o técnico responsável.')).toBeInTheDocument()
      await user.type(screen.getByRole('textbox', { name: 'Repetir a cada (dias)' }), 'abc')
      await user.click(screen.getByRole('button', { name: 'Gerar prévia' }))
      expect(await screen.findByText('Use um número inteiro de 1 a 9999.')).toBeInTheDocument()
      expect(postCalls('/campanhas-preventivas/previa')).toHaveLength(0)
    })

    it('lista só técnicos ativos vinculados ao hospital escolhido', async () => {
      const user = userEvent.setup()
      renderFlow()
      await fillForm(user)
      await chooseOption(user, 'Atribuição das OTs', 'Um técnico')
      await user.click(screen.getByRole('combobox', { name: 'Técnico' }))
      expect(within(await screen.findByRole('listbox')).getAllByRole('option').map((option) => option.textContent)).toEqual(['Rafael'])
    })

    it('a prévia envia o corpo exato, mostra contagens, distribuição e pendências por motivo com orientação', async () => {
      const user = userEvent.setup()
      renderFlow()
      await fillForm(user)
      await user.click(screen.getByRole('button', { name: 'Gerar prévia' }))
      const preview = await screen.findByRole('region', { name: 'Prévia da campanha' })
      await within(preview).findByText('OTs que serão geradas')
      expect(postCalls('/campanhas-preventivas/previa')[0][1]).toEqual(expectedBody)
      expect(within(preview).getByText('12')).toBeInTheDocument()
      expect(within(preview).getByText('9')).toBeInTheDocument()
      expect(within(preview).getByText(/Puladas \(já têm OT preventiva aberta/)).toBeInTheDocument()
      expect(within(preview).getByText('Rafael: 5 OTs')).toBeInTheDocument()
      const noCategory = within(preview).getByRole('region', { name: 'Pendências: Sem categoria' })
      expect(within(noCategory).getByText('Defina a categoria na ficha do equipamento.')).toBeInTheDocument()
      expect(within(noCategory).getByText('EQ-77')).toBeInTheDocument()
      const noChecklist = within(preview).getByRole('region', { name: 'Pendências: Categoria sem checklist padrão' })
      expect(within(noChecklist).getByText(/Vincule um checklist padrão à categoria/)).toBeInTheDocument()
      expect(within(preview).queryByRole('region', { name: 'Pendências: Sem técnico disponível' })).not.toBeInTheDocument()
    })

    it('envia recorrência, intervalo, janela e técnico quando preenchidos', async () => {
      const user = userEvent.setup()
      renderFlow()
      await fillForm(user)
      await chooseDate(user, 'Data final (opcional)', isoOf(addDays(parseDate(startDate)!, 3)))
      await chooseOption(user, 'Recorrência', 'A cada N meses')
      await user.type(screen.getByRole('textbox', { name: 'Repetir a cada (meses)' }), '6')
      await chooseOption(user, 'Atribuição das OTs', 'Um técnico')
      await chooseOption(user, 'Técnico', 'Rafael')
      await user.click(screen.getByRole('button', { name: 'Gerar prévia' }))
      await waitFor(() => expect(postCalls('/campanhas-preventivas/previa')).toHaveLength(1))
      expect(postCalls('/campanhas-preventivas/previa')[0][1]).toEqual({
        ...expectedBody, dataFim: isoOf(addDays(parseDate(startDate)!, 3)), recorrencia: 'meses', intervalo: 6, modoAtribuicao: 'tecnico', tecnicoId: 'tech-1',
      })
    })

    it('sem prévia atual o botão de criar fica desabilitado; qualquer mudança invalida a prévia', async () => {
      const user = userEvent.setup()
      renderFlow()
      await fillForm(user)
      expect(screen.getByRole('button', { name: 'Criar campanha' })).toBeDisabled()
      await user.click(screen.getByRole('button', { name: 'Gerar prévia' }))
      await screen.findByText('OTs que serão geradas')
      expect(screen.getByRole('button', { name: 'Criar campanha' })).toBeEnabled()
      await user.click(screen.getByRole('checkbox', { name: 'CC · Centro Cirúrgico' }))
      expect(screen.getByRole('button', { name: 'Criar campanha' })).toBeDisabled()
      expect(screen.getByText(/Gere a prévia novamente/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Gerar prévia' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Criar campanha' })).toBeEnabled())
      await user.type(screen.getByRole('textbox', { name: 'Nome da campanha' }), ' 2')
      expect(screen.getByRole('button', { name: 'Criar campanha' })).toBeDisabled()
    })

    it('confirma com o resumo, cria (202), vai ao painel e não envia duas vezes', async () => {
      const user = userEvent.setup()
      renderFlow()
      await fillForm(user)
      await user.click(screen.getByRole('button', { name: 'Gerar prévia' }))
      await screen.findByText('OTs que serão geradas')
      await user.click(screen.getByRole('button', { name: 'Criar campanha' }))
      const dialog = await screen.findByRole('dialog', { name: 'Confirmar campanha' })
      expect(within(dialog).getByText(/9 OTs serão geradas/)).toBeInTheDocument()
      expect(within(dialog).getByText(/1 equipamento pulado/)).toBeInTheDocument()
      const confirm = within(dialog).getByRole('button', { name: 'Confirmar e gerar OTs' })
      await user.dblClick(confirm)
      expect(await screen.findByRole('link', { name: 'Voltar às campanhas' })).toBeInTheDocument()
      await screen.findByRole('progressbar', { name: 'Progresso da geração de OTs' })
      expect(postCalls('/campanhas-preventivas')).toHaveLength(1)
      expect(postCalls('/campanhas-preventivas')[0][1]).toEqual(expectedBody)
      expect(toast.success).toHaveBeenCalledWith('Campanha criada. As OTs estão sendo geradas.')
    })

    it.each([
      ['HOSPITAL_INVALIDO', /hospital escolhido não existe/],
      ['SETOR_INVALIDO', /setor escolhido não pertence/],
      ['CATEGORIA_INVALIDA', /categoria escolhida não existe/],
      ['DATA_INICIO_NO_PASSADO', /não pode estar no passado/],
      ['JANELA_INVALIDA', /data final não pode ser anterior/],
      ['RECORRENCIA_INVALIDA', /Recorrência inválida/],
      ['JANELA_MAIOR_QUE_RECORRENCIA', /não pode alcançar a próxima repetição/],
      ['MODO_ATRIBUICAO_INVALIDO', /Modo de atribuição inválido/],
      ['TECNICO_OBRIGATORIO', /Selecione o técnico responsável/],
      ['TECNICO_INVALIDO', /inativo ou não está vinculado/],
    ])('mapeia o código %s da prévia para a mensagem em pt-BR', async (code, message) => {
      const user = userEvent.setup()
      vi.mocked(apiClient.post).mockRejectedValue(httpError(400, { code, detail: 'detalhe tecnico' }))
      renderFlow()
      await fillForm(user)
      await user.click(screen.getByRole('button', { name: 'Gerar prévia' }))
      expect(await screen.findByText(message)).toBeInTheDocument()
      expect(screen.queryByText('detalhe tecnico')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Criar campanha' })).toBeDisabled()
    })

    it('mostra erro geral (429, rede) sem perder o formulário e erro de criação no diálogo', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClient.post).mockRejectedValueOnce(httpError(429))
      renderFlow()
      await fillForm(user)
      await user.click(screen.getByRole('button', { name: 'Gerar prévia' }))
      expect(await screen.findByText('Muitas requisições em pouco tempo. Aguarde um instante e tente novamente.')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Nome da campanha' })).toHaveValue('Preventiva semestral')
      vi.mocked(apiClient.post).mockImplementation(async (url) => {
        if (url === '/campanhas-preventivas/previa') return { data: previewResponse } as never
        throw new Error('network')
      })
      await user.click(screen.getByRole('button', { name: 'Gerar prévia' }))
      await screen.findByText('OTs que serão geradas')
      await user.click(screen.getByRole('button', { name: 'Criar campanha' }))
      await user.click(await screen.findByRole('button', { name: 'Confirmar e gerar OTs' }))
      expect(await screen.findByText('Sem conexão com o servidor. Verifique sua rede e tente novamente.')).toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Confirmar campanha' })).toBeInTheDocument()
    })
  })

  describe('painel', () => {
    it('mostra OTs por situação, pendências por motivo e a próxima execução', async () => {
      renderFlow('/work-orders/campanhas/camp-1')
      expect(await screen.findByRole('heading', { name: 'Preventiva semestral', level: 2 })).toBeInTheDocument()
      const ots = screen.getByRole('region', { name: 'Situação das OTs' })
      expect(within(ots).getAllByRole('term').map((term) => term.textContent)).toEqual(['Total', 'Agendadas', 'Em execução', 'Concluídas', 'Canceladas', 'Atrasadas'])
      expect(within(ots).getAllByRole('definition').map((value) => value.textContent)).toEqual(['7', '5', '1', '1', '0', '1'])
      expect(screen.getByRole('status')).toHaveTextContent('10 de 10 equipamentos processados · 7 OTs geradas · 1 puladas · 2 pendências')
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
      expect(screen.getByText(/próxima execução 10\/05\/2027/)).toBeInTheDocument()
      expect(within(screen.getByRole('region', { name: 'Pendências: Sem categoria' })).getByText('EQ-77')).toBeInTheDocument()
      expect(getCalls('/campanhas-preventivas/camp-1')).toHaveLength(1)
    })

    it('atualiza por polling enquanto processa e para ao concluir', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const steps = [
        { ...baseCampaign, status: 'processando', execucao: { totalEquipamentos: 10, processadas: 3, geradas: 2, puladas: 0, pendencias: 0 } },
        { ...baseCampaign, status: 'processando', execucao: { totalEquipamentos: 10, processadas: 7, geradas: 5, puladas: 0, pendencias: 1 } },
        baseCampaign,
      ]
      let call = 0
      mockApi({ '/campanhas-preventivas/camp-1': () => ({ data: steps[Math.min(call++, steps.length - 1)] }) })
      renderFlow('/work-orders/campanhas/camp-1')
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Gerando OTs… 3 de 10/))
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30')
      await act(async () => { await vi.advanceTimersByTimeAsync(2100) })
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/7 de 10/))
      await act(async () => { await vi.advanceTimersByTimeAsync(2100) })
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Geração concluída\. 10 de 10/))
      const calls = getCalls('/campanhas-preventivas/camp-1').length
      expect(calls).toBe(3)
      await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
      expect(getCalls('/campanhas-preventivas/camp-1')).toHaveLength(calls)
    })

    it('para de consultar ao desmontar', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      mockApi({ '/campanhas-preventivas/camp-1': () => ({ data: { ...baseCampaign, status: 'processando' } }) })
      const view = renderFlow('/work-orders/campanhas/camp-1')
      await screen.findByRole('progressbar')
      view.unmount()
      const calls = getCalls('/campanhas-preventivas/camp-1').length
      await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
      expect(getCalls('/campanhas-preventivas/camp-1')).toHaveLength(calls)
    })

    it('cancela com confirmação e aviso de que as OTs geradas são mantidas', async () => {
      const user = userEvent.setup()
      renderFlow('/work-orders/campanhas/camp-1')
      await user.click(await screen.findByRole('button', { name: 'Cancelar campanha' }))
      const dialog = await screen.findByRole('dialog', { name: 'Cancelar campanha' })
      expect(within(dialog).getByText(/não são canceladas/)).toBeInTheDocument()
      expect(postCalls('/campanhas-preventivas/camp-1/cancelar')).toHaveLength(0)
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar campanha' }))
      await waitFor(() => expect(postCalls('/campanhas-preventivas/camp-1/cancelar')).toHaveLength(1))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(toast.success).toHaveBeenCalledWith('Campanha cancelada. As OTs já geradas foram mantidas.')
      expect(screen.getByText('Cancelada')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Cancelar campanha' })).not.toBeInTheDocument()
    })

    it('mostra erro no diálogo quando o cancelamento falha', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClient.post).mockRejectedValue(httpError(500))
      renderFlow('/work-orders/campanhas/camp-1')
      await user.click(await screen.findByRole('button', { name: 'Cancelar campanha' }))
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar campanha' }))
      expect(await screen.findByText('O servidor está indisponível no momento. Tente novamente em instantes.')).toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Cancelar campanha' })).toBeInTheDocument()
    })

    it('mostra skeleton, 404 e 403', async () => {
      mockApi({ '/campanhas-preventivas/camp-1': () => new Promise(() => undefined) })
      const { unmount: unmountFirst } = renderFlow('/work-orders/campanhas/camp-1')
      expect(await screen.findByLabelText('Carregando campanha')).toHaveAttribute('aria-busy', 'true')
      unmountFirst()
      mockApi({ '/campanhas-preventivas/camp-1': () => { throw httpError(404) } })
      const { unmount: unmountSecond } = renderFlow('/work-orders/campanhas/camp-1')
      expect(await screen.findByText(/Campanha não encontrada/)).toBeInTheDocument()
      unmountSecond()
      mockApi({ '/campanhas-preventivas/camp-1': () => { throw httpError(403) } })
      renderFlow('/work-orders/campanhas/camp-1')
      expect(await screen.findByText(/Acesso não permitido/)).toBeInTheDocument()
    })
  })

  describe('escopo pré-selecionado pela tela de Rotinas', () => {
    it('hospital e setor da URL já vêm marcados no formulário', async () => {
      renderFlow('/work-orders/campanhas/new?hospitalId=hospital-1&setorId=sector-2')
      expect(await screen.findByRole('combobox', { name: 'Hospital' })).toHaveTextContent('Santa Casa')
      expect(await screen.findByRole('checkbox', { name: 'CC · Centro Cirúrgico' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'UTI · UTI Adulto' })).not.toBeChecked()
    })

    it('só o hospital da URL deixa todos os setores desmarcados; setor sem hospital é ignorado', async () => {
      const { unmount } = renderFlow('/work-orders/campanhas/new?hospitalId=hospital-1')
      expect(await screen.findByRole('combobox', { name: 'Hospital' })).toHaveTextContent('Santa Casa')
      expect((await screen.findAllByRole('checkbox', { name: /^(UTI|CC) · / })).every((box) => !(box as HTMLInputElement).checked)).toBe(true)
      unmount()
      renderFlow('/work-orders/campanhas/new?setorId=sector-2')
      expect(await screen.findByRole('combobox', { name: 'Hospital' })).toHaveTextContent('Selecione um hospital')
    })
  })

  describe('acesso', () => {
    it('só o admin_cliente vê o item de menu e acessa a rota', () => {
      render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
      expect(screen.getByRole('link', { name: 'Ordens de Trabalho' })).toHaveAttribute('href', '/work-orders')
      clearAuthSession()
      setAuthSession('token', { id: 'technician-1', name: 'Rafael', roles: ['tecnico'], tenantId: 'tenant-1' })
      render(<MemoryRouter initialEntries={['/work-orders/campanhas']}><Routes>
        <Route path="/work-orders/campanhas" element={<RequireRole role="admin_cliente" allowPlatformAdmin={false} deniedTo="/access-denied"><PreventiveCampaignsPage /></RequireRole>} />
        <Route path="/access-denied" element={<h1>Acesso não permitido</h1>} />
      </Routes></MemoryRouter>, { wrapper: Providers })
      expect(screen.getByRole('heading', { name: 'Acesso não permitido' })).toBeInTheDocument()
    })

    it('o técnico não vê o item no menu', () => {
      clearAuthSession()
      setAuthSession('token', { id: 'technician-1', name: 'Rafael', roles: ['tecnico'], tenantId: 'tenant-1' })
      render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
      expect(screen.queryByRole('link', { name: 'Campanhas' })).not.toBeInTheDocument()
    })
  })
})
