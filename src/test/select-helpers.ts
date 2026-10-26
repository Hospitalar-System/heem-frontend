import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Abre o Select pelo nome acessível e escolhe a opção pelo rótulo exibido. */
export async function chooseOption(user: UserEvent, name: string | RegExp | HTMLElement, optionLabel: string | RegExp) {
  const combobox = typeof name === 'string' || name instanceof RegExp ? screen.getByRole('combobox', { name }) : name
  await user.click(combobox)
  await user.click(within(await screen.findByRole('listbox')).getByRole('option', { name: optionLabel }))
}

/** Abre o Select, devolve os rótulos das opções e fecha com Esc (foco volta ao botão). */
export async function listOptions(user: UserEvent, name: string | RegExp | HTMLElement) {
  const combobox = typeof name === 'string' || name instanceof RegExp ? screen.getByRole('combobox', { name }) : name
  await user.click(combobox)
  const labels = within(await screen.findByRole('listbox')).getAllByRole('option').map((option) => option.textContent ?? '')
  await user.keyboard('{Escape}')
  return labels
}
