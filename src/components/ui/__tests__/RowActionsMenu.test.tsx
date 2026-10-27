import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { chooseRowAction } from '@/test/row-action-helpers'
import { RowActionsMenu, type RowAction } from '../RowActionsMenu'

function renderMenu(actions: RowAction[], label = 'Fulano') {
  return render(<MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<div><table><tbody><tr><td><RowActionsMenu label={label} actions={actions} /></td></tr></tbody></table><button type="button">fora</button></div>} />
      <Route path="/destino" element={<p>Página destino</p>} />
    </Routes>
  </MemoryRouter>)
}

describe('RowActionsMenu', () => {
  it('expõe o padrão de menu button e abre/fecha pelo clique', async () => {
    const user = userEvent.setup()
    renderMenu([{ label: 'Editar', onSelect: vi.fn() }])
    const trigger = screen.getByRole('button', { name: 'Ações de Fulano' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(1)
    await user.click(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renderiza o menu num portal fora da tabela', async () => {
    const user = userEvent.setup()
    renderMenu([{ label: 'Editar' }])
    await user.click(screen.getByRole('button', { name: 'Ações de Fulano' }))
    expect(within(screen.getByRole('table')).queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('navega pelo teclado, executa com Enter e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onOther = vi.fn()
    renderMenu([{ label: 'Editar', onSelect: onEdit }, { label: 'Duplicar', onSelect: onOther }, { label: 'Arquivar', onSelect: vi.fn() }])
    const trigger = screen.getByRole('button', { name: 'Ações de Fulano' })
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Duplicar' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('menuitem', { name: 'Arquivar' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Arquivar' })).toHaveFocus()
    await user.keyboard('d')
    expect(screen.getByRole('menuitem', { name: 'Duplicar' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onOther).toHaveBeenCalledTimes(1)
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('abre com Enter/Espaço no botão e fecha com Esc devolvendo o foco', async () => {
    const user = userEvent.setup()
    renderMenu([{ label: 'Editar' }])
    const trigger = screen.getByRole('button', { name: 'Ações de Fulano' })
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    await user.keyboard(' ')
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    await user.keyboard('{Escape}')
  })

  it('fecha com Tab e com clique fora', async () => {
    const user = userEvent.setup()
    renderMenu([{ label: 'Editar' }])
    await user.click(screen.getByRole('button', { name: 'Ações de Fulano' }))
    await user.keyboard('{Tab}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ações de Fulano' }))
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'fora' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('item desabilitado não executa e é pulado na navegação', async () => {
    const user = userEvent.setup()
    const onBlocked = vi.fn()
    renderMenu([{ label: 'Bloqueado', disabled: true, onSelect: onBlocked }, { label: 'Liberado', onSelect: vi.fn() }])
    await user.click(screen.getByRole('button', { name: 'Ações de Fulano' }))
    const blocked = screen.getByRole('menuitem', { name: 'Bloqueado' })
    expect(blocked).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('menuitem', { name: 'Liberado' })).toHaveFocus()
    await user.click(blocked)
    expect(onBlocked).not.toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('ação destrutiva com confirmação só executa depois de confirmar', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderMenu([{ label: 'Desativar', destructive: true, onSelect: onDelete, confirm: { title: 'Desativar usuário?', description: 'A pessoa perderá acesso.', confirmLabel: 'Sim, desativar' } }])
    await chooseRowAction(user, 'Ações de Fulano', 'Desativar')
    const dialog = await screen.findByRole('dialog', { name: 'Desativar usuário?' })
    expect(dialog).toHaveTextContent('A pessoa perderá acesso.')
    expect(onDelete).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ações de Fulano' })).toHaveFocus()
    await chooseRowAction(user, 'Ações de Fulano', 'Desativar')
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sim, desativar' }))
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('item com `to` navega como link', async () => {
    const user = userEvent.setup()
    renderMenu([{ label: 'Ver detalhes', to: '/destino' }])
    await user.click(screen.getByRole('button', { name: 'Ações de Fulano' }))
    const link = screen.getByRole('menuitem', { name: 'Ver detalhes' })
    expect(link).toHaveAttribute('href', '/destino')
    await user.click(link)
    expect(await screen.findByText('Página destino')).toBeInTheDocument()
  })

  it('não abre quando está desabilitado', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><RowActionsMenu label="Fulano" disabled actions={[{ label: 'Editar' }]} /></MemoryRouter>)
    const trigger = screen.getByRole('button', { name: 'Ações de Fulano' })
    expect(trigger).toBeDisabled()
    await user.click(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
