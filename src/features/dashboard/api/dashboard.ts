import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { dashboardSummaryResponseSchema, normalizeDashboardSummary } from '../types'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<unknown>('/relatorios/dashboard')
      const result = dashboardSummaryResponseSchema.safeParse(data)
      if (!result.success) {
        throw new Error('A resposta do dashboard não corresponde ao contrato esperado.')
      }
      return normalizeDashboardSummary(result.data)
    },
  })
}
