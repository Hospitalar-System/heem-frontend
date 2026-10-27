import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type AxiosResponse } from 'axios'
import type { PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { pollInterval } from '../api/imports'
import { BatchImportPage } from '../pages/BatchImportPage'
import { createImportErrorsCsv } from '../types'

vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('@/lib/axios', () => ({ apiClient: { post: vi.fn(), get: vi.fn() } }))

const post = vi.mocked(apiClient.post)
const get = vi.mocked(apiClient.get)

function apiError(status: number, data: Record<string, unknown> = {}) {
  return new AxiosError('falha', 'ERR_BAD_REQUEST', undefined, undefined, { status, data, statusText: '', headers: {}, config: {} } as AxiosResponse)
}

const baseResult = { id: 'imp-1', tipo: 'equipamentos', status: 'pendente', total: 0, processadas: 0, criados: 0, ignorados: 0, comErro: 0, erros: [], errosTruncados: false, criadoEm: '2026-10-27T10:00:00Z', concluidoEm: null }
const rowErrors = [
  { linha: 7, codigo: 'EQ-7', code: 'CATEGORIA_NAO_ENCONTRADA', mensagem: 'Categoria nao encontrada ou desativada.' },
  { linha: 9, codigo: '=EQ-9', code: 'CAMPO_OBRIGATORIO', mensagem: "Coluna 'categoria' obrigatoria." },
]
const doneWithErrors = { ...baseResult, status: 'concluido', total: 10, processadas: 10, criados: 7, ignorados: 1, comErro: 2, erros: rowErrors, concluidoEm: '2026-10-27T10:01:00Z' }

function renderPage() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><BatchImportPage /></MemoryRouter></QueryClientProvider>)
}

function csvFile(name = 'ativos.csv', content = 'codigo;nome\nEQ-1;Monitor') {
  return new File([content], name, { type: 'text/csv' })
}

async function chooseAndSend(user: ReturnType<typeof userEvent.setup>, file = csvFile()) {
  await user.upload(screen.getByLabelText('Selecionar arquivo CSV'), file)
  await user.click(screen.getByRole('button', { name: 'Enviar para processamento' }))
}

describe('BatchImportPage conectada ao backend (Story 11.1)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'admin-1', name: 'Clara', roles: ['admin_cliente'], tenantId: 'tenant-1' })
  })

  afterEach(() => clearAuthSession())

  it('rejects empty and oversized files before any request', () => {
    renderPage()
    const input = screen.getByLabelText('Selecionar arquivo CSV')
    fireEvent.change(input, { target: { files: [csvFile('vazio.csv', '')] } })
    expect(screen.getByRole('alert')).toHaveTextContent('O arquivo está vazio')

    const big = csvFile('grande.csv', 'x')
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.change(input, { target: { files: [big] } })
    expect(screen.getByRole('alert')).toHaveTextContent('excede o limite de 5 MB')
    expect(screen.queryByText('grande.csv')).not.toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('posts multipart with exactly tipo and arquivo, shows upload progress and blocks double submit', async () => {
    const user = userEvent.setup()
    let resolvePost: (value: unknown) => void = () => undefined
    post.mockReturnValue(new Promise((resolve) => { resolvePost = resolve }) as never)
    get.mockResolvedValue({ data: baseResult } as never)
    renderPage()
    await user.click(screen.getByRole('radio', { name: /Setores/ }))
    await chooseAndSend(user, csvFile('setores.csv', 'hospital;codigo\nH;S1'))

    expect(post).toHaveBeenCalledTimes(1)
    const [url, form, config] = post.mock.calls[0] as unknown as [string, FormData, { headers: Record<string, string>; onUploadProgress: (e: { loaded: number; total: number }) => void }]
    expect(url).toBe('/importacoes')
    expect(Array.from(form as unknown as Iterable<[string, unknown]>, ([key]) => key).sort()).toEqual(['arquivo', 'tipo'])
    expect(form.get('tipo')).toBe('setores')
    expect((form.get('arquivo') as File).name).toBe('setores.csv')
    expect(config.headers['Content-Type']).toBe('multipart/form-data')

    act(() => config.onUploadProgress({ loaded: 50, total: 100 }))
    expect(screen.getByText(/Enviando arquivo… 50%/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progresso do envio do arquivo' })).toHaveAttribute('aria-valuenow', '50')
    const sendButton = screen.getByRole('button', { name: 'Enviar para processamento' })
    expect(sendButton).toBeDisabled()
    await user.click(sendButton)
    expect(post).toHaveBeenCalledTimes(1)

    await act(async () => resolvePost({ data: baseResult }))
    expect(await screen.findByText('Importação recebida e aguardando processamento.')).toBeInTheDocument()
  })

  it('polls the status until the import finishes, then stops, showing progress and counters', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      post.mockResolvedValue({ data: { ...baseResult, status: 'processando', total: 10, processadas: 2, criados: 2 } } as never)
      get.mockResolvedValueOnce({ data: { ...baseResult, status: 'processando', total: 10, processadas: 6, criados: 5, comErro: 1, erros: [rowErrors[0]] } } as never)
        .mockResolvedValue({ data: doneWithErrors } as never)
      renderPage()
      await chooseAndSend(user)

      expect(await screen.findByRole('status')).toHaveTextContent('Processando: 2 de 10 linhas.')
      await act(async () => { await vi.advanceTimersByTimeAsync(2100) })
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Processando: 6 de 10 linhas.'))
      expect(screen.getByRole('progressbar', { name: 'Progresso do processamento' })).toHaveAttribute('aria-valuenow', '6')
      await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
      await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importação concluída com erros: 7 criadas, 1 ignoradas e 2 com erro.'))

      const calls = get.mock.calls.length
      expect(get).toHaveBeenCalledWith('/importacoes/imp-1')
      await act(async () => { await vi.advanceTimersByTimeAsync(20000) })
      expect(get.mock.calls.length).toBe(calls)
    } finally {
      vi.useRealTimers()
    }
  })

  it('lists row errors, flags the unknown category and downloads the error report with BOM and semicolons', async () => {
    const user = userEvent.setup()
    post.mockResolvedValue({ data: doneWithErrors } as never)
    get.mockResolvedValue({ data: doneWithErrors } as never)
    const blobs: Blob[] = []
    const NativeURL = globalThis.URL
    vi.stubGlobal('URL', Object.assign(class extends NativeURL {}, { createObjectURL: (blob: Blob) => { blobs.push(blob); return 'blob:erros' }, revokeObjectURL: vi.fn() }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    try {
      renderPage()
      await chooseAndSend(user)

      const table = await screen.findByRole('table', { name: 'Erros por linha da importação' })
      expect(within(table).getByText(/Categoria não encontrada ou desativada/)).toBeInTheDocument()
      expect(within(table).getAllByText('categoria')).toHaveLength(2)
      expect(within(table).getByText('EQ-7')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Erros por linha (2)' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Baixar relatório de erros' }))
      const bytes = new Uint8Array(await blobs[0].arrayBuffer())
      expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
      const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)
      expect(text).toBe(createImportErrorsCsv(rowErrors))
      expect(text.split('\r\n')[0]).toBe('﻿linha;codigo;campo;erro;motivo')
      expect(text).toContain("9;'=EQ-9;categoria;CAMPO_OBRIGATORIO;Campo obrigatório não preenchido.")
    } finally {
      click.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it('shows an empty state when the import finishes without row errors and allows sending another file', async () => {
    const user = userEvent.setup()
    const clean = { ...doneWithErrors, criados: 9, ignorados: 1, comErro: 0, erros: [] }
    post.mockResolvedValue({ data: clean } as never)
    get.mockResolvedValue({ data: clean } as never)
    renderPage()
    await chooseAndSend(user)

    expect(await screen.findByText('Nenhum erro por linha')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Importação concluída com sucesso: 9 criadas e 1 ignoradas')
    await user.click(screen.getByRole('button', { name: 'Enviar outro arquivo' }))
    expect(screen.queryByText('Nenhum erro por linha')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar para processamento' })).toBeDisabled()
  })

  it('paginates long error lists and warns when the report is truncated', async () => {
    const user = userEvent.setup()
    const many = Array.from({ length: 45 }, (_, index) => ({ linha: index + 2, codigo: `EQ-${index}`, code: 'VALOR_INVALIDO', mensagem: "Valor invalido na coluna 'criticidade'." }))
    const result = { ...doneWithErrors, comErro: 60, erros: many, errosTruncados: true }
    post.mockResolvedValue({ data: result } as never)
    get.mockResolvedValue({ data: result } as never)
    renderPage()
    await chooseAndSend(user)

    expect(await screen.findByText(/apenas parte dos erros \(45 de 60\)/)).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()
    expect(screen.getAllByText('criticidade').length).toBeGreaterThan(0)
  })

  it('reports a failed import and lets the user refresh the status', async () => {
    const user = userEvent.setup()
    const failed = { ...baseResult, status: 'falhou', total: 10, processadas: 4, criados: 4 }
    post.mockResolvedValue({ data: failed } as never)
    get.mockResolvedValue({ data: { ...failed, status: 'concluido', processadas: 10, criados: 10 } } as never)
    renderPage()
    await chooseAndSend(user)

    expect(await screen.findByText(/A importação falhou após 4 de 10 linhas/)).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Atualizar status' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importação concluída com sucesso'))
  })

  it.each([
    [{ status: 400, code: 'ARQUIVO_VAZIO' }, /O arquivo está vazio/],
    [{ status: 400, code: 'CABECALHO_INVALIDO', detail: 'Colunas obrigatorias ausentes no cabecalho: categoria.' }, /cabeçalho do arquivo não bate com o modelo\. Colunas obrigatorias ausentes no cabecalho: categoria\./],
    [{ status: 400, code: 'IMPORTACAO_LINHAS_EXCEDIDAS' }, /limite de linhas/],
    [{ status: 400 }, /não foi aceito/],
    [{ status: 403 }, /não tem permissão para importar/],
    [{ status: 413, code: 'ARQUIVO_MUITO_GRANDE' }, /tamanho máximo/],
    [{ status: 429 }, /Muitas requisições/],
    [{ status: 503 }, /servidor está indisponível/],
  ])('shows a clear message for request failure %j and retries keeping the file', async (failure, message) => {
    const user = userEvent.setup()
    const { status, ...data } = failure
    post.mockRejectedValueOnce(apiError(status, data)).mockResolvedValueOnce({ data: baseResult } as never)
    get.mockResolvedValue({ data: baseResult } as never)
    renderPage()
    await chooseAndSend(user)

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByText('ativos.csv')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Importação recebida e aguardando processamento.')).toBeInTheDocument()
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('shows a network failure message and keeps the selected file', async () => {
    const user = userEvent.setup()
    post.mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
    renderPage()
    await chooseAndSend(user)
    expect(await screen.findByText(/Sem conexão com o servidor/)).toBeInTheDocument()
    expect(screen.getByText('ativos.csv')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar para processamento' })).toBeEnabled()
  })

  it('does not leak file content or row values to the console or browser storage', async () => {
    const user = userEvent.setup()
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) => vi.spyOn(console, method).mockImplementation(() => undefined))
    post.mockResolvedValue({ data: doneWithErrors } as never)
    get.mockResolvedValue({ data: doneWithErrors } as never)
    renderPage()
    await chooseAndSend(user, csvFile('seg.csv', 'codigo;nome\nSEGREDO-123;Paciente X'))
    await screen.findByRole('table')

    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled())
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('SEGREDO-123')
    expect(window.location.href).not.toContain('SEGREDO')
    spies.forEach((spy) => spy.mockRestore())
  })

  it('grows the polling interval slowly up to a ceiling', () => {
    expect(pollInterval(0)).toBe(2000)
    expect(pollInterval(2)).toBe(3000)
    expect(pollInterval(100)).toBe(5000)
  })
})
