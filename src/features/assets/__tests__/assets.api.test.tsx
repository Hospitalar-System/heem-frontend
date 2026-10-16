import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren } from 'react'
import { apiClient } from '@/lib/axios'
import { useEquipments, useHospitals, useSaveEquipment, useSectors, useUploadEquipmentPhoto } from '../api/assets'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/lib/demo-mode', () => ({ isDemoMode: false }))

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('asset queries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requests hospitals from the API', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] })
    const { result } = renderHook(() => useHospitals(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.get).toHaveBeenCalledWith('/hospitais')
  })

  it('requests sectors for the selected hospital only', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] })
    const { result } = renderHook(() => useSectors('hospital-1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.get).toHaveBeenCalledWith('/hospitais/hospital-1/setores')
  })

  it('passes the supported hospital and sector filters to the equipment endpoint', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] })
    const { result } = renderHook(() => useEquipments({ hospitalId: 'hospital-1', setorId: 'sector-2' }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.get).toHaveBeenCalledWith('/equipamentos', { params: { hospitalId: 'hospital-1', setorId: 'sector-2' } })
  })

  it('creates equipment with the backend payload', async () => {
    const equipment = { id: 'equipment-1' }
    const payload = { setorId: 'sector-1', codigo: 'EQ-10', nome: 'Bomba', modelo: '', numeroSerie: '', marca: '', fotoUrl: null, dadosGerais: {}, classeRiscoAnvisa: 'I', statusCicloVida: 'ATIVO', criticidade: 'MEDIA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_B', modoOperacao: 'CONTINUO', dataInstalacao: null, dataGarantiaFim: null }
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: equipment } as never)
    const { result } = renderHook(() => useSaveEquipment(), { wrapper })
    await result.current.mutateAsync({ data: payload as never })
    expect(apiClient.post).toHaveBeenCalledWith('/equipamentos', payload)
  })

  it('uploads photos directly to the signed storage URL', async () => {
    const put = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', put)
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { url: 'https://storage.invalid/signed', chave: 'tenant/foto.png', expiraEm: '2026-01-01T00:00:00Z' } } as never)
    const { result } = renderHook(() => useUploadEquipmentPhoto(), { wrapper })
    const file = new File(['foto'], 'foto.png', { type: 'image/png' })
    await result.current.mutateAsync(file)
    expect(apiClient.post).toHaveBeenCalledWith('/equipamentos/foto-upload-url', { nomeArquivo: 'foto.png' })
    expect(put).toHaveBeenCalledWith('https://storage.invalid/signed', { method: 'PUT', body: file })
    expect(apiClient.post).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
