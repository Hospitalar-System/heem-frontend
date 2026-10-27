import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useState, type PropsWithChildren } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { AssetsPage } from '../pages/AssetsPage'
import { chooseOption } from '@/test/select-helpers'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))

const base = {
  setorId: 'sector-1', modelo: 'X', numeroSerie: 'S', marca: 'M', fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'II', statusCicloVida: 'ATIVO',
  criticidade: 'MEDIA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_B', modoOperacao: 'CONTINUO', dataInstalacao: null, dataGarantiaFim: null, nivelRisco: 'BAIXO',
}
const items = [
  { ...base, id: 'e1', codigo: 'EQ-1', nome: 'Com vencidos', documentosVencidos: 2, documentosVencendo: 1, proximaValidade: '2026-10-01' },
  { ...base, id: 'e2', codigo: 'EQ-2', nome: 'Só vencendo', documentosVencidos: 0, documentosVencendo: 3, proximaValidade: '2026-11-05' },
  { ...base, id: 'e3', codigo: 'EQ-3', nome: 'Sem documentos', documentosVencidos: 0, documentosVencendo: 0, proximaValidade: null },
  { ...base, id: 'e4', codigo: 'EQ-4', nome: 'Campos ausentes' },
]

function wrapperAt(entry: string) {
  return function Wrapper({ children }: PropsWithChildren) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
    return <QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/assets" element={children} /></Routes></MemoryRouter></QueryClientProvider>
  }
}
const equipmentCalls = () => vi.mocked(apiClient.get).mock.calls.filter(([url]) => url === '/equipamentos').map(([, config]) => (config as { params: Record<string, unknown> }).params)

describe('AssetsPage documents filter and indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthSession()
    setAuthSession('token', { id: 'user-1', name: 'Ana', roles: ['admin_cliente'], tenantId: 'tenant-1' })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/hospitais') return { data: [{ id: 'hospital-1', nome: 'Santa Casa', cnpj: '' }] } as never
      if (url === '/equipamentos') return { data: items } as never
      if (url === '/hospitais/hospital-1/setores') return { data: [{ id: 'sector-1', hospitalId: 'hospital-1', codigo: 'ST-01', nome: 'UTI' }] } as never
      return { data: [] } as never
    })
  })
  afterEach(() => { vi.useRealTimers() })

  it('sends vencendoEm = today + 30 days (local civil date, no timezone drift) combined with other filters', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 11, 15, 23, 59))
    const user = userEvent.setup()
    render(<AssetsPage />, { wrapper: wrapperAt('/assets') })
    await screen.findByText('Com vencidos')
    expect(equipmentCalls().at(-1)?.vencendoEm).toBeUndefined()

    await chooseOption(user, 'Filtrar por hospital', 'Santa Casa')
    await chooseOption(user, 'Filtrar por documentos', 'Vencendo em 30 dias')
    await vi.waitFor(() => expect(equipmentCalls().at(-1)).toMatchObject({ hospitalId: 'hospital-1', vencendoEm: '2027-01-14' }))
    expect(equipmentCalls().at(-1)?.documentoVencido).toBeUndefined()
  })

  it('sends documentoVencido=true and drops vencendoEm when switching the option', async () => {
    const user = userEvent.setup()
    render(<AssetsPage />, { wrapper: wrapperAt('/assets') })
    await screen.findByText('Com vencidos')
    await chooseOption(user, 'Filtrar por documentos', 'Vencendo em 30 dias')
    await vi.waitFor(() => expect(equipmentCalls().at(-1)?.vencendoEm).toBeTruthy())
    await chooseOption(user, 'Filtrar por documentos', 'Documento vencido')
    await vi.waitFor(() => expect(equipmentCalls().at(-1)).toMatchObject({ documentoVencido: true }))
    expect(equipmentCalls().at(-1)?.vencendoEm).toBeUndefined()
    await chooseOption(user, 'Filtrar por documentos', 'Documentos: todos')
    await vi.waitFor(() => expect(equipmentCalls().at(-1)?.documentoVencido).toBeUndefined())
  })

  it.each([['vencendo', 'vencendoEm'], ['vencido', 'documentoVencido']])('reads the initial filter from ?documentos=%s', async (value, param) => {
    render(<AssetsPage />, { wrapper: wrapperAt(`/assets?documentos=${value}`) })
    await screen.findByText('Com vencidos')
    expect(equipmentCalls()[0]).toHaveProperty(param)
    expect(screen.getByRole('combobox', { name: 'Filtrar por documentos' })).toHaveTextContent(value === 'vencendo' ? 'Vencendo em 30 dias' : 'Documento vencido')
  })

  it('ignores an unknown ?documentos value', async () => {
    render(<AssetsPage />, { wrapper: wrapperAt('/assets?documentos=qualquer') })
    await screen.findByText('Com vencidos')
    expect(equipmentCalls()[0]?.vencendoEm).toBeUndefined()
    expect(equipmentCalls()[0]?.documentoVencido).toBeUndefined()
  })

  it('shows expired, expiring and next validity per row; dash when none or fields are missing', async () => {
    render(<AssetsPage />, { wrapper: wrapperAt('/assets') })
    const withExpired = await screen.findByRole('link', { name: 'Abrir EQ-1, Com vencidos' })
    expect(within(withExpired).getByText('2 vencidos')).toHaveClass('text-danger')
    expect(within(withExpired).getByText('1 vencendo')).toHaveClass('text-warning')
    expect(within(withExpired).getByText('Próx.: 01/10/2026')).toBeInTheDocument()
    expect(within(withExpired).getByLabelText('Documentos: 2 vencidos, 1 vencendo, próxima validade 01/10/2026')).toBeInTheDocument()

    const onlyExpiring = screen.getByRole('link', { name: 'Abrir EQ-2, Só vencendo' })
    expect(within(onlyExpiring).queryByText(/vencidos?$/)).not.toBeInTheDocument()
    expect(within(onlyExpiring).getByText('3 vencendo')).toBeInTheDocument()
    expect(within(onlyExpiring).getByText('Próx.: 05/11/2026')).toBeInTheDocument()

    for (const name of ['Abrir EQ-3, Sem documentos', 'Abrir EQ-4, Campos ausentes']) {
      expect(within(screen.getByRole('link', { name })).getByLabelText('Sem documentos com atenção')).toHaveTextContent('—')
    }
  })
})
