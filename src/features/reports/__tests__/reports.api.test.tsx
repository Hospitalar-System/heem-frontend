import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren } from 'react'
import { apiClient } from '@/lib/axios'
import { fetchIndicadores, useIndicadores } from '../api/reports'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn() } }))

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('report indicators API', () => {
  it('sends the confirmed date-time and scope parameters', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { mtbfHoras: 12, tempoMedioAtendimentoHoras: 1, tempoMedioResolucaoHoras: 2, disponibilidadePercentual: 99, qtdOtsPreventivas: 3, qtdOtsCorretivas: 4 } })
    await fetchIndicadores({ desde: '2026-10-01T03:00:00.000Z', ate: '2026-10-12T02:59:59.999Z', hospitalId: 'hospital-1', setorId: 'sector-1' })
    expect(apiClient.get).toHaveBeenCalledWith('/relatorios/indicadores', { params: { desde: '2026-10-01T03:00:00.000Z', ate: '2026-10-12T02:59:59.999Z', hospitalId: 'hospital-1', setorId: 'sector-1' } })
  })

  it('loads the indicator response through the query hook', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { mtbfHoras: null, tempoMedioAtendimentoHoras: null, tempoMedioResolucaoHoras: null, disponibilidadePercentual: 100, qtdOtsPreventivas: 0, qtdOtsCorretivas: 0 } })
    const { result } = renderHook(() => useIndicadores({ desde: '2026-10-01T00:00:00.000Z', ate: '2026-10-11T23:59:59.999Z' }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.disponibilidadePercentual).toBe(100)
  })
})
