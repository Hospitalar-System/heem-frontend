export type RiscoSetor = 'CRITICO' | 'SEMI_CRITICO' | 'NAO_CRITICO'
export type GrupoInstalacao = 'GRUPO_0' | 'GRUPO_1' | 'GRUPO_2'

export interface Hospital { id: string; nome: string; cnpj: string }
export interface HospitalInput { nome: string; cnpj: string }
export interface Setor { id: string; hospitalId: string; codigo: string; nome: string; andar?: string | null; classificacaoRisco: RiscoSetor; grupoInstalacao: GrupoInstalacao }
export type SetorInput = Omit<Setor, 'id' | 'hospitalId'>
export interface HospitalMetrics { setores: number; equipamentos: number; ordensDevidas: number | null }
export interface EquipamentoResumo { id: string }
export interface OrdemResumo { equipamentoId: string; dataAgendada: string; status: 'AGENDADA' | 'EM_EXECUCAO' }

export type EquipmentLifecycle = 'ATIVO' | 'EM_MANUTENCAO' | 'INATIVO' | 'DESATIVADO' | 'DESCARTADO'
export type EquipmentRiskClass = 'I' | 'II' | 'III' | 'IV'
export type EquipmentCriticality = 'ALTA' | 'MEDIA' | 'BAIXA'
export type EquipmentProtection = 'CLASSE_I' | 'CLASSE_II' | 'ALIMENTACAO_INTERNA'
export type EquipmentAppliedPart = 'TIPO_B' | 'TIPO_BF' | 'TIPO_CF'
export type EquipmentOperationMode = 'CONTINUO' | 'INTERMITENTE' | 'CURTA_DURACAO'

export interface Equipment {
  id: string
  setorId: string
  codigo: string
  nome: string
  modelo: string | null
  numeroSerie: string | null
  marca: string | null
  /** Legado (deprecated): use a API de foto (`fotoVersao`). */
  fotoUrl: string | null
  /** Instante da última troca da foto principal; null/ausente = sem foto na API nova. */
  fotoVersao?: string | null
  categoriaId: string | null
  categoriaNome: string | null
  dadosGerais: Record<string, unknown> | null
  classeRiscoAnvisa: EquipmentRiskClass
  statusCicloVida: EquipmentLifecycle
  criticidade: EquipmentCriticality
  tipoProtecao: EquipmentProtection
  parteAplicada: EquipmentAppliedPart
  modoOperacao: EquipmentOperationMode
  dataInstalacao: string | null
  dataGarantiaFim: string | null
  nivelRisco: 'ALTO' | 'MEDIO' | 'BAIXO'
}

export interface EquipmentEditableFields {
  nome: string
  modelo: string
  numeroSerie: string
  marca: string
  fotoUrl: string | null
  categoriaId: string
  dadosGerais: Record<string, unknown>
  classeRiscoAnvisa: EquipmentRiskClass
  statusCicloVida: EquipmentLifecycle
  criticidade: EquipmentCriticality
  tipoProtecao: EquipmentProtection
  parteAplicada: EquipmentAppliedPart
  modoOperacao: EquipmentOperationMode
  dataInstalacao: string | null
  dataGarantiaFim: string | null
}

export type CreateEquipmentInput = EquipmentEditableFields & { setorId: string; codigo: string }
export type UpdateEquipmentInput = EquipmentEditableFields

export interface WorkOrderSummary {
  id: string
  codigo: string
  tipo: 'PREVENTIVA' | 'CORRETIVA'
  status: string
  equipamentoId: string
  checklistId: string | null
  local: string | null
  dataAgendada: string | null
  iniciadaEm: string | null
  concluidaEm: string | null
}

export interface SignedUploadUrl {
  url: string
  chave: string
  expiraEm: string
}

export type EquipmentLabelType = 'qr' | 'barras' | 'outro'

export interface EquipmentLabel {
  id: string
  equipamentoId: string
  valor: string
  tipo: EquipmentLabelType
  vinculadoPor: string
  vinculadoEm: string
}

export interface CreateEquipmentLabelInput {
  valor: string
  tipo: EquipmentLabelType
}

export type CategoryOrigin = 'manual' | 'carga'

export interface EquipmentCategory {
  id: string
  nome: string
  ativa: boolean
  checklistPadraoId: string | null
  origem: CategoryOrigin
  revisada: boolean
  /** Só vem para admin_cliente. */
  quantidadeEquipamentos?: number
}

export interface EquipmentCategoryInput {
  nome: string
  ativa: boolean
  checklistPadraoId: string | null
}

export interface EquipmentFilters {
  hospitalId?: string
  setorId?: string
  categoriaId?: string
  semCategoria?: boolean
}

export type DocumentType = 'MANUAL' | 'CERTIFICADO_CALIBRACAO' | 'LAUDO_SEGURANCA' | 'NOTA_FISCAL' | 'OUTRO'

export interface EquipmentDocument {
  id: string
  equipamentoId: string
  tipoDocumento: DocumentType
  nomeArquivo: string
  uploadedEm: string
  validadeAte: string | null
  vencido: boolean
  vencendo: boolean
}

export interface DocumentUrlResponse {
  url: string
  chave: string
  expiraEm: string | null
}

export interface UploadEquipmentDocumentInput {
  file: File
  tipoDocumento: DocumentType
  validadeAte: string | null
  onProgress?: (percent: number) => void
}
