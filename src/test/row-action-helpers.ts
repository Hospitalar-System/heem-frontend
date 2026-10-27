import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Abre o menu de ações da linha pelo nome acessível do botão e escolhe o item pelo rótulo. */
export async function chooseRowAction(user: UserEvent, menuName: string | RegExp, itemLabel: string | RegExp) {
  await user.click(screen.getByRole('button', { name: menuName }))
  await user.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: itemLabel }))
}

/** Confirma o diálogo aberto por um item de menu com `confirm`. */
export async function confirmRowAction(user: UserEvent, confirmLabel: string | RegExp) {
  await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: confirmLabel }))
}

/** Abre o menu da linha, devolve os rótulos dos itens e fecha com Esc (foco volta ao botão). */
export async function listRowActions(user: UserEvent, menuName: string | RegExp) {
  await user.click(screen.getByRole('button', { name: menuName }))
  const labels = within(await screen.findByRole('menu')).getAllByRole('menuitem').map((item) => item.textContent ?? '')
  await user.keyboard('{Escape}')
  return labels
}
