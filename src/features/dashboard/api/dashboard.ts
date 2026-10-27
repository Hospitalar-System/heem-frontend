import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { ReportIndicators } from './reports'
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

export const DASHBOARD_INDICATORS_WINDOW_DAYS = 30

/** Janela dos indicadores de tempo do painel: últimos 30 dias até o fim de hoje, em ISO (mesmo formato da tela de relatórios). */
export function dashboardIndicatorsWindow(now = new Date()) {
  const ate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))
  const desde = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (DASHBOARD_INDICATORS_WINDOW_DAYS - 1)))
  return { desde: desde.toISOString(), ate: ate.toISOString() }
}

/** MTTA, MTTR e MTBF (GET /relatorios/indicadores), independentes do resumo do painel. */
export function useDashboardIndicators() {
  const { desde, ate } = dashboardIndicatorsWindow()
  return useQuery({
    queryKey: ['dashboard-indicators', desde, ate],
    queryFn: async () => (await apiClient.get<ReportIndicators>('/relatorios/indicadores', { params: { desde, ate } })).data,
  })
}
