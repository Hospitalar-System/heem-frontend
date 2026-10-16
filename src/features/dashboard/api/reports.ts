import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/axios'

export interface ReportFilters {
  desde: string
  ate: string
  hospitalId?: string
  setorId?: string
}

export interface ReportIndicators {
  mtbfHoras: number | null
  tempoMedioAtendimentoHoras: number | null
  tempoMedioResolucaoHoras: number | null
  disponibilidadePercentual: number
  qtdOtsPreventivas: number
  qtdOtsCorretivas: number
}

export interface RiskCompliance {
  nivelRisco: string
  percentualConforme: number | null
  totalMedicoes: number
}

export const exportRequestSchema = z.object({
  desde: z.string().datetime({ offset: true }),
  ate: z.string().datetime({ offset: true }),
  hospitalId: z.string().optional(),
  setorId: z.string().optional(),
  conteudo: z.enum(['chamados', 'ordens_trabalho', 'medicoes', 'INDICADORES']),
  formato: z.enum(['xlsx', 'pdf']),
}).refine(({ desde, ate }) => desde <= ate, { message: 'A data inicial deve ser anterior ou igual à data final.' })

export type ExportRequest = z.infer<typeof exportRequestSchema>

export const exportStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['pendente', 'concluido', 'falhou']),
  urlDownload: z.string().url().nullable(),
})

export type ExportStatus = z.infer<typeof exportStatusSchema>

export function useReportIndicators(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-indicators', filters],
    queryFn: async () => (await apiClient.get<ReportIndicators>('/relatorios/indicadores', { params: filters })).data,
    enabled: Boolean(filters.desde && filters.ate && filters.desde <= filters.ate),
  })
}

export function useRiskCompliance(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-compliance', filters],
    queryFn: async () => (await apiClient.get<RiskCompliance[]>('/relatorios/conformidade', { params: filters })).data,
    enabled: Boolean(filters.desde && filters.ate && filters.desde <= filters.ate),
  })
}

export function useRequestReportExport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: ExportRequest) => {
      const validRequest = exportRequestSchema.parse(request)
      const { data } = await apiClient.post<unknown>('/relatorios/exportacoes', validRequest)
      return exportStatusSchema.parse(data)
    },
    onSuccess: (exportation) => queryClient.setQueryData(['report-export', exportation.id], exportation),
  })
}

export function useReportExport(id: string | null) {
  return useQuery({
    queryKey: ['report-export', id],
    queryFn: async () => exportStatusSchema.parse((await apiClient.get<unknown>(`/relatorios/exportacoes/${id}`)).data),
    enabled: Boolean(id),
    refetchInterval: (query) => query.state.data?.status === 'pendente' ? 2000 : false,
    retry: false,
  })
}
