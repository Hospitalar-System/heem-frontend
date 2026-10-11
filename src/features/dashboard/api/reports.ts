import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export interface ExportRequest extends ReportFilters {
  conteudo: 'chamados' | 'ordens_trabalho' | 'medicoes'
  formato: 'xlsx' | 'pdf'
}

export interface ExportStatus {
  id: string
  status: 'pendente' | 'concluido' | 'falhou'
  urlDownload: string | null
}

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
    mutationFn: async (request: ExportRequest) => (await apiClient.post<ExportStatus>('/relatorios/exportacoes', request)).data,
    onSuccess: (exportation) => queryClient.setQueryData(['report-export', exportation.id], exportation),
  })
}

export function useReportExport(id: string | null) {
  return useQuery({
    queryKey: ['report-export', id],
    queryFn: async () => (await apiClient.get<ExportStatus>(`/relatorios/exportacoes/${id}`)).data,
    enabled: Boolean(id),
    refetchInterval: (query) => query.state.data?.status === 'pendente' ? 2000 : false,
    retry: false,
  })
}
