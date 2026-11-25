import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { EquipmentPartsSection } from '../components/EquipmentPartsSection'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn() } }))

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter></QueryClientProvider>
}

/** Story 25.2: aba "Peças trocadas" da ficha do equipamento. */
describe('EquipmentPartsSection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists the parts with the ticket link, centered quantity and "—" for a missing code', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [
      { id: 'p1', chamadoId: 'ticket-1', chamadoCodigo: 'CH-41', descricao: 'Bateria 12V 7Ah', quantidade: 2, codigo: 'BAT-12', registradoEm: '2026-11-16T13:00:00Z' },
      { id: 'p2', chamadoId: 'ticket-1', chamadoCodigo: 'CH-41', descricao: 'Cabo de alimentação', quantidade: 1, codigo: null, registradoEm: '2026-11-16T12:00:00Z' },
    ] } as never)
    render(<EquipmentPartsSection equipmentId="equipment-1" />, { wrapper: TestProviders })
    expect(await screen.findByText('Bateria 12V 7Ah')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/equipamentos/equipment-1/pecas-trocadas')
    expect(screen.getAllByRole('link', { name: 'CH-41' })[0]).toHaveAttribute('href', '/tickets/ticket-1')
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows the empty state', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] } as never)
    render(<EquipmentPartsSection equipmentId="equipment-1" />, { wrapper: TestProviders })
    expect(await screen.findByText('Nenhuma peça trocada')).toBeInTheDocument()
  })

  it('shows a recoverable error', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('falhou'))
    render(<EquipmentPartsSection equipmentId="equipment-1" />, { wrapper: TestProviders })
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as peças trocadas')
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
