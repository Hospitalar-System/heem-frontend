import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { ReportsPage } from '../pages/ReportsPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'user-1', name: 'Ana', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }] } as never
      if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'ST-1', nome: 'UTI Adulto' }] } as never
      if (url === '/relatorios/indicadores') return { data: { mtbfHoras: 286, tempoMedioAtendimentoHoras: 2.4, tempoMedioResolucaoHoras: 8.1, disponibilidadePercentual: 97.4, qtdOtsPreventivas: 23, qtdOtsCorretivas: 8 } } as never
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
    expect(screen.getByText('2,4 h')).toBeInTheDocument()
    expect(screen.getByText('97,4%')).toBeInTheDocument()
    expect(screen.getByText('Conformidade por nível de risco')).toBeInTheDocument()
    expect(screen.getByText('94%')).toBeInTheDocument()
    expect(screen.getAllByText(/API ainda não disponibiliza essa agregação/)).toHaveLength(2)
  })

  it('filters requests and exports selected content, then offers the completed download', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />, { wrapper: TestProviders })
    await screen.findByText('286 h')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Hospital' }), 'hospital-1')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Setor' }), 'sector-1')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Conteúdo da exportação' }), 'ordens_trabalho')
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
    await user.selectOptions(screen.getByRole('combobox', { name: 'Conteúdo da exportação' }), 'INDICADORES')
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

  it('rejects an invalid date range without requesting a report', async () => {
    render(<ReportsPage />, { wrapper: TestProviders })
    await screen.findByText('286 h')
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-07-31' } })
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-07-01' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe um período válido')
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})
