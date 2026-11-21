import type { Ticket } from '../types'

/** Código legível do chamado (ex.: CH-6); sem código, cai nos 8 primeiros caracteres do id. O id fica só na rota. */
export function ticketCode(ticket: Pick<Ticket, 'id' | 'codigo'>) {
  return ticket.codigo?.trim() || ticket.id.slice(0, 8)
}
