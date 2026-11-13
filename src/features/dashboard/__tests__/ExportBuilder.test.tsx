import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { chooseDate } from '@/test/date-helpers'
import { chooseOption } from '@/test/select-helpers'
import { ExportBuilder } from '../components/ExportBuilder'
import { buildExportBody, defaultExportValues, exportErrorMessage } from '../components/export-builder-model'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const pending = { data: { id: 'export-1', status: 'pendente', urlDownload: null } }

describe('ExportBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 12, 12) })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }], headers: {} } as never
      if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'ST-1', nome: 'UTI Adulto' }], headers: {} } as never
      if (url === '/campanhas-preventivas') return { data: [{ id: 'camp-1', nome: 'Campanha Outubro' }], headers: {} } as never
      if (url === '/relatorios/exportacoes/export-1') return { data: { id: 'export-1', status: 'concluido', urlDownload: 'https://storage.test/export.pdf' } } as never
      return { data: [], headers: {} } as never
    })
    vi.mocked(apiClient.post).mockResolvedValue(pending as never)
  })
  afterEach(() => vi.useRealTimers())

  it('monta o corpo com tipo, período, hospital, setor e formato; nível e orientação não são enviados', async () => {
    const user = userEvent.setup()
    render(<ExportBuilder />, { wrapper: TestProviders })
    await user.click(screen.getByRole('radio', { name: 'Ordens de trabalho' }))
    await chooseOption(user, 'Hospital da exportação', 'Santa Casa')
    await chooseOption(user, 'Setor da exportação', 'UTI Adulto')
    await user.click(screen.getByRole('radio', { name: 'CSV' }))
    await user.click(screen.getByRole('button', { name: 'Gerar relatório' }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1))
    expect(apiClient.post).toHaveBeenCalledWith('/relatorios/exportacoes', {
      conteudo: 'ordens_trabalho', formato: 'csv', desde: '2026-10-14T00:00:00.000Z', ate: '2026-11-12T23:59:59.999Z', hospitalId: 'hospital-1', setorId: 'sector-1',
    })
    const body = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>
    expect(body).not.toHaveProperty('nivel')
    expect(body).not.toHaveProperty('orientacao')
    expect(await screen.findByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('deixa nível e orientação visíveis, mas desabilitados e marcados como em breve', () => {
    render(<ExportBuilder />, { wrapper: TestProviders })
    expect(screen.getByRole('radio', { name: 'Resumo' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Paisagem' })).toBeDisabled()
    expect(screen.getAllByText(/Disponível em breve/)).toHaveLength(2)
  })

  it('o setor depende do hospital e volta a Todos ao trocar de hospital', async () => {
    const user = userEvent.setup()
    render(<ExportBuilder />, { wrapper: TestProviders })
    expect(screen.getByRole('combobox', { name: 'Setor da exportação' })).toBeDisabled()
    await chooseOption(user, 'Hospital da exportação', 'Santa Casa')
    await chooseOption(user, 'Setor da exportação', 'UTI Adulto')
    expect(screen.getByRole('combobox', { name: 'Setor da exportação' })).toHaveTextContent('UTI Adulto')
    await chooseOption(user, 'Hospital da exportação', 'Todos')
    expect(screen.getByRole('combobox', { name: 'Setor da exportação' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Setor da exportação' })).toHaveTextContent('Todos')
  })

  it('bloqueia período invertido: dias após o fim ficam desabilitados e nada é enviado', async () => {
    const user = userEvent.setup()
    render(<ExportBuilder />, { wrapper: TestProviders })
    await user.click(screen.getByRole('button', { name: 'Período de' }))
    await user.click(await screen.findByRole('button', { name: 'Próximo mês' }))
    expect(screen.getByRole('button', { name: '13 de novembro de 2026' })).toHaveAttribute('aria-disabled', 'true')
    await user.click(screen.getByRole('button', { name: '13 de novembro de 2026' }))
    expect(apiClient.post).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    await chooseDate(user, 'Período de', '2026-10-20')
    await user.click(screen.getByRole('button', { name: 'Gerar relatório' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/relatorios/exportacoes', expect.objectContaining({ desde: '2026-10-20T00:00:00.000Z' })))
  })

  it('campanha exige a campanha escolhida e envia só campanhaId e formato (sem período)', async () => {
    const user = userEvent.setup()
    render(<ExportBuilder />, { wrapper: TestProviders })
    await user.click(screen.getByRole('radio', { name: 'Campanha preventiva' }))
    expect(screen.queryByRole('button', { name: 'Período de' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Gerar relatório' }))
    expect(await screen.findByText('Escolha a campanha.')).toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()

    await chooseOption(user, 'Campanha', 'Campanha Outubro')
    await user.click(screen.getByRole('radio', { name: 'XLSX' }))
    await user.click(screen.getByRole('button', { name: 'Gerar relatório' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/relatorios/exportacoes', { conteudo: 'campanha', formato: 'xlsx', campanhaId: 'camp-1' }))
  })

  it('mostra Gerando… enquanto solicita', async () => {
    const user = userEvent.setup()
    let resolvePost!: (value: unknown) => void
    vi.mocked(apiClient.post).mockReturnValueOnce(new Promise((resolve) => { resolvePost = resolve }) as never)
    render(<ExportBuilder />, { wrapper: TestProviders })
    await user.click(screen.getByRole('button', { name: 'Gerar relatório' }))
    expect(await screen.findByRole('button', { name: 'Gerando…' })).toBeDisabled()
    resolvePost(pending)
    expect(await screen.findByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Gerando… Chamados em PDF/)
  })
})

describe('ExportBuilder: acompanhamento e download automático', () => {
  let clicks: Array<{ href: string; download: string }>
  let openSpy: ReturnType<typeof vi.spyOn>
  let getExport: ReturnType<typeof vi.fn>

  const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })
  async function generate() {
    render(<ExportBuilder />, { wrapper: TestProviders })
    fireEvent.click(screen.getByRole('button', { name: 'Gerar relatório' }))
    await tick(0)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ now: new Date(2026, 10, 12, 12) })
    clicks = []
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) { clicks.push({ href: this.href, download: this.download }) })
    getExport = vi.fn(async () => ({ data: { id: 'export-1', status: 'pendente', urlDownload: null } }))
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/relatorios/exportacoes/export-1') return getExport() as never
      return { data: [], headers: {} } as never
    })
    vi.mocked(apiClient.post).mockResolvedValue(pending as never)
  })
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

  it('acompanha o status e, ao concluir, baixa uma única vez por âncora com download (sem window.open)', async () => {
    await generate()
    expect(screen.getByRole('status')).toHaveTextContent('Gerando… Chamados em PDF')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await tick(1500)
    expect(getExport).toHaveBeenCalledTimes(1)
    expect(clicks).toHaveLength(0)
    getExport.mockResolvedValue({ data: { id: 'export-1', status: 'concluido', urlDownload: 'https://storage.test/export.pdf?sig=1' } })
    await tick(2000)
    expect(clicks).toEqual([{ href: 'https://storage.test/export.pdf?sig=1', download: 'relatorio-chamados-2026-11-12.pdf' }])
    expect(openSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Relatório baixado')
    expect(screen.getByRole('button', { name: 'Baixar novamente' })).toHaveFocus()
    await tick(20_000)
    expect(clicks).toHaveLength(1)
    expect(getExport).toHaveBeenCalledTimes(2)
  })

  it('o intervalo cresce de 1,5 s até 5 s', async () => {
    await generate()
    await tick(1500)
    await tick(1950)
    await tick(2535)
    await tick(3300)
    expect(getExport).toHaveBeenCalledTimes(4)
    const before = getExport.mock.calls.length
    await tick(5000)
    await tick(5000)
    expect(getExport.mock.calls.length - before).toBe(2)
  })

  it('cancelar interrompe o polling e não baixa', async () => {
    await generate()
    await tick(1500)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    getExport.mockResolvedValue({ data: { id: 'export-1', status: 'concluido', urlDownload: 'https://storage.test/export.pdf' } })
    await tick(30_000)
    expect(getExport).toHaveBeenCalledTimes(1)
    expect(clicks).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gerar relatório' })).toBeEnabled()
  })

  it('exportação que falhou mostra a mensagem e Tentar de novo recomeça com o mesmo corpo', async () => {
    getExport.mockResolvedValue({ data: { id: 'export-1', status: 'falhou', urlDownload: null } })
    await generate()
    await tick(1500)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível gerar o relatório.')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toHaveFocus()
    getExport.mockResolvedValue({ data: { id: 'export-1', status: 'concluido', urlDownload: 'https://storage.test/export.pdf' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await tick(1500)
    expect(apiClient.post).toHaveBeenCalledTimes(2)
    expect(vi.mocked(apiClient.post).mock.calls[1][1]).toEqual(vi.mocked(apiClient.post).mock.calls[0][1])
    expect(clicks).toHaveLength(1)
  })

  it('erro de rede ao consultar mostra mensagem e permite tentar de novo', async () => {
    getExport.mockRejectedValue(new Error('network'))
    await generate()
    await tick(1500)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível consultar o andamento')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('passados ~3 minutos sem concluir mostra erro de tempo esgotado', async () => {
    await generate()
    await tick(185_000)
    expect(screen.getByRole('alert')).toHaveTextContent('demorando mais que o esperado')
    const calls = getExport.mock.calls.length
    await tick(60_000)
    expect(getExport.mock.calls.length).toBe(calls)
    expect(clicks).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('Baixar novamente baixa de novo, buscando URL nova', async () => {
    getExport.mockResolvedValue({ data: { id: 'export-1', status: 'concluido', urlDownload: 'https://storage.test/a.pdf?sig=1' } })
    await generate()
    await tick(1500)
    expect(clicks).toHaveLength(1)
    getExport.mockResolvedValue({ data: { id: 'export-1', status: 'concluido', urlDownload: 'https://storage.test/a.pdf?sig=2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Baixar novamente' }))
    await tick(0)
    expect(clicks).toHaveLength(2)
    expect(clicks[1].href).toBe('https://storage.test/a.pdf?sig=2')
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('503 SERVICO_OCUPADO mostra mensagem amigável e permite tentar de novo', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { status: 503, data: { code: 'SERVICO_OCUPADO' } } })
    await generate()
    expect(screen.getByRole('alert')).toHaveTextContent(/serviço de relatórios está ocupado/)
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await tick(0)
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })
})

describe('modelo do construtor de exportação', () => {
  it('padrão são os últimos 30 dias e setor sem hospital não é enviado', () => {
    const values = defaultExportValues(new Date(2026, 10, 12))
    expect(values.desde).toBe('2026-10-14')
    expect(values.ate).toBe('2026-11-12')
    expect(buildExportBody({ ...values, setorId: 'sector-1' })).not.toHaveProperty('setorId')
  })

  it('traduz erros por code', () => {
    expect(exportErrorMessage({ response: { data: { code: 'CAMPANHA_NAO_ENCONTRADA' } } })).toMatch(/Campanha não encontrada/)
    expect(exportErrorMessage({ response: { data: { code: 'X_Y' } } })).toContain('X_Y')
  })
})
