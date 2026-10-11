import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { CreateTenantInput, CreatedTenant, Tenant } from '../types'

const tenantsKey = ['tenants'] as const

export function useTenants() {
  return useQuery({ queryKey: tenantsKey, queryFn: async () => (await apiClient.get<Tenant[]>('/tenants')).data })
}

export function useCreateTenant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTenantInput) => (await apiClient.post<CreatedTenant>('/tenants', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenantsKey }),
  })
}
