import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { chooseOption } from '@/test/select-helpers'
import { dossieEquipamentoBody, laudoOtBody } from '../api/documents'
import { ExportBuilder } from '../components/ExportBuilder'
import type { ExportFiltersSummary } from '../components/ExportBuilder'
import { EXPORT_BACKEND_SUPPORT, buildExportBody, defaultExportValues } from '../components/export-builder-model'
import { GenerateDocumentButton } from '../components/GenerateDocumentButton'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const filters: ExportFiltersSummary = { desde: '2026-10-14', ate: '2026-11-12', hospitalId: '', setorId: '', hospitalName: 'Todos', sectorName: 'Todos', invalidRange: false, onEditFilters: () => undefined }
const original = { ...EXPORT_BACKEND_SUPPORT }
const pending = { data: { id: 'doc-1', status: 'pendente', urlDownload: null } }
const done = { data: { id: 'doc-1', status: 'concluido', urlDownload: 'https://storage.test/doc.pdf' } }

describe('flags do construtor de exportação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], headers: {} } as never)
    vi.mocked(apiClient.post).mockResolvedValue(pending as never)
  })
  afterEach(() => Object.assign(EXPORT_BACKEND_SUPPORT, original))

  it('com as flags desligadas esconde Emergências e os filtros de OT e não os envia', async () => {
    const user = userEvent.setup()
    render(<ExportBuilder filters={filters} />, { wrapper: TestProviders })
    expect(screen.queryByRole('radio', { name: 'Emergências' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Ordens de trabalho' }))
    expect(screen.queryByRole('combobox', { name: 'Tipo da OT' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Status da OT' })).not.toBeInTheDocument()
    const values = { ...defaultExportValues(), conteudo: 'ordens_trabalho' as const, tipoOt: 'corretiva' as const, statusOt: 'concluida' as const }
    expect(buildExportBody(values)).not.toHaveProperty('tipo')
    expect(buildExportBody(values)).not.toHaveProperty('status')
  })

  it('com a flag ligada mostra Emergências (retrato) e envia o conteúdo emergencias', async () => {
    EXPORT_BACKEND_SUPPORT.emergencias = true
    const user = userEvent.setup()
    render(<ExportBuilder filters={filters} />, { wrapper: TestProviders })
    await user.click(screen.getByRole('radio', { name: 'Emergências' }))
    expect(screen.getByRole('radio', { name: 'Retrato' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Gerar relatório' }))
    expect(apiClient.post).toHaveBeenCalledWith('/relatorios/exportacoes', expect.objectContaining({ conteudo: 'emergencias', formato: 'pdf', orientacao: 'RETRATO', nivel: 'COMPLETO' }))
  })

  it('filtros de OT: só em Ordens de trabalho, e tipo/status só vão no corpo quando escolhidos', async () => {
    EXPORT_BACKEND_SUPPORT.filtrosOt = true
    const user = userEvent.setup()
    render(<ExportBuilder filters={filters} />, { wrapper: TestProviders })
    expect(screen.queryByRole('combobox', { name: 'Tipo da OT' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Ordens de trabalho' }))
    await user.click(screen.getByRole('radio', { name: 'CSV' }))
    await user.click(screen.getByRole('button', { name: 'Gerar relatório' }))
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).not.toHaveProperty('tipo')
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).not.toHaveProperty('status')
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await chooseOption(user, 'Tipo da OT', 'Corretiva')
    await chooseOption(user, 'Status da OT', 'Em execução')
    await user.click(screen.getByRole('button', { name: 'Gerar relatório' }))
    expect(vi.mocked(apiClient.post).mock.calls[1][1]).toMatchObject({ conteudo: 'ordens_trabalho', formato: 'csv', tipo: 'corretiva', status: 'em_execucao' })
    await user.click(screen.getByRole('radio', { name: 'Chamados' }))
    expect(screen.queryByRole('combobox', { name: 'Tipo da OT' })).not.toBeInTheDocument()
  })
})

describe('GenerateDocumentButton', () => {
  let clickSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.clearAllMocks()
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(apiClient.post).mockResolvedValue(pending as never)
    vi.mocked(apiClient.get).mockResolvedValue(done as never)
  })
  afterEach(() => { clickSpy.mockRestore(); vi.useRealTimers() })

  const renderButton = (body: Record<string, unknown> = laudoOtBody('ot-1')) => render(<GenerateDocumentButton label="Gerar laudo da OT" body={body} filename="laudo.pdf" />, { wrapper: TestProviders })

  it('corpos dos documentos', () => {
    expect(laudoOtBody('ot-1')).toEqual({ conteudo: 'laudo_ot', formato: 'pdf', ordemTrabalhoId: 'ot-1' })
    expect(dossieEquipamentoBody('eq-1')).toEqual({ conteudo: 'dossie_equipamento', formato: 'pdf', equipamentoId: 'eq-1' })
  })

  it('gera, acompanha, baixa sozinho uma vez e permite baixar de novo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderButton()
    await user.click(screen.getByRole('button', { name: 'Gerar laudo da OT' }))
    expect(apiClient.post).toHaveBeenCalledWith('/relatorios/exportacoes', { conteudo: 'laudo_ot', formato: 'pdf', ordemTrabalhoId: 'ot-1' })
    expect(await screen.findByRole('button', { name: 'Gerando…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
    expect(apiClient.get).toHaveBeenCalledWith('/relatorios/exportacoes/doc-1')
    expect(await screen.findByText('Baixado')).toBeInTheDocument()
    expect(clickSpy).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Baixar novamente' }))
    expect(clickSpy).toHaveBeenCalledTimes(2)
  })

  it('cancelar para o acompanhamento e volta ao estado inicial', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderButton(dossieEquipamentoBody('eq-1'))
    await user.click(screen.getByRole('button', { name: 'Gerar laudo da OT' }))
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(apiClient.get).not.toHaveBeenCalled()
    expect(clickSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Gerar laudo da OT' })).toBeEnabled()
  })

  it('falha mostra o erro e Tentar de novo refaz o POST', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(apiClient.post).mockRejectedValueOnce({ response: { status: 503, data: { code: 'SERVICO_OCUPADO' } } }).mockResolvedValue(pending as never)
    renderButton()
    await user.click(screen.getByRole('button', { name: 'Gerar laudo da OT' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('ocupado')
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(1600) })
    expect(apiClient.post).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('Baixado')).toBeInTheDocument()
  })
})
