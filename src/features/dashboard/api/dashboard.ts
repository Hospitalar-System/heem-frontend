import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { DashboardContractError, dashboardSummaryResponseSchema, normalizeDashboardSummary } from '../types'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<unknown>('/relatorios/dashboard')
      const result = dashboardSummaryResponseSchema.safeParse(data)
      if (!result.success) throw new DashboardContractError()
      return normalizeDashboardSummary(result.data)
    },
  })
}
