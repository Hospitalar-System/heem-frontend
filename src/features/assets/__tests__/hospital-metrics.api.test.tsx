import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import { useHospitalMetrics } from '../api/hospital-metrics'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn() } }))

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => { clearAuthSession(); vi.resetAllMocks() })

describe('useHospitalMetrics', () => {
  it('counts sectors, equipment and overdue open work orders from API data', async () => {
    setAuthSession('token', { id: 'user-1', name: 'Admin', roles: ['admin_cliente'] })
    vi.mocked(apiClient.get).mockImplementation(async (url, config) => {
      const status = (config?.params as Record<string, unknown> | undefined)?.status
      if (url.includes('/setores')) return { data: [{ id: 'sector-1' }, { id: 'sector-2' }], headers: {} } as never
      if (url === '/equipamentos') return { data: [{ id: 'equipment-1' }], headers: {} } as never
      if (url === '/ordens-de-trabalho' && status === 'AGENDADA') return { data: [{ equipamentoId: 'equipment-1', dataAgendada: '2020-01-01T00:00:00Z' }, { equipamentoId: 'equipment-1', dataAgendada: '2999-01-01T00:00:00Z' }], headers: { 'x-total-count': '2' } } as never
      if (url === '/ordens-de-trabalho') return { data: [], headers: { 'x-total-count': '0' } } as never
      throw new Error(`Unexpected API request ${url}`)
    })

    const { result } = renderHook(() => useHospitalMetrics([{ id: 'hospital-1', nome: 'Hospital', cnpj: '123' }]), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.['hospital-1']).toEqual({ setores: 2, equipamentos: 1, ordensDevidas: 1 })
  })

  it('does not present a partial technician OT queue as a hospital total', async () => {
    setAuthSession('token', { id: 'user-2', name: 'Técnico', roles: ['tecnico'] })
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url.includes('/setores')) return { data: [], headers: {} } as never
      if (url === '/equipamentos') return { data: [], headers: {} } as never
      throw new Error('OT endpoint should not be called for technicians')
    })

    const { result } = renderHook(() => useHospitalMetrics([{ id: 'hospital-1', nome: 'Hospital', cnpj: '123' }]), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.['hospital-1']).toEqual({ setores: 0, equipamentos: 0, ordensDevidas: null })
    expect(vi.mocked(apiClient.get).mock.calls.some(([url]) => url === '/ordens-de-trabalho')).toBe(false)
  })
})
