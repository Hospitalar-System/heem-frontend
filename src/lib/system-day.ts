/**
 * Fuso único do sistema (o mesmo dos dias de abertura da lista de chamados no backend): UTC-03:00, sem horário de verão.
 * Os limites de período dos relatórios e das exportações são o início e o fim DO DIA nesse fuso, para que os números
 * do relatório coincidam com a lista filtrada por abertoDe/abertoAte.
 */
export const SYSTEM_UTC_OFFSET = '-03:00'

/** Instante (ISO, UTC) do início do dia civil `yyyy-MM-dd` no fuso do sistema. */
export const startOfSystemDay = (day: string) => new Date(`${day}T00:00:00.000${SYSTEM_UTC_OFFSET}`).toISOString()

/** Instante (ISO, UTC) do último milissegundo do dia civil `yyyy-MM-dd` no fuso do sistema. */
export const endOfSystemDay = (day: string) => new Date(`${day}T23:59:59.999${SYSTEM_UTC_OFFSET}`).toISOString()
