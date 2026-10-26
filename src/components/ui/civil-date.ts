/** Data civil sem fuso: só ano, mês (1-12) e dia. Nunca usamos `new Date('YYYY-MM-DD')` (UTC). */
export type CivilDate = { y: number; m: number; d: number }

export const pad = (n: number, size = 2) => String(n).padStart(size, '0')

export function parseDate(value?: string | null): CivilDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '')
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const valid = new Date(y, m - 1, d)
  return valid.getFullYear() === y && valid.getMonth() === m - 1 && valid.getDate() === d ? { y, m, d } : null
}
export const isoOf = ({ y, m, d }: CivilDate) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`
export const formatBr = ({ y, m, d }: CivilDate) => `${pad(d)}/${pad(m)}/${pad(y, 4)}`
export const keyOf = ({ y, m, d }: CivilDate) => y * 10000 + m * 100 + d
export const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()
export const weekday = ({ y, m, d }: CivilDate) => new Date(y, m - 1, d).getDay()
export function addDays({ y, m, d }: CivilDate, n: number): CivilDate {
  const date = new Date(y, m - 1, d + n)
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() }
}
export function addMonths({ y, m, d }: CivilDate, n: number): CivilDate {
  const first = new Date(y, m - 1 + n, 1)
  const ny = first.getFullYear()
  const nm = first.getMonth() + 1
  return { y: ny, m: nm, d: Math.min(d, daysInMonth(ny, nm)) }
}
export const monthName = (m: number) => new Date(2000, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
export const longLabel = ({ y, m, d }: CivilDate) => `${d} de ${monthName(m)} de ${y}`
export function todayCivil(): CivilDate {
  const now = new Date()
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }
}
