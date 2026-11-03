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

/** Equipamento pulado pela campanha. `motivo` é o código do backend (hoje só JA_TEM_OT_PREVENTIVA_ABERTA); `otCodigo` é a OT preventiva aberta que o fez ser pulado. */
export interface CampaignSkippedItem { equipamentoId: string; codigo: string; motivo: string; otCodigo: string | null }

export interface CampaignPreview {
  totalEquipamentos: number
  aGerar: number
  puladas: number
  totalPendencias: number
  pendenciasPorMotivo: Partial<Record<CampaignPendingReason, number>>
  pendencias: CampaignPendingItem[]
  /** Primeiras 200 puladas, com motivo (ausente em backends anteriores à Story 18.4). */
  puladasDetalhe?: CampaignSkippedItem[]
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
  /** Só no detalhe (até 1000 itens); vazio na lista. */
  puladasDetalhe?: CampaignSkippedItem[]
  criadaEm: string
  canceladaEm: string | null
}

export interface CampaignCreated { id: string; status: CampaignStatus }
/** Filtros da lista; `pagina` (0-based) e `tamanho` pedem uma página do servidor (sem eles a lista vem completa). */
export interface CampaignFilters { hospitalId?: string; status?: CampaignStatus; pagina?: number; tamanho?: number }
