import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { useCreateTenant, useTenants } from '../api/tenants'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => vi.resetAllMocks())

describe('tenant API', () => {
  it('loads the Super Admin tenant list', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] })
    const { result } = renderHook(() => useTenants(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiClient.get).toHaveBeenCalledWith('/tenants')
  })

  it('creates a tenant using the backend request contract', async () => {
    const input = { tipo: 'PJ' as const, cnpj: '12345678000190', nome: 'Grupo Hospitalar', adminNome: 'Clara Mendes', adminEmail: 'clara@example.com', adminCodigo: 'ADM-001' }
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { tenantId: 'tenant-1', ...input, createdAt: '2026-10-08T12:00:00Z', adminInicialId: 'user-1', adminInicialEmail: input.adminEmail } })
    const { result } = renderHook(() => useCreateTenant(), { wrapper: createWrapper() })
    await act(async () => { await result.current.mutateAsync(input) })
    expect(apiClient.post).toHaveBeenCalledWith('/tenants', input)
  })
})
