import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PropsWithChildren } from 'react'
import { apiClient } from '@/lib/axios'
import { useHospitals, useSectors } from '../api/assets'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('asset queries', () => {
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
})
