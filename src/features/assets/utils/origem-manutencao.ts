/** Story 23.1: origem da entrada em "Em manutenção" (OT vinculada ou justificativa). */
export type DestinoManutencao = 'manutencao_hospital' | 'manutencao_externa'
export type OrigemManutencaoTipo = 'ordem_trabalho' | 'justificativa' | 'nao_informada'

export const JUSTIFICATIVA_ORIGEM_MAX = 300
export const FORNECEDOR_MAX = 150

export const destinoManutencaoLabels: Record<DestinoManutencao, string> = {
  manutencao_hospital: 'Manutenção no hospital',
  manutencao_externa: 'Manutenção externa',
}
export const destinoManutencaoOptions = (Object.keys(destinoManutencaoLabels) as DestinoManutencao[]).map((value) => ({ value, label: destinoManutencaoLabels[value] }))

export interface OrigemManutencaoEntry {
  tipo: OrigemManutencaoTipo | string
  ordemTrabalhoId?: string | null
  retiradoPorId?: string | null
  retiradoPorNome?: string | null
  destino?: DestinoManutencao | string | null
  fornecedor?: string | null
  justificativa?: string | null
}

const workOrderStatusLabels: Record<string, string> = { AGENDADA: 'Agendada', EM_EXECUCAO: 'Em execução', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' }
const workOrderTypeLabels: Record<string, string> = { PREVENTIVA: 'Preventiva', CORRETIVA: 'Corretiva' }

/** Rótulo da OT no seletor: "PV-12 · Corretiva · Em execução". */
export function workOrderOptionLabel(order: { codigo: string; tipo: string; status: string }) {
  return [order.codigo, workOrderTypeLabels[order.tipo] ?? order.tipo, workOrderStatusLabels[order.status] ?? order.status].join(' · ')
}

/** Linha secundária do histórico de estado; nula quando a mudança não tem origem de manutenção. */
export function origemManutencaoSummary(origem: OrigemManutencaoEntry | null | undefined, descricao?: string | null): string | null {
  if (!origem) return null
  if (origem.tipo === 'ordem_trabalho') return 'Origem: OT vinculada'
  if (origem.tipo === 'nao_informada') return 'Origem: não informada'
  const destino = origem.destino ? destinoManutencaoLabels[origem.destino as DestinoManutencao] ?? origem.destino : null
  // A descrição derivada já é a justificativa (cortada em 200): só repete aqui quando é diferente.
  const text = origem.justificativa?.trim() ?? ''
  const sameAsDescription = Boolean(text && descricao && text.slice(0, 200).trim() === descricao.trim())
  return [
    destino ? `Origem: ${destino}` : 'Origem: justificativa',
    origem.fornecedor ? `Fornecedor: ${origem.fornecedor}` : null,
    origem.retiradoPorNome ? `Retirado por: ${origem.retiradoPorNome}` : null,
    text && !sameAsDescription ? `Justificativa: ${text}` : null,
  ].filter(Boolean).join(' · ')
}

export type OriginMode = 'ot' | 'justificativa'
export interface OriginValue {
  mode: OriginMode
  ordemTrabalhoId: string
  /** Código da OT escolhida (para a descrição derivada). */
  ordemTrabalhoCodigo: string
  destino: DestinoManutencao
  fornecedor: string
  justificativa: string
  /** Vazio = quem está logado (padrão do backend). */
  retiradoPor: string
}
export const emptyOrigin: OriginValue = { mode: 'ot', ordemTrabalhoId: '', ordemTrabalhoCodigo: '', destino: 'manutencao_hospital', fornecedor: '', justificativa: '', retiradoPor: '' }

/** Validação local; devolve a mensagem do primeiro problema ou null. */
export function originError(value: OriginValue): string | null {
  if (value.mode === 'ot') return value.ordemTrabalhoId ? null : 'Escolha a OT que originou a manutenção.'
  if (value.destino === 'manutencao_externa' && !value.fornecedor.trim()) return 'Informe o fornecedor: ele é obrigatório na manutenção externa.'
  if (!value.justificativa.trim()) return 'Informe a justificativa da manutenção.'
  return null
}

/** Campos do PATCH conforme o modo (só um dos dois caminhos vai). */
export function originPayload(value: OriginValue) {
  if (value.mode === 'ot') return { ordemTrabalhoId: value.ordemTrabalhoId }
  const fornecedor = value.fornecedor.trim()
  return {
    destino: value.destino,
    justificativa: value.justificativa.trim(),
    ...(fornecedor ? { fornecedor } : {}),
    ...(value.retiradoPor ? { retiradoPor: value.retiradoPor } : {}),
  }
}

/** O backend ainda exige descricao (até 200) em EM_MANUTENCAO: o web a deriva da origem, como o app. */
export function originDescription(value: OriginValue, max = 200) {
  if (value.mode === 'ot') return value.ordemTrabalhoCodigo ? `OT ${value.ordemTrabalhoCodigo}` : 'OT vinculada'
  return value.justificativa.trim().slice(0, max).trim()
}
