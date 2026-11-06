/** "05/11/2026" a partir de um instante ISO; vazio/inválido devolve null (nunca houve manutenção). */
export function formatLastMaintenance(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}
