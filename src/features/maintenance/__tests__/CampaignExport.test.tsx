import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays, isoOf, parseDate, todayCivil } from '@/components/ui/civil-date'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { chooseDate } from '@/test/date-helpers'
import { chooseOption } from '@/test/select-helpers'
import { PreventiveCampaignDetailPage } from '../pages/PreventiveCampaignDetailPage'
import { PreventiveCampaignFormPage } from '../pages/PreventiveCampaignFormPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const httpError = (status: number, data: Record<string, unknown> = {}) => Object.assign(new Error('http'), { response: { status, data } })
const campaign = {
  id: 'camp-1', hospitalId: 'hospital-1', nome: 'Preventiva semestral', setorIds: [], categoriaIds: [], dataInicio: '2026-11-10', dataFim: null,
  recorrencia: 'meses', intervalo: 6, proximaData: '2027-05-10', modoAtribuicao: 'equilibrado', tecnicoId: null, status: 'concluida', ativa: true,
  janelaAtual: '2026-11-10', execucao: { totalEquipamentos: 10, processadas: 10, geradas: 7, puladas: 1, pendencias: 2 },
  ots: { total: 7, agendadas: 5, emExecucao: 1, concluidas: 1, canceladas: 0, atrasadas: 1 },
  pendenciasDetalhe: [
    { equipamentoId: 'eq-1', codigo: 'EQ-77', motivo: 'SEM_CATEGORIA' },
    { equipamentoId: 'eq-2', codigo: 'EQ-88', motivo: 'CATEGORIA_SEM_CHECKLIST' },
  ],
  puladasDetalhe: [{ equipamentoId: 'eq-9', codigo: 'EQ-99', motivo: 'JA_TEM_OT_PREVENTIVA_ABERTA', otCodigo: 'OT-2026-0042' }],
  criadaEm: '2026-10-01T10:00:00Z', canceladaEm: null,
}
const startDate = isoOf(addDays(parseDate(isoOf(todayCivil()))!, 40))
const exportUrl = 'https://files.example.test/relatorio-campanha.pdf'

function Providers({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

let exportGet: (url: string) => Promise<never> = async () => ({ data: [] } as never)
function renderDetail(data: unknown = campaign) {
  vi.mocked(apiClient.get).mockImplementation(async (url) => {
    if (url === '/campanhas-preventivas/camp-1') return { data } as never
    if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }] } as never
    return exportGet(url as string)
  })
  return render(<MemoryRouter initialEntries={['/work-orders/campanhas/camp-1']}><Routes><Route path="/work-orders/campanhas/:id" element={<PreventiveCampaignDetailPage />} /></Routes></MemoryRouter>, { wrapper: Providers })
}
const exportPosts = () => vi.mocked(apiClient.post).mock.calls.filter(([url]) => url === '/relatorios/exportacoes')
const exportGets = () => vi.mocked(apiClient.get).mock.calls.filter(([url]) => String(url).startsWith('/relatorios/exportacoes/'))
const exportButton = () => screen.findByRole('button', { name: 'Exportar relatório' })

describe('Exportar relatório da campanha (F4.10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'exp-1', status: 'pendente', urlDownload: null } } as never)
    exportGet = async () => ({ data: { id: 'exp-1', status: 'concluido', urlDownload: exportUrl } } as never)
  })
  afterEach(() => { clearAuthSession(); vi.useRealTimers() })

  it('o botão só aparece para o admin_cliente', async () => {
    clearAuthSession()
    setAuthSession('token', { id: 'tech-1', name: 'Rafael', roles: ['tecnico'], tenantId: 'tenant-1' })
    renderDetail()
    expect(await screen.findByRole('heading', { name: 'Preventiva semestral', level: 2 })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Exportar relatório' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Formato do relatório' })).not.toBeInTheDocument()
  })

  it.each([['PDF', 'pdf'], ['Planilha (XLSX)', 'xlsx'], ['CSV', 'csv']])('envia o corpo exato para %s', async (label, formato) => {
    const user = userEvent.setup()
    renderDetail()
    const button = await exportButton()
    if (formato !== 'pdf') await chooseOption(user, 'Formato do relatório', label)
    await user.click(button)
    await waitFor(() => expect(exportPosts()).toHaveLength(1))
    expect(exportPosts()[0][1]).toEqual({ conteudo: 'campanha', formato, campanhaId: 'camp-1', ...(formato === 'pdf' ? { nivel: 'COMPLETO' } : {}) })
  })

  it('seletor de nível (padrão Completo) só vale para PDF e envia RESUMO quando escolhido', async () => {
    const user = userEvent.setup()
    renderDetail()
    const button = await exportButton()
    await chooseOption(user, 'Nível do relatório', 'Resumo')
    await user.click(button)
    await waitFor(() => expect(exportPosts()).toHaveLength(1))
    expect(exportPosts()[0][1]).toEqual({ conteudo: 'campanha', formato: 'pdf', campanhaId: 'camp-1', nivel: 'RESUMO' })
    await chooseOption(user, 'Formato do relatório', 'CSV')
    expect(screen.queryByRole('combobox', { name: 'Nível do relatório' })).not.toBeInTheDocument()
  })

  it('acompanha até concluir, baixa sozinho uma vez, oferece baixar de novo e para de consultar', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const steps = [{ id: 'exp-1', status: 'pendente', urlDownload: null }, { id: 'exp-1', status: 'concluido', urlDownload: exportUrl }]
    let call = 0
    exportGet = async () => ({ data: steps[Math.min(call++, steps.length - 1)] } as never)
    renderDetail()
    await user.click(await exportButton())
    expect(await screen.findByText(/Gerando…/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Exportar relatório' })).toBeDisabled()
    await act(async () => { await vi.advanceTimersByTimeAsync(2100) })
    const link = await screen.findByRole('link', { name: 'Baixar novamente' })
    expect(link).toHaveAttribute('href', exportUrl)
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText('Relatório baixado')).toBeInTheDocument()
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(clickSpy.mock.instances[0]).toHaveProperty('href', exportUrl)
    const calls = exportGets().length
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    expect(exportGets()).toHaveLength(calls)
    expect(screen.getByRole('button', { name: 'Exportar relatório' })).toBeEnabled()
  })

  it('permite novo pedido depois de concluído', async () => {
    const user = userEvent.setup()
    renderDetail()
    await user.click(await exportButton())
    await screen.findByRole('link', { name: 'Baixar novamente' })
    await user.click(screen.getByRole('button', { name: 'Exportar relatório' }))
    await waitFor(() => expect(exportPosts()).toHaveLength(2))
  })

  it('mostra a falha e permite tentar de novo', async () => {
    const user = userEvent.setup()
    exportGet = async () => ({ data: { id: 'exp-1', status: 'falhou', urlDownload: null } } as never)
    renderDetail()
    await user.click(await exportButton())
    expect(await screen.findByText('Não foi possível gerar o relatório.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Baixar novamente' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(exportPosts()).toHaveLength(2))
    expect(exportPosts()[1][1]).toEqual({ conteudo: 'campanha', formato: 'pdf', campanhaId: 'camp-1' })
  })

  it('não envia duas vezes enquanto solicita', async () => {
    const user = userEvent.setup()
    let resolve!: (value: never) => void
    vi.mocked(apiClient.post).mockReturnValue(new Promise<never>((done) => { resolve = done }))
    renderDetail()
    const button = await exportButton()
    await user.click(button)
    await user.click(button)
    expect(exportPosts()).toHaveLength(1)
    expect(button).toBeDisabled()
    expect(screen.getByText('Solicitando…')).toBeInTheDocument()
    await act(async () => { resolve({ data: { id: 'exp-1', status: 'pendente', urlDownload: null } } as never) })
    await screen.findByRole('link', { name: 'Baixar novamente' })
  })

  it.each([
    ['404 campanha inexistente', httpError(404, { code: 'CAMPANHA_NAO_ENCONTRADA' }), /Campanha não encontrada/],
    ['400 validação', httpError(400, { code: 'VALIDACAO_FALHOU', detail: 'campanhaId é obrigatório' }), /campanhaId é obrigatório/],
    ['403', httpError(403), /Acesso não permitido/],
    ['429', httpError(429), /Muitas requisições/],
    ['500', httpError(500), /indisponível/],
    ['rede', new Error('Network Error'), /Sem conexão/],
  ])('mostra a mensagem de erro para %s', async (_name, error, message) => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockRejectedValue(error)
    renderDetail()
    await user.click(await exportButton())
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('button', { name: 'Exportar relatório' })).toBeEnabled()
  })

  it('mostra erro ao consultar o andamento e deixa tentar de novo', async () => {
    const user = userEvent.setup()
    let fail = true
    exportGet = async () => {
      if (fail) throw httpError(500)
      return { data: { id: 'exp-1', status: 'concluido', urlDownload: exportUrl } } as never
    }
    renderDetail()
    await user.click(await exportButton())
    expect(await screen.findByText('Não foi possível consultar o andamento do relatório.')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('link', { name: 'Baixar novamente' })).toBeInTheDocument()
  })

  it('não oferece download com esquema diferente de http(s)', async () => {
    const user = userEvent.setup()
    exportGet = async () => ({ data: { id: 'exp-1', status: 'concluido', urlDownload: 'javascript:alert(1)' } } as never)
    renderDetail()
    await user.click(await exportButton())
    expect(await screen.findByText(/Link de download indisponível/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Baixar novamente' })).not.toBeInTheDocument()
  })
})

describe('Resumo e puladas no painel da campanha (F4.10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    exportGet = async () => ({ data: [] } as never)
  })
  afterEach(() => clearAuthSession())

  it('mostra o resumo com previstas e % de execução (concluídas ÷ geradas)', async () => {
    renderDetail()
    const summary = await screen.findByRole('region', { name: 'Resumo da campanha' })
    const terms = within(summary).getAllByRole('term').map((term) => term.textContent)
    const values = within(summary).getAllByRole('definition').map((value) => value.textContent)
    expect(Object.fromEntries(terms.map((term, index) => [term, values[index]]))).toEqual({
      Previstas: '10', Geradas: '7', 'Concluídas': '1', 'Em andamento': '1', Agendadas: '5', Canceladas: '0', Atrasadas: '1', Puladas: '1', 'Pendências': '2', '% de execução': '14,3%',
    })
    expect(summary).toHaveTextContent('Pendências por motivo: Sem categoria (1) · Categoria sem checklist padrão (1)')
  })

  it('sem OTs geradas o percentual fica em traço', async () => {
    renderDetail({ ...campaign, ots: { ...campaign.ots, total: 0, concluidas: 0 } })
    const summary = await screen.findByRole('region', { name: 'Resumo da campanha' })
    expect(within(summary).getAllByRole('definition').at(-1)).toHaveTextContent('—')
  })

  it('lista as puladas com o motivo em pt-BR e a OT aberta', async () => {
    renderDetail()
    const table = within(await screen.findByRole('region', { name: 'Puladas da campanha' })).getByRole('table', { name: 'Equipamentos pulados' })
    const row = within(table).getAllByRole('row').find((item) => item.textContent?.includes('EQ-99')) as HTMLElement
    expect(row).toHaveTextContent('Já tem OT preventiva aberta')
    expect(row).toHaveTextContent('OT-2026-0042')
    expect(screen.queryByText(/Mostrando \d+ de \d+ equipamentos pulados/)).not.toBeInTheDocument()
  })

  it('avisa quando a lista de puladas veio truncada e mostra motivo desconhecido cru', async () => {
    renderDetail({ ...campaign, execucao: { ...campaign.execucao, puladas: 1500 }, puladasDetalhe: [{ equipamentoId: 'eq-9', codigo: 'EQ-99', motivo: 'MOTIVO_NOVO', otCodigo: null }] })
    const region = await screen.findByRole('region', { name: 'Puladas da campanha' })
    expect(within(region).getByText('MOTIVO_NOVO')).toBeInTheDocument()
    expect(region).toHaveTextContent('Mostrando 1 de 1500 equipamentos pulados.')
  })

  it('sem puladas mostra a mensagem vazia', async () => {
    renderDetail({ ...campaign, execucao: { ...campaign.execucao, puladas: 0 }, puladasDetalhe: [] })
    expect(await screen.findByText('Nenhum equipamento foi pulado.')).toBeInTheDocument()
  })
})

describe('Puladas na prévia da campanha (F4.10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }] } as never
      if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'UTI', nome: 'UTI Adulto' }] } as never
      if (url === '/categorias-equipamento') return { data: [{ id: 'cat-1', nome: 'Monitor', ativa: true, checklistPadraoId: 'checklist-1' }] } as never
      return { data: [] } as never
    })
  })
  afterEach(() => clearAuthSession())

  it('mostra as puladas com motivo e o aviso de truncamento', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockResolvedValue({ data: {
      totalEquipamentos: 400, aGerar: 100, puladas: 300, totalPendencias: 0, pendenciasPorMotivo: {}, pendencias: [], distribuicaoPorTecnico: [],
      puladasDetalhe: [{ equipamentoId: 'eq-9', codigo: 'EQ-99', motivo: 'JA_TEM_OT_PREVENTIVA_ABERTA', otCodigo: 'OT-2026-0042' }],
    } } as never)
    render(<MemoryRouter initialEntries={['/work-orders/campanhas/new']}><Routes><Route path="/work-orders/campanhas/new" element={<PreventiveCampaignFormPage />} /></Routes></MemoryRouter>, { wrapper: Providers })
    await user.type(await screen.findByRole('textbox', { name: 'Nome da campanha' }), 'Preventiva')
    await chooseOption(user, 'Hospital', 'Santa Casa')
    await user.click(await screen.findByRole('checkbox', { name: 'UTI · UTI Adulto' }))
    await user.click(screen.getByRole('checkbox', { name: 'Monitor' }))
    await chooseDate(user, 'Data de início', startDate)
    await user.click(screen.getByRole('button', { name: 'Gerar prévia' }))
    const table = await screen.findByRole('table', { name: 'Equipamentos pulados' })
    const row = within(table).getAllByRole('row').find((item) => item.textContent?.includes('EQ-99')) as HTMLElement
    expect(row).toHaveTextContent('Já tem OT preventiva aberta')
    expect(row).toHaveTextContent('OT-2026-0042')
    expect(screen.getByText('Mostrando 1 de 300 equipamentos pulados.')).toBeInTheDocument()
  })
})
