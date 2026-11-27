/** Story 29.3/29.5: motivos da pausa do atendimento (o técnico pausa pelo app). */
export const pauseReasonLabels: Record<string, string> = {
  aguardando_orcamento: 'Aguardando orçamento',
  fornecedor_externo: 'Fornecedor externo',
  equipamento_indisponivel: 'Equipamento indisponível',
  outro: 'Outro motivo',
}

export const pauseReasonLabel = (motivo: string | null | undefined) => (motivo ? pauseReasonLabels[motivo] ?? motivo.replaceAll('_', ' ') : 'Motivo não informado')

/** Pausas que param o relógio do SLA de resolução (29.3); as demais contam. */
export const PAUSE_REASONS_STOP_SLA: readonly string[] = ['aguardando_orcamento', 'fornecedor_externo']

/** "há 3 h", "há 2 d": quanto tempo o chamado está parado. */
export function pausedFor(pausadoEm: string | null | undefined, now = Date.now()): string | null {
  if (!pausadoEm) return null
  const start = Date.parse(pausadoEm)
  if (Number.isNaN(start)) return null
  const minutes = Math.max(0, Math.floor((now - start) / 60000))
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `há ${hours} h`
  return `há ${Math.floor(hours / 24)} d`
}

/** Story 29.6: severidade sugerida pela criticidade do equipamento. */
export const ticketSeverityOptions = [
  { value: 'CRITICA', label: 'Crítica' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'BAIXA', label: 'Baixa' },
] as const

/** Story 29.5: rótulo de cada linha da linha do tempo do chamado (início, pausas, retomadas e resolução). */
export function timelineLabel(event: { acao: string; statusAnterior?: string | null; statusNovo?: string | null; pausaMotivo?: string | null }, fallback: Record<string, string>): string {
  if (event.acao !== 'TRANSICIONAR_CHAMADO' || !event.statusNovo) return fallback[event.acao] ?? event.acao.replaceAll('_', ' ').toLocaleLowerCase('pt-BR')
  const from = event.statusAnterior ?? ''
  switch (event.statusNovo) {
    case 'EM_ANDAMENTO': return from === 'PAUSADO' || from === 'AGUARDANDO_PECA' ? 'Atendimento retomado' : from === 'RESOLVIDO' ? 'Chamado reaberto' : 'Atendimento iniciado'
    case 'PAUSADO': return `Atendimento pausado: ${pauseReasonLabel(event.pausaMotivo)}`
    case 'AGUARDANDO_PECA': return 'Aguardando peça'
    case 'RESOLVIDO': return 'Chamado resolvido'
    case 'CANCELADO': return 'Chamado cancelado'
    default: return 'Status atualizado'
  }
}
