/** Filtros do backlog aceitos pela lista de chamados na URL (iguais aos parâmetros do backend). */
export type TicketAge = 'ate24h' | 'de1a3dias' | 'maisde3dias'

export const ageLabels: Record<TicketAge, string> = { ate24h: 'até 24 h', de1a3dias: '1 a 3 dias', maisde3dias: 'mais de 3 dias' }

export function parseAge(value: string | null): TicketAge | undefined {
  return value && value in ageLabels ? (value as TicketAge) : undefined
}

export function parseSituation(value: string | null): 'pendentes' | undefined {
  return value === 'pendentes' ? 'pendentes' : undefined
}

/** Link da lista de chamados para uma célula do backlog (severidade e faixa opcionais) mantendo hospital e setor. */
export function backlogTicketsPath(options: { severidade?: string; idade?: TicketAge; hospitalId?: string; setorId?: string }) {
  const params = new URLSearchParams({ situacao: 'pendentes' })
  if (options.severidade) params.set('severidade', options.severidade)
  if (options.idade) params.set('idade', options.idade)
  if (options.hospitalId) params.set('hospitalId', options.hospitalId)
  if (options.setorId) params.set('setorId', options.setorId)
  return `/tickets?${params.toString()}`
}
