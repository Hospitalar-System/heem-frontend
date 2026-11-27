import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { chooseOption } from '@/test/select-helpers'
import { ExportBuilder } from '../components/ExportBuilder'
import type { ExportFiltersSummary } from '../components/ExportBuilder'
import { buildExportBody, dataReferenciaError, defaultExportValues, exportErrorMessage } from '../components/export-builder-model'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const baseFilters: ExportFiltersSummary = { desde: '2026-10-14', ate: '2026-11-12', hospitalId: 'hospital-1', setorId: 'sector-1', invalidRange: false }
const renderBuilder = (filters: Partial<ExportFiltersSummary> = {}) => render(<ExportBuilder filters={{ ...baseFilters, ...filters }} />, { wrapper: TestProviders })
const users = [
  { id: 'tec-1', codigo: 'T1', nome: 'Rafael Costa', email: 'r@x', role: 'tecnico', ativo: true },
  { id: 'tec-2', codigo: 'T2', nome: 'Inativo', email: 'i@x', role: 'tecnico', ativo: false },
  { id: 'adm-1', codigo: 'A1', nome: 'Clara Mendes', email: 'c@x', role: 'admin_cliente', ativo: true },
]

describe('ExportBuilder: produtividade, evolução e posição do parque (Stories 23.3, 24.3 e 24.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 12, 12) })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/users') return { data: users, headers: {} } as never
      return { data: [], headers: {} } as never
    })
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'export-1', status: 'pendente', urlDownload: null } } as never)
  })
  afterEach(() => vi.useRealTimers())

  it('modelo: produtividade leva técnico e hospital, nunca setor; posição leva a data de referência no lugar do período', () => {
    const base = { ...defaultExportValues(new Date(2026, 10, 12)), hospitalId: 'hospital-1', setorId: 'sector-1', formato: 'csv' as const }
    const prod = buildExportBody({ ...base, conteudo: 'produtividade', tecnicoId: 'tec-1' })
    expect(prod).toMatchObject({ conteudo: 'produtividade', hospitalId: 'hospital-1', tecnicoId: 'tec-1' })
    expect(prod).not.toHaveProperty('setorId')
    expect(prod.desde).toBeTruthy()
    const pos = buildExportBody({ ...base, conteudo: 'posicao_parque', dataReferencia: '2026-11-01' })
    expect(pos).toEqual({ conteudo: 'posicao_parque', formato: 'csv', dataReferencia: '2026-11-01', hospitalId: 'hospital-1', setorId: 'sector-1' })
    const evo = buildExportBody({ ...base, conteudo: 'evolucao_parque' })
    expect(evo).toMatchObject({ conteudo: 'evolucao_parque', hospitalId: 'hospital-1', setorId: 'sector-1' })
    expect(evo).not.toHaveProperty('tecnicoId')
  })

  it('modelo: data de referência obrigatória e nunca no futuro; DATA_FUTURA do servidor vira texto', () => {
    const hoje = new Date(2026, 10, 12, 12)
    expect(dataReferenciaError('', hoje)).toBe('Informe a data de referência.')
    expect(dataReferenciaError('2026-11-13', hoje)).toBe('A data de referência não pode estar no futuro.')
    expect(dataReferenciaError('2026-11-12', hoje)).toBeNull()
    expect(exportErrorMessage({ response: { status: 400, data: { code: 'DATA_FUTURA' } } })).toBe('A data de referência não pode estar no futuro.')
  })

  it('produtividade: escolhe o técnico (só técnicos ativos) e envia sem setor', async () => {
    const user = userEvent.setup()
    renderBuilder()
    await chooseOption(user, 'Conteúdo da exportação', 'Produtividade dos técnicos')
    expect(screen.getByText(/o setor não se aplica/)).toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Técnico' }))
    expect(await screen.findByRole('option', { name: 'Rafael Costa' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Inativo' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'Clara Mendes' })).toBeNull()
    await user.click(screen.getByRole('option', { name: 'Rafael Costa' }))
    await user.click(screen.getByRole('button', { name: 'Exportar CSV' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalled())
    const body = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, string>
    expect(body).toMatchObject({ conteudo: 'produtividade', formato: 'csv', tecnicoId: 'tec-1', hospitalId: 'hospital-1' })
    expect(body).not.toHaveProperty('setorId')
  })

  it('posição do parque: usa a data de referência (padrão hoje) mesmo com o período da página inválido', async () => {
    const user = userEvent.setup()
    renderBuilder({ invalidRange: true })
    await chooseOption(user, 'Conteúdo da exportação', 'Posição do parque numa data')
    expect(screen.getByRole('button', { name: 'Data de referência' })).toBeInTheDocument()
    const csv = screen.getByRole('button', { name: 'Exportar CSV' })
    expect(csv).toBeEnabled()
    await user.click(csv)
    await waitFor(() => expect(apiClient.post).toHaveBeenCalled())
    const body = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, string>
    expect(body).toMatchObject({ conteudo: 'posicao_parque', dataReferencia: '2026-11-12', hospitalId: 'hospital-1', setorId: 'sector-1' })
    expect(body).not.toHaveProperty('desde')
  })
})
