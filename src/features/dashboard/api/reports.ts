import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import { EMERGENCIAS_CONTEUDO, OT_STATUS_VALUES, OT_TIPO_VALUES } from './documents'

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
  /** Story 29.2 (aditivo): chamados resolvidos no período com e sem OT. */
  chamadosResolvidosComOt?: number | null
  chamadosResolvidosSemOt?: number | null
  resolvidosSemOtPct?: number | null
  /** Story 29.2: finalizados no período sem a assinatura do técnico (só no total). */
  assinaturasPendentes?: { ots: number; chamados: number; campanhas: number } | null
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

/** Story 25.2: trocas de peça de um equipamento no período (registros, soma das quantidades, chamados distintos). */
export interface PartReplacementEquipment {
  equipamentoId: string
  /** null se o equipamento foi excluído. */
  codigo: string | null
  nome: string | null
  trocas: number
  pecas: number
  chamados: number
}

export interface RiskCompliance {
  nivelRisco: string
  percentualConforme: number | null
  totalMedicoes: number
}

/** Stories 23.3 (HEEM-PT), 24.3 (HEEM-PQ) e 24.4 (HEEM-IN): só o admin do cliente. */
export const PRODUTIVIDADE_CONTEUDO = 'produtividade'
export const EVOLUCAO_PARQUE_CONTEUDO = 'evolucao_parque'
export const POSICAO_PARQUE_CONTEUDO = 'posicao_parque'
export const EXPORT_CONTENTS = ['chamados', 'ordens_trabalho', 'medicoes', 'indicadores', 'campanha', EMERGENCIAS_CONTEUDO, PRODUTIVIDADE_CONTEUDO, EVOLUCAO_PARQUE_CONTEUDO, POSICAO_PARQUE_CONTEUDO] as const
export const EXPORT_FORMATS = ['pdf', 'xlsx', 'csv'] as const

/**
 * Corpo aceito por POST /relatorios/exportacoes (ExportacaoRequest do backend): conteudo, formato, desde/ate,
 * hospitalId, setorId, agrupar (só indicadores), campanhaId e, só para PDF, nivel (RESUMO|COMPLETO) e orientacao (RETRATO|PAISAGEM).
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
  tipo: z.enum(OT_TIPO_VALUES).optional(),
  status: z.enum(OT_STATUS_VALUES).optional(),
  nivel: z.enum(['RESUMO', 'COMPLETO']).optional(),
  orientacao: z.enum(['RETRATO', 'PAISAGEM']).optional(),
  /** Só com conteudo=produtividade; ausente = todos os técnicos. */
  tecnicoId: z.string().optional(),
  /** Só com conteudo=posicao_parque (AAAA-MM-DD), no lugar de desde/ate; futura = 400 DATA_FUTURA. */
  dataReferencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).superRefine((value, ctx) => {
  if (value.conteudo === 'campanha') {
    if (!value.campanhaId) ctx.addIssue({ code: 'custom', path: ['campanhaId'], message: 'Escolha a campanha.' })
    return
  }
  if (value.conteudo === POSICAO_PARQUE_CONTEUDO) {
    if (!value.dataReferencia) ctx.addIssue({ code: 'custom', path: ['dataReferencia'], message: 'Informe a data de referência.' })
    return
  }
  if (!value.desde || !value.ate) ctx.addIssue({ code: 'custom', path: ['desde'], message: 'Informe o período.' })
  else if (value.desde > value.ate) ctx.addIssue({ code: 'custom', path: ['desde'], message: 'A data inicial deve ser anterior ou igual à data final.' })
})

export type ExportRequest = z.infer<typeof exportRequestSchema>

export type CampaignExportFormat = 'pdf' | 'xlsx' | 'csv'
export interface CampaignExportRequest { campanhaId: string; formato: CampaignExportFormat; /** Só PDF. */ nivel?: 'RESUMO' | 'COMPLETO' }

export const exportStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['pendente', 'concluido', 'falhou']),
  urlDownload: z.string().url().nullable(),
  // Efetivos devolvidos pelo backend; tolerantes a ausência e a valores novos.
  nivel: z.string().nullish(),
  orientacao: z.string().nullish(),
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

/** Story 23.4: um técnico na qualidade da análise. `percentual` é null sem nenhum Apto no período. */
export interface QualityTechnician {
  tecnicoId: string
  nome: string
  aptos: number
  comChamado: number
  percentual: number | null
}

/** Um Apto seguido de chamado no mesmo equipamento dentro da janela. */
export interface QualityCase {
  tecnicoId: string
  tecnicoNome: string
  equipamentoCodigo: string
  equipamentoNome: string
  aptoEm: string
  chamadoCodigo: string
  chamadoAbertoEm: string
  diasDepois: number
}

/** GET /relatorios/qualidade-analise (só admin do cliente). */
export interface QualityAnalysis {
  janelaDias: number
  aptos: number
  comChamado: number
  percentual: number | null
  tecnicos: QualityTechnician[]
  casos: QualityCase[]
  casosTruncados: boolean
}

/** Story 23.4: qualidade da análise no período; aceita hospital (o setor não se aplica). */
export function useQualityAnalysis(filters: ReportFilters) {
  const params = { desde: filters.desde, ate: filters.ate, ...(filters.hospitalId ? { hospitalId: filters.hospitalId } : {}) }
  return useQuery({
    queryKey: ['report-quality-analysis', params],
    queryFn: async () => (await apiClient.get<QualityAnalysis>('/relatorios/qualidade-analise', { params })).data,
    enabled: validPeriod(filters),
  })
}

/** Story 25.2: os 10 equipamentos com mais trocas de peça no período (mesmos filtros de hospital e setor). */
export function useReportPartReplacements(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-part-replacements', filters],
    queryFn: async () => (await apiClient.get<PartReplacementEquipment[]>('/relatorios/trocas-pecas', { params: { ...filters, n: TOP_EQUIPMENT_LIMIT } })).data,
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
    mutationFn: async ({ campanhaId, formato, nivel }: CampaignExportRequest) => {
      const { data } = await apiClient.post<unknown>('/relatorios/exportacoes', { conteudo: 'campanha', formato, campanhaId, ...(nivel ? { nivel } : {}) })
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

/** Story 23.8: equipamentos reincidentes pela regra do cliente (N chamados de falha nos últimos D dias). */
export interface RecurrentEquipment { equipamentoId: string; codigo: string; nome: string; hospitalId: string; hospitalNome: string; setorId: string; setorNome: string; chamados: number }
export interface RecurrentEquipments { chamadosMinimos: number; dias: number; equipamentos: RecurrentEquipment[] }

/** GET /relatorios/reincidentes (só admin): situação atual, sem período; aceita hospital e setor. */
export function useRecurrentEquipments(filters: Pick<ReportFilters, 'hospitalId' | 'setorId'>) {
  return useQuery({
    queryKey: ['report-recurrent-equipments', filters],
    queryFn: async () => (await apiClient.get<RecurrentEquipments>('/relatorios/reincidentes', { params: filters })).data,
  })
}

/** Story 23.7: visitas preventivas não realizadas porque o equipamento estava em uso. */
export interface NotDoneVisitsGroup { id: string | null; nome: string; encerradas: number; naoRealizadas: number; percentual: number | null }
export interface NotDoneVisitsEquipment { equipamentoId: string; codigo: string; nome: string; hospitalNome: string; setorNome: string; seguidas: number; ultimaEm: string }
export interface NotDoneVisits {
  encerradas: number
  naoRealizadas: number
  percentual: number | null
  porHospital: NotDoneVisitsGroup[]
  porSetor: NotDoneVisitsGroup[]
  porTecnico: NotDoneVisitsGroup[]
  /** Situação atual (sem período): 2 ou mais preventivas seguidas não realizadas, mais seguidas primeiro. */
  emUsoSeguidas: NotDoneVisitsEquipment[]
}

/** GET /relatorios/visitas-nao-realizadas (só admin do cliente); aceita hospital e setor. */
export function useNotDoneVisits(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-not-done-visits', filters],
    queryFn: async () => (await apiClient.get<NotDoneVisits>('/relatorios/visitas-nao-realizadas', { params: filters })).data,
    enabled: validPeriod(filters),
  })
}

/** Story 23.5: avaliação dos chamados pelo solicitante (nota 1 a 5). */
export interface RatingGroup { id: string | null; nome: string; quantidade: number; media: number | null }
export interface TicketRatings { quantidade: number; media: number | null; porTecnico: RatingGroup[]; porHospital: RatingGroup[] }

/** GET /relatorios/avaliacoes-chamados (só admin do cliente); aceita hospital e setor. */
export function useTicketRatings(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-ticket-ratings', filters],
    queryFn: async () => (await apiClient.get<TicketRatings>('/relatorios/avaliacoes-chamados', { params: filters })).data,
    enabled: validPeriod(filters),
  })
}
