import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { EquipmentLabelsSection } from '../components/EquipmentLabelsSection'
import { chooseOption } from '@/test/select-helpers'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const activeLabel = {
  id: 'label-1', equipamentoId: 'equipment-1', valor: 'QR-EQ-001', tipo: 'qr' as const,
  vinculadoPor: 'user-1', vinculadoEm: '2026-10-15T10:30:00Z',
}

function TestProviders({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('EquipmentLabelsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] } as never)
  })

  it('loads active labels and submits trimmed values with the selected type', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockResolvedValue({ data: activeLabel, status: 201 } as never)
    render(<EquipmentLabelsSection equipmentId="equipment-1" />, { wrapper: TestProviders })

    expect(await screen.findByText('Nenhuma etiqueta ativa')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Vincular etiqueta' }))
    await user.type(screen.getByRole('textbox', { name: 'Valor da etiqueta' }), '  EQ-01  ')
    await chooseOption(user, 'Tipo', 'Código de barras')
    await user.click(screen.getByRole('button', { name: 'Confirmar vínculo' }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/equipamentos/equipment-1/etiquetas', { valor: 'EQ-01', tipo: 'barras' }))
    expect(await screen.findByRole('button', { name: 'Vincular etiqueta' })).toBeInTheDocument()
  })

  it('shows the ETIQUETA_EM_USO error and preserves the entered value', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockRejectedValue({ response: { status: 409, data: { code: 'ETIQUETA_EM_USO', detail: 'Etiqueta ativa em EQ-02 · Ventilador' } } })
    render(<EquipmentLabelsSection equipmentId="equipment-1" />, { wrapper: TestProviders })

    await user.click(await screen.findByRole('button', { name: 'Vincular etiqueta' }))
    const input = screen.getByRole('textbox', { name: 'Valor da etiqueta' })
    await user.type(input, 'DUPLICADA-01')
    await user.click(screen.getByRole('button', { name: 'Confirmar vínculo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ETIQUETA_EM_USO: Etiqueta ativa em EQ-02 · Ventilador')
    expect(input).toHaveValue('DUPLICADA-01')
    expect(screen.getByText(/não fornece o ID do equipamento atual/i)).toBeInTheDocument()
  })

  it('treats a 200 response for an already linked label as idempotent', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockResolvedValue({ data: activeLabel, status: 200 } as never)
    vi.mocked(apiClient.get).mockImplementation(async () => ({ data: [activeLabel] }) as never)
    render(<EquipmentLabelsSection equipmentId="equipment-1" />, { wrapper: TestProviders })

    await user.click(await screen.findByRole('button', { name: 'Vincular etiqueta' }))
    await user.type(screen.getByRole('textbox', { name: 'Valor da etiqueta' }), activeLabel.valor)
    await user.click(screen.getByRole('button', { name: 'Confirmar vínculo' }))

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('button', { name: `Desvincular etiqueta ${activeLabel.valor}` })).toBeInTheDocument()
    expect(screen.getAllByText(activeLabel.valor)).toHaveLength(1)
  })

  it('requires confirmation before unlinking and refreshes the active list after success', async () => {
    const user = userEvent.setup()
    let reads = 0
    vi.mocked(apiClient.get).mockImplementation(async () => ({ data: reads++ === 0 ? [activeLabel] : [] }) as never)
    vi.mocked(apiClient.delete).mockResolvedValue({ status: 204 } as never)
    render(<EquipmentLabelsSection equipmentId="equipment-1" />, { wrapper: TestProviders })

    await user.click(await screen.findByRole('button', { name: 'Desvincular etiqueta QR-EQ-001' }))
    expect(screen.getByRole('dialog', { name: 'Desvincular etiqueta?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desvincular' }))

    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/equipamentos/equipment-1/etiquetas/label-1'))
    expect(await screen.findByText('Nenhuma etiqueta ativa')).toBeInTheDocument()
  })
})
