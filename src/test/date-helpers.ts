import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

const monthNames = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'long' }))

/** Abre o DatePicker pelo nome acessível, navega até o mês e clica no dia ('YYYY-MM-DD'). */
export async function chooseDate(user: UserEvent, name: string | RegExp | HTMLElement, isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const trigger = typeof name === 'string' || name instanceof RegExp ? screen.getByRole('button', { name }) : name
  await user.click(trigger)
  const title = await screen.findByTestId('datepicker-title')
  const match = /^(.+) de (\d{4})$/.exec(title.textContent ?? '')
  if (!match) throw new Error(`Título do calendário inesperado: ${title.textContent}`)
  const shown = Number(match[2]) * 12 + monthNames.indexOf(match[1].toLowerCase())
  const diff = y * 12 + (m - 1) - shown
  for (let i = 0; i < Math.abs(diff); i += 1) await user.click(screen.getByRole('button', { name: diff > 0 ? 'Próximo mês' : 'Mês anterior' }))
  await user.click(screen.getByRole('button', { name: `${d} de ${monthNames[m - 1]} de ${y}` }))
}
