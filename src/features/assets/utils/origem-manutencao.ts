/** Story 23.1: origem da entrada em "Em manutenção" (OT vinculada ou justificativa). */
export type DestinoManutencao = 'manutencao_hospital' | 'manutencao_externa'
export type OrigemManutencaoTipo = 'ordem_trabalho' | 'justificativa' | 'nao_informada'

export const JUSTIFICATIVA_ORIGEM_MAX = 300
export const FORNECEDOR_MAX = 150
/** OTs concluídas aparecem no seletor só se concluídas nestes últimos dias (decisão do Geraldo). */
export const CONCLUIDAS_RECENTES_DIAS = 30

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

export const workOrderStatusLabels: Record<string, string> = { AGENDADA: 'Agendada', EM_EXECUCAO: 'Em execução', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada', NAO_REALIZADA: 'Não realizada' }
const workOrderTypeLabels: Record<string, string> = { PREVENTIVA: 'Preventiva', CORRETIVA: 'Corretiva' }

/** Rótulo da OT no seletor: "PV-12 · Corretiva" (o status vai no selo). */
export function workOrderOptionLabel(order: { codigo: string; tipo: string }) {
  return [order.codigo, workOrderTypeLabels[order.tipo] ?? order.tipo].join(' · ')
}

type OrderForOrigin = { id: string; codigo: string; tipo: string; status: string; concluidaEm?: string | null; dataAgendada?: string | null }
const OPEN_RANK: Record<string, number> = { EM_EXECUCAO: 0, AGENDADA: 1 }

/** Em execução e agendadas primeiro; depois as concluídas dos últimos 30 dias (mais recente antes). Sem canceladas nem não realizadas. */
export function ordersForOrigin<T extends OrderForOrigin>(orders: readonly T[], now = new Date()): T[] {
  const limit = now.getTime() - CONCLUIDAS_RECENTES_DIAS * 24 * 60 * 60 * 1000
  const open = orders.filter((order) => order.status.toUpperCase() in OPEN_RANK)
    .sort((a, b) => OPEN_RANK[a.status.toUpperCase()] - OPEN_RANK[b.status.toUpperCase()] || String(a.dataAgendada ?? '').localeCompare(String(b.dataAgendada ?? '')))
  const done = orders.filter((order) => order.status.toUpperCase() === 'CONCLUIDA' && order.concluidaEm && Date.parse(order.concluidaEm) >= limit)
    .sort((a, b) => String(b.concluidaEm).localeCompare(String(a.concluidaEm)))
  return [...open, ...done]
}

/** Coluna "Origem" do histórico, nos mesmos termos do dossiê: "OT vinculada", "Externa · Fornecedor", "No hospital", "Não informada". */
export function origemManutencaoLabel(origem: OrigemManutencaoEntry): string {
  if (origem.tipo === 'ordem_trabalho') return 'OT vinculada'
  if (origem.tipo === 'nao_informada') return 'Não informada'
  const fornecedor = origem.fornecedor?.trim()
  if (origem.destino === 'manutencao_externa') return fornecedor ? `Externa · ${fornecedor}` : 'Externa'
  return fornecedor ? `No hospital · ${fornecedor}` : 'No hospital'
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

/** Erro por campo, mostrado logo abaixo de cada um. */
export interface OriginErrors { ot?: string; fornecedor?: string; justificativa?: string }

export function originErrors(value: OriginValue): OriginErrors {
  if (value.mode === 'ot') return value.ordemTrabalhoId ? {} : { ot: 'Escolha a OT que originou a manutenção.' }
  return {
    ...(value.destino === 'manutencao_externa' && !value.fornecedor.trim() ? { fornecedor: 'Informe o fornecedor: ele é obrigatório na manutenção externa.' } : {}),
    ...(!value.justificativa.trim() ? { justificativa: 'Informe a justificativa da manutenção.' } : {}),
  }
}

/** Código do backend que cai num campo da origem. */
export function originErrorsFromCode(code: string | undefined): OriginErrors | null {
  switch (code) {
    case 'OT_DE_OUTRO_EQUIPAMENTO': return { ot: 'A OT escolhida não é deste equipamento. Escolha uma OT do próprio equipamento.' }
    case 'FORNECEDOR_OBRIGATORIO': return { fornecedor: 'Informe o fornecedor: ele é obrigatório na manutenção externa.' }
    case 'JUSTIFICATIVA_OBRIGATORIA': return { justificativa: 'Informe a justificativa da manutenção.' }
    default: return null
  }
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

/** Ids dos campos (o modal foca o primeiro inválido ao salvar). */
export const originFieldIds = { ot: 'maintenance-origin-ot', fornecedor: 'maintenance-origin-supplier', justificativa: 'maintenance-origin-text' } as const
