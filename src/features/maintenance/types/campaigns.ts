/** Contrato da campanha de preventiva do parque (backend Story 15.2, `/api/v1/campanhas-preventivas`). */
export type CampaignStatus = 'pendente' | 'processando' | 'concluida' | 'falhou' | 'cancelada'
export type CampaignRecurrence = 'avulsa' | 'dias' | 'meses'
export type CampaignAssignmentMode = 'tecnico' | 'equilibrado' | 'sem_responsavel'
export type CampaignPendingReason = 'SEM_CATEGORIA' | 'CATEGORIA_SEM_CHECKLIST' | 'CHECKLIST_INDISPONIVEL' | 'SEM_TECNICO_DISPONIVEL'

export interface CampaignInput {
  hospitalId: string
  nome: string
  setorIds: string[]
  categoriaIds: string[]
  dataInicio: string
  dataFim?: string
  recorrencia: CampaignRecurrence
  intervalo?: number
  modoAtribuicao: CampaignAssignmentMode
  tecnicoId?: string
}

export interface CampaignPendingItem { equipamentoId: string; codigo: string; motivo: CampaignPendingReason }

export interface CampaignPreview {
  totalEquipamentos: number
  aGerar: number
  puladas: number
  totalPendencias: number
  pendenciasPorMotivo: Partial<Record<CampaignPendingReason, number>>
  pendencias: CampaignPendingItem[]
  distribuicaoPorTecnico: Array<{ tecnicoId: string; nome: string; quantidade: number }>
}

export interface Campaign {
  id: string
  hospitalId: string
  nome: string
  setorIds: string[]
  categoriaIds: string[]
  dataInicio: string
  dataFim: string | null
  recorrencia: CampaignRecurrence
  intervalo: number | null
  proximaData: string | null
  modoAtribuicao: CampaignAssignmentMode
  tecnicoId: string | null
  status: CampaignStatus
  ativa: boolean
  janelaAtual: string | null
  execucao: { totalEquipamentos: number; processadas: number; geradas: number; puladas: number; pendencias: number }
  ots: { total: number; agendadas: number; emExecucao: number; concluidas: number; canceladas: number; atrasadas: number }
  /** Só no detalhe (até 1000 itens); vazio na lista. */
  pendenciasDetalhe: CampaignPendingItem[]
  criadaEm: string
  canceladaEm: string | null
}

export interface CampaignCreated { id: string; status: CampaignStatus }
export interface CampaignFilters { hospitalId?: string; status?: CampaignStatus }
