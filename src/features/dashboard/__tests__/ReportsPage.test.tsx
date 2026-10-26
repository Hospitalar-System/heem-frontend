import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { ReportsPage } from '../pages/ReportsPage'
import { chooseOption } from '@/test/select-helpers'
import { chooseDate } from '@/test/date-helpers'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const preventiva = { atrasadas: 2, concluidasNoPrazo: 19, concluidasForaDoPrazo: 3, percentualNoPrazo: 86.4, canceladas: 1 }
const indicatorsFixture = {
  mtbfHoras: 286, mttaHoras: 2.4, triagemHoras: 3.7, mttrHoras: 8.1, esperaPecaHoras: 12.5, slaAtendimentoPct: 91.3, slaResolucaoPct: 84.7,
  disponibilidadePercentual: 97.4, qtdOtsPreventivas: 23, qtdOtsCorretivas: 8, severidadesConsideradas: ['ALTA', 'CRITICA'], preventiva,
  grupos: [
    { grupoId: 'hospital-1', grupoNome: 'Santa Casa', mtbfHoras: 300, mttaHoras: 1.1, triagemHoras: null, mttrHoras: 6.6, esperaPecaHoras: null, slaAtendimentoPct: 95, slaResolucaoPct: 90, disponibilidadePercentual: 99, qtdOtsPreventivas: 15, qtdOtsCorretivas: 5, preventiva },
    { grupoId: 'hospital-2', grupoNome: 'Clínica Norte', mtbfHoras: null, mttaHoras: null, triagemHoras: null, mttrHoras: null, esperaPecaHoras: null, slaAtendimentoPct: null, slaResolucaoPct: null, disponibilidadePercentual: 100, qtdOtsPreventivas: 0, qtdOtsCorretivas: 0, preventiva },
  ],
}
const backlogFixture = {
  porSeveridade: [
    { severidade: 'BAIXA', ate24h: 1, de1a3Dias: 0, maisDe3Dias: 0, total: 1 },
    { severidade: 'MEDIA', ate24h: 0, de1a3Dias: 0, maisDe3Dias: 0, total: 0 },
    { severidade: 'ALTA', ate24h: 2, de1a3Dias: 3, maisDe3Dias: 4, total: 9 },
    { severidade: 'CRITICA', ate24h: 0, de1a3Dias: 1, maisDe3Dias: 0, total: 1 },
  ],
  total: 11,
}
const topFixture = [
  { equipamentoId: 'eq-1', codigo: 'EQ-1', nome: 'Ventilador', qtdChamados: 3, mtbfHoras: 120.5 },
  { equipamentoId: 'eq-2', codigo: 'EQ-2', nome: 'Monitor', qtdChamados: 7, mtbfHoras: null },
  { equipamentoId: 'eq-3', codigo: null, nome: null, qtdChamados: 5, mtbfHoras: 48 },
]

function rowNames(table: HTMLElement) {
  return within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('rowheader')[0].textContent)
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'user-1', name: 'Ana', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }] } as never
      if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'ST-1', nome: 'UTI Adulto' }] } as never
      if (url === '/relatorios/indicadores') return { data: indicatorsFixture } as never
      if (url === '/relatorios/backlog') return { data: backlogFixture } as never
      if (url === '/relatorios/top-equipamentos') return { data: topFixture } as never
      if (url === '/relatorios/conformidade') return { data: [{ nivelRisco: 'CRITICO', percentualConforme: 94, totalMedicoes: 16 }] } as never
      if (url === '/relatorios/exportacoes/export-1') return { data: { id: 'export-1', status: 'concluido', urlDownload: 'https://storage.test/export.pdf' } } as never
      if (url === '/relatorios/exportacoes/export-xlsx') return { data: { id: 'export-xlsx', status: 'concluido', urlDownload: 'https://storage.test/export.xlsx' } } as never
      return { data: [] } as never
    })
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'export-1', status: 'pendente', urlDownload: null } } as never)
  })

  it('shows API indicators and omits Figma demo values', async () => {
    render(<ReportsPage />, { wrapper: TestProviders })

    expect(await screen.findByText('286 h')).toBeInTheDocument()
    const cards = within(screen.getByRole('region', { name: 'Indicadores do período' }))
    expect(cards.getByRole('article', { name: 'MTTA — tempo médio de atendimento' })).toHaveTextContent('2,4 h')
    expect(cards.getByRole('article', { name: 'MTTR — tempo médio de resolução' })).toHaveTextContent('8,1 h')
    expect(cards.getByRole('article', { name: 'Disponibilidade média' })).toHaveTextContent('97,4%')
    expect(cards.getByRole('article', { name: 'SLA de atendimento cumprido' })).toHaveTextContent('91,3%')
    expect(cards.getByRole('article', { name: 'SLA de resolução cumprido' })).toHaveTextContent('84,7%')
    expect(screen.getByText('Conformidade por nível de risco')).toBeInTheDocument()
    expect(screen.getByText('94%')).toBeInTheDocument()
    expect(screen.queryByText(/API ainda não disponibiliza essa agregação/)).not.toBeInTheDocument()
  })

  it('pede os indicadores com agrupar=hospital e não usa campos deprecated', async () => {
    render(<ReportsPage />, { wrapper: TestProviders })
    await screen.findByText('286 h')
    expect(apiClient.get).toHaveBeenCalledWith('/relatorios/indicadores', { params: expect.objectContaining({ agrupar: 'hospital', desde: expect.any(String), ate: expect.any(String) }) })
    expect(screen.queryByText('Tempo médio de atendimento')).not.toBeInTheDocument()
  })

  it('explica MTTA, MTTR e MTBF e mostra as severidades da disponibilidade', async () => {
    render(<ReportsPage />, { wrapper: TestProviders })
    const legend = within(await screen.findByRole('region', { name: 'Legenda dos indicadores' }))
    expect(legend.getByText(/da abertura do chamado até a primeira resposta/)).toBeInTheDocument()
    expect(legend.getByText(/até o chamado ser resolvido/)).toBeInTheDocument()
    expect(legend.getByText(/intervalo médio entre aberturas de chamados do mesmo equipamento/)).toBeInTheDocument()
    expect(legend.getByText(/Severidades consideradas na disponibilidade: ALTA, CRITICA/)).toBeInTheDocument()
  })

  it('mostra os KPIs de preventiva', async () => {
    render(<ReportsPage />, { wrapper: TestProviders })
    const section = within(await screen.findByRole('region', { name: 'Ordens de trabalho no período' }))
    expect(section.getByRole('group', { name: 'Preventivas atrasadas' })).toHaveTextContent('2')
    expect(section.getByRole('group', { name: 'Concluídas no prazo' })).toHaveTextContent('19')
    expect(section.getByRole('group', { name: 'Preventivas no prazo' })).toHaveTextContent('86,4%')
  })

  it('mostra a tabela agrupada com traços para valores sem dado e troca para setor', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />, { wrapper: TestProviders })
    const table = await screen.findByRole('table', { name: 'Indicadores por hospital' })
    const north = within(table).getByRole('row', { name: /Clínica Norte/ })
    expect(within(north).getAllByText('—').length).toBeGreaterThanOrEqual(5)
    expect(within(within(table).getByRole('row', { name: /Santa Casa/ })).getByText('6,6 h')).toBeInTheDocument()
    await chooseOption(user, 'Agrupar por', 'Setor')
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/relatorios/indicadores', { params: expect.objectContaining({ agrupar: 'setor' }) }))
  })

  it('renderiza o backlog por severidade e faixa de idade e ordena pelas colunas', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />, { wrapper: TestProviders })
    const table = await screen.findByRole('table', { name: /Backlog de chamados/ })
    expect(screen.getByLabelText('Total do backlog')).toHaveTextContent('11')
    expect(rowNames(table)).toEqual(['Crítica', 'Alta', 'Média', 'Baixa'])
    await user.click(within(table).getByRole('button', { name: 'Mais de 3 dias' }))
    expect(rowNames(table)[0]).toBe('Alta')
    expect(within(table).getByRole('columnheader', { name: 'Mais de 3 dias' })).toHaveAttribute('aria-sort', 'descending')
  })

  it('renderiza o top de equipamentos, ordena e trata equipamento excluído e MTBF nulo', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />, { wrapper: TestProviders })
    const table = await screen.findByRole('table', { name: 'Equipamentos com mais chamados no período' })
    expect(rowNames(table).map((name) => name?.replace(/EQ-\d/, ''))).toEqual(['Monitor', 'Equipamento excluído', 'Ventilador'])
    expect(within(table).getByText('120,5 h')).toBeInTheDocument()
    await user.click(within(table).getByRole('button', { name: 'MTBF' }))
    // MTBF nulo (Monitor) fica no fim em qualquer direção.
    expect(rowNames(table)[2]).toMatch(/^Monitor/)
    expect(apiClient.get).toHaveBeenCalledWith('/relatorios/top-equipamentos', { params: expect.objectContaining({ n: 10, desde: expect.any(String) }) })
  })

  it('envia hospital e setor ao backlog (sem período) e ao top de equipamentos', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />, { wrapper: TestProviders })
    await screen.findByText('286 h')
    expect(apiClient.get).toHaveBeenCalledWith('/relatorios/backlog', { params: {} })
    await chooseOption(user, 'Hospital', 'Santa Casa')
    await chooseOption(user, 'Setor', 'UTI Adulto')
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/relatorios/backlog', { params: { hospitalId: 'hospital-1', setorId: 'sector-1' } }))
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/relatorios/top-equipamentos', { params: expect.objectContaining({ hospitalId: 'hospital-1', setorId: 'sector-1', n: 10 }) }))
    expect(apiClient.get).toHaveBeenCalledWith('/relatorios/indicadores', { params: expect.objectContaining({ hospitalId: 'hospital-1', setorId: 'sector-1', agrupar: 'hospital' }) })
  })

  it('mostra estados vazios para backlog e top sem dados, sem erro', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/relatorios/indicadores') return { data: { ...indicatorsFixture, grupos: [] } } as never
      if (url === '/relatorios/backlog') return { data: { porSeveridade: [], total: 0 } } as never
      if (url === '/relatorios/top-equipamentos') return { data: [] } as never
      return { data: [] } as never
    })
    render(<ReportsPage />, { wrapper: TestProviders })
    expect(await screen.findByText('Nenhum chamado em aberto para os filtros selecionados.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum chamado aberto no período para os filtros selecionados.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum grupo encontrado para os filtros selecionados.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('mostra skeletons enquanto backlog e top carregam', async () => {
    vi.mocked(apiClient.get).mockImplementation((url) => {
      if (url === '/relatorios/backlog' || url === '/relatorios/top-equipamentos') return new Promise(() => {}) as never
      return Promise.resolve({ data: url === '/relatorios/indicadores' ? indicatorsFixture : [] }) as never
    })
    render(<ReportsPage />, { wrapper: TestProviders })
    expect(await screen.findByLabelText('Carregando backlog')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByLabelText('Carregando equipamentos com mais chamados')).toBeInTheDocument()
  })

  it('mostra o ProblemDetail de 403 em backlog e top sem derrubar os indicadores e permite tentar de novo', async () => {
    const user = userEvent.setup()
    const forbidden = { response: { status: 403, data: { detail: 'Acesso negado ao relatório.' } } }
    let denied = true
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/relatorios/backlog' && denied) throw forbidden
      if (url === '/relatorios/top-equipamentos') throw forbidden
      if (url === '/relatorios/indicadores') return { data: indicatorsFixture } as never
      if (url === '/relatorios/backlog') return { data: backlogFixture } as never
      return { data: [] } as never
    })
    render(<ReportsPage />, { wrapper: TestProviders })
    expect(await screen.findByText('286 h')).toBeInTheDocument()
    expect((await screen.findAllByText('Acesso negado ao relatório.')).length).toBe(2)
    denied = false
    await user.click(screen.getAllByRole('button', { name: 'Tentar novamente' })[0])
    expect(await screen.findByLabelText('Total do backlog')).toHaveTextContent('11')
  })

  it('mostra a mensagem padrão quando o erro não traz ProblemDetail', async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/relatorios/indicadores') throw { response: { status: 403, data: {} } }
      if (url === '/relatorios/backlog') return { data: backlogFixture } as never
      return { data: [] } as never
    })
    render(<ReportsPage />, { wrapper: TestProviders })
    expect(await screen.findByText('Não foi possível carregar os indicadores.')).toBeInTheDocument()
  })

  it('filters requests and exports selected content, then offers the completed download', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />, { wrapper: TestProviders })
    await screen.findByText('286 h')
    await chooseOption(user, 'Hospital', 'Santa Casa')
    await chooseOption(user, 'Setor', 'UTI Adulto')
    await chooseOption(user, 'Conteúdo da exportação', 'Ordens de trabalho')
    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/relatorios/exportacoes', expect.objectContaining({
      hospitalId: 'hospital-1', setorId: 'sector-1', conteudo: 'ordens_trabalho', formato: 'pdf',
    })))
    expect(await screen.findByRole('link', { name: 'Baixar arquivo' })).toHaveAttribute('href', 'https://storage.test/export.pdf')
  })

  it('exporta os indicadores filtrados com o conteúdo INDICADORES sem bloquear a tela', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 'export-xlsx', status: 'pendente', urlDownload: null } } as never)
    render(<ReportsPage />, { wrapper: TestProviders })
    expect(await screen.findByText('286 h')).toBeInTheDocument()
    await chooseOption(user, 'Conteúdo da exportação', 'Indicadores')
    await user.click(screen.getByRole('button', { name: 'Exportar Excel' }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/relatorios/exportacoes', expect.objectContaining({
      conteudo: 'INDICADORES', formato: 'xlsx',
    })))
    expect(await screen.findByRole('link', { name: 'Baixar arquivo' })).toHaveAttribute('href', 'https://storage.test/export.xlsx')
    expect(screen.getByRole('region', { name: 'Indicadores do período' })).toBeInTheDocument()
  })

  it('informa que a solicitação está sendo enviada sem bloquear os indicadores', async () => {
    const user = userEvent.setup()
    let resolvePost!: (value: { data: { id: string; status: string; urlDownload: null } }) => void
    const pendingPost = new Promise<{ data: { id: string; status: string; urlDownload: null } }>((resolve) => { resolvePost = resolve })
    vi.mocked(apiClient.post).mockReturnValueOnce(pendingPost as never)
    render(<ReportsPage />, { wrapper: TestProviders })
    await screen.findByText('286 h')

    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Solicitando exportação')
    expect(screen.getByRole('region', { name: 'Indicadores do período' })).toBeInTheDocument()
    resolvePost({ data: { id: 'export-1', status: 'pendente', urlDownload: null } })
    expect(await screen.findByRole('link', { name: 'Baixar arquivo' })).toHaveAttribute('href', 'https://storage.test/export.pdf')
  })

  it('impede um período invertido: dias anteriores ao início ficam desabilitados', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />, { wrapper: TestProviders })
    await screen.findByText('286 h')
    await chooseDate(user, 'Data inicial', '2026-07-31')
    await user.click(screen.getByRole('button', { name: 'Data final' }))
    while (screen.getByTestId('datepicker-title').textContent !== 'julho de 2026') await user.click(screen.getByRole('button', { name: 'Mês anterior' }))
    expect(screen.getByRole('button', { name: '1 de julho de 2026' })).toHaveAttribute('aria-disabled', 'true')
    await user.click(screen.getByRole('button', { name: '1 de julho de 2026' }))
    expect(screen.getByRole('button', { name: 'Data final' })).not.toHaveTextContent('01/07/2026')
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})
