import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { IndicadoresParams, IndicadoresResponse } from '../types'

export async function fetchIndicadores(params: IndicadoresParams) {
  const response = await apiClient.get<IndicadoresResponse>('/relatorios/indicadores', { params })
  return response.data
}

export function useIndicadores(params: IndicadoresParams, enabled = true) {
  return useQuery({
    queryKey: ['report-indicators', params],
    queryFn: () => fetchIndicadores(params),
    enabled,
    staleTime: 60_000,
  })
}
