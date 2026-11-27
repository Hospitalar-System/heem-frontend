/** Epic 22: assinatura na finalização (OT concluída, chamado resolvido e finalização de campanha). */
export type SignatureTargetType = 'ot' | 'chamado' | 'campanha'
export type SignatureRole = 'tecnico' | 'responsavel_hospital'

/** Story 22.2: assinatura no detalhe da OT e do chamado, com a URL assinada (expira em minutos) da imagem PNG. */
export interface Signature {
  id: string
  papel: SignatureRole | string
  nome: string
  registroProfissional?: string | null
  cargo?: string | null
  assinadoEm: string
  registradoEm: string
  urlImagem: string
}

export interface SignatureTarget {
  tipo: SignatureTargetType
  id: string
}

/** Story 22.3: OT coberta por uma finalização de campanha; `veredito` nulo = não informado. */
export interface FinalizedWorkOrder {
  id: string
  codigo: string
  equipamentoId: string
  concluidaEm: string
  veredito: 'ATIVO' | 'NAO_APTO' | 'EM_MANUTENCAO' | null
}

export interface CampaignFinalizationSummary {
  totalOts: number
  aptos: number
  naoAptos: number
  emManutencao: number
  semVeredito: number
  /** Story 23.7: OTs que ficaram sem fazer porque o equipamento estava em uso. */
  emUso?: number
  ots: FinalizedWorkOrder[]
}

export interface CampaignFinalization {
  id: string
  campanhaId: string
  tecnicoId: string
  clientId: string
  finalizadoEm: string
  resumo: CampaignFinalizationSummary
}

export const signatureRoleLabels: Record<SignatureRole, string> = {
  tecnico: 'Técnico',
  responsavel_hospital: 'Responsável do hospital',
}

export function hasSignature(signatures: Signature[] | null | undefined, papel: SignatureRole) {
  return (signatures ?? []).some((item) => item.papel === papel)
}
