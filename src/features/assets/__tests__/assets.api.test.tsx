import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren } from 'react'
import { apiClient } from '@/lib/axios'
import { useCategories, useDeactivateCategory, useMarkCategoryReviewed, useMergeCategory, useSaveCategory } from '../api/categories'
import { useEquipments, useHospitals, useSaveEquipment, useSectors, useUploadEquipmentPhoto } from '../api/assets'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
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

describe('category queries', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists categories with the ativa and revisar filters only when set', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] })
    const { result: unfiltered } = renderHook(() => useCategories(), { wrapper })
    await waitFor(() => expect(unfiltered.current.isSuccess).toBe(true))
    expect(apiClient.get).toHaveBeenCalledWith('/categorias-equipamento', { params: {} })
    const { result: filtered } = renderHook(() => useCategories({ ativa: true, revisar: true }), { wrapper })
    await waitFor(() => expect(filtered.current.isSuccess).toBe(true))
    expect(apiClient.get).toHaveBeenCalledWith('/categorias-equipamento', { params: { ativa: true, revisar: true } })
  })

  it('creates, updates, deactivates, reviews and merges against the category routes', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} } as never)
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} } as never)
    vi.mocked(apiClient.delete).mockResolvedValue({ data: null } as never)
    const data = { nome: 'Bomba', ativa: true, checklistPadraoId: null }
    await renderHook(() => useSaveCategory(), { wrapper }).result.current.mutateAsync({ data })
    expect(apiClient.post).toHaveBeenCalledWith('/categorias-equipamento', data)
    await renderHook(() => useSaveCategory(), { wrapper }).result.current.mutateAsync({ id: 'c1', data })
    expect(apiClient.put).toHaveBeenCalledWith('/categorias-equipamento/c1', data)
    await renderHook(() => useDeactivateCategory(), { wrapper }).result.current.mutateAsync('c1')
    expect(apiClient.delete).toHaveBeenCalledWith('/categorias-equipamento/c1')
    await renderHook(() => useMarkCategoryReviewed(), { wrapper }).result.current.mutateAsync('c1')
    expect(apiClient.put).toHaveBeenCalledWith('/categorias-equipamento/c1/revisada')
    await renderHook(() => useMergeCategory(), { wrapper }).result.current.mutateAsync({ destinoId: 'dest', origemId: 'orig' })
    expect(apiClient.post).toHaveBeenCalledWith('/categorias-equipamento/dest/mesclar', { origemId: 'orig' })
  })
})
