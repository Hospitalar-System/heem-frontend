import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/axios'

export interface ReportFilters {
  desde: string
  ate: string
  hospitalId?: string
  setorId?: string
}

export type ReportGrouping = 'hospital' | 'setor'

export interface PreventiveIndicators {
  atrasadas: number
  concluidasNoPrazo: number
  concluidasForaDoPrazo: number
  /** null sem nenhuma preventiva concluída no período. */
  percentualNoPrazo: number | null
  canceladas: number
}

/** Indicadores de tempo e SLA (Epic 10 do backend). Horas e percentuais são null sem dado suficiente. */
export interface IndicatorValues {
  mtbfHoras: number | null
  mttaHoras: number | null
  triagemHoras: number | null
  mttrHoras: number | null
  esperaPecaHoras: number | null
  slaAtendimentoPct: number | null
  slaResolucaoPct: number | null
  disponibilidadePercentual: number
  qtdOtsPreventivas: number
  qtdOtsCorretivas: number
  preventiva: PreventiveIndicators
}

export interface IndicatorGroup extends IndicatorValues {
  grupoId: string
  grupoNome: string
}

export interface ReportIndicators extends IndicatorValues {
  severidadesConsideradas: string[]
  /** Só vem com agrupar=hospital|setor. */
  grupos?: IndicatorGroup[] | null
}

export interface BacklogSeverity {
  severidade: string
  ate24h: number
  de1a3Dias: number
  maisDe3Dias: number
  total: number
}

export interface BacklogReport {
  porSeveridade: BacklogSeverity[]
  total: number
}

export interface TopEquipment {
  equipamentoId: string
  /** null se o equipamento foi excluído. */
  codigo: string | null
  nome: string | null
  qtdChamados: number
  /** null com menos de 2 chamados no período. */
  mtbfHoras: number | null
}

export const TOP_EQUIPMENT_LIMIT = 10

export interface RiskCompliance {
  nivelRisco: string
  percentualConforme: number | null
  totalMedicoes: number
}

export const EXPORT_CONTENTS = ['chamados', 'ordens_trabalho', 'medicoes', 'indicadores', 'campanha'] as const
export const EXPORT_FORMATS = ['pdf', 'xlsx', 'csv'] as const

/**
 * Corpo aceito por POST /relatorios/exportacoes (ExportacaoRequest do backend): conteudo, formato, desde/ate,
 * hospitalId, setorId, agrupar (só indicadores) e campanhaId. Não há ainda nível (resumo/completo) nem orientação.
 * Campanha exige campanhaId e ignora período; os demais exigem desde/ate.
 */
export const exportRequestSchema = z.object({
  desde: z.string().datetime({ offset: true }).optional(),
  ate: z.string().datetime({ offset: true }).optional(),
  hospitalId: z.string().optional(),
  setorId: z.string().optional(),
  campanhaId: z.string().optional(),
  conteudo: z.enum(EXPORT_CONTENTS),
  formato: z.enum(EXPORT_FORMATS),
}).superRefine((value, ctx) => {
  if (value.conteudo === 'campanha') {
    if (!value.campanhaId) ctx.addIssue({ code: 'custom', path: ['campanhaId'], message: 'Escolha a campanha.' })
    return
  }
  if (!value.desde || !value.ate) ctx.addIssue({ code: 'custom', path: ['desde'], message: 'Informe o período.' })
  else if (value.desde > value.ate) ctx.addIssue({ code: 'custom', path: ['desde'], message: 'A data inicial deve ser anterior ou igual à data final.' })
})

export type ExportRequest = z.infer<typeof exportRequestSchema>

export type CampaignExportFormat = 'pdf' | 'xlsx' | 'csv'
export interface CampaignExportRequest { campanhaId: string; formato: CampaignExportFormat }

export const exportStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['pendente', 'concluido', 'falhou']),
  urlDownload: z.string().url().nullable(),
})

export type ExportStatus = z.infer<typeof exportStatusSchema>

const validPeriod = (filters: ReportFilters) => Boolean(filters.desde && filters.ate && filters.desde <= filters.ate)

export function useReportIndicators(filters: ReportFilters, agrupar: ReportGrouping) {
  return useQuery({
    queryKey: ['report-indicators', filters, agrupar],
    queryFn: async () => (await apiClient.get<ReportIndicators>('/relatorios/indicadores', { params: { ...filters, agrupar } })).data,
    enabled: validPeriod(filters),
  })
}

/** Backlog é o retrato de agora: só aceita hospital e setor, sem período. */
export function useReportBacklog(filters: Pick<ReportFilters, 'hospitalId' | 'setorId'>) {
  return useQuery({
    queryKey: ['report-backlog', filters],
    queryFn: async () => (await apiClient.get<BacklogReport>('/relatorios/backlog', { params: filters })).data,
  })
}

export function useReportTopEquipment(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-top-equipment', filters],
    queryFn: async () => (await apiClient.get<TopEquipment[]>('/relatorios/top-equipamentos', { params: { ...filters, n: TOP_EQUIPMENT_LIMIT } })).data,
    enabled: validPeriod(filters),
  })
}

export function useRiskCompliance(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-compliance', filters],
    queryFn: async () => (await apiClient.get<RiskCompliance[]>('/relatorios/conformidade', { params: filters })).data,
    enabled: validPeriod(filters),
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

/** Relatório de uma campanha (Story 18.4): sem período; o backend cobre todas as OTs da campanha. Mesmo fluxo assíncrono das demais exportações. */
export function useRequestCampaignExport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ campanhaId, formato }: CampaignExportRequest) => {
      const { data } = await apiClient.post<unknown>('/relatorios/exportacoes', { conteudo: 'campanha', formato, campanhaId })
      return exportStatusSchema.parse(data)
    },
    onSuccess: (exportation) => queryClient.setQueryData(['report-export', exportation.id], exportation),
  })
}

export const EXPORT_POLL_MS = 2000
/** Teto do polling (~10 min): depois disso para de consultar sozinho e deixa a atualização manual. */
export const EXPORT_POLL_MAX_UPDATES = 300

export function useReportExport(id: string | null) {
  const client = useQueryClient()
  const queryKey = ['report-export', id]
  const query = useQuery({
    queryKey,
    queryFn: async () => exportStatusSchema.parse((await apiClient.get<unknown>(`/relatorios/exportacoes/${id}`)).data),
    enabled: Boolean(id),
    refetchInterval: (state) => state.state.data?.status === 'pendente' && state.state.dataUpdateCount < EXPORT_POLL_MAX_UPDATES ? EXPORT_POLL_MS : false,
    retry: false,
  })
  const pollStopped = query.data?.status === 'pendente' && (client.getQueryState(queryKey)?.dataUpdateCount ?? 0) >= EXPORT_POLL_MAX_UPDATES
  return { ...query, pollStopped }
}
