import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { chooseOption } from '@/test/select-helpers'
import { Pagination } from '../Pagination'
import { pageItems } from '../pagination-items'

function setup(props: Partial<ComponentProps<typeof Pagination>> = {}) {
  const onPageChange = vi.fn()
  const onSizeChange = vi.fn()
  render(<Pagination page={1} size={25} total={120} onPageChange={onPageChange} onSizeChange={onSizeChange} {...props} />)
  return { onPageChange, onSizeChange }
}

describe('Pagination', () => {
  it('mostra o intervalo e o total da página atual', () => {
    setup({ page: 2 })
    expect(screen.getByText('Mostrando 26–50 de 120')).toBeInTheDocument()
  })

  it('limita o fim do intervalo ao total na última página', () => {
    setup({ page: 5 })
    expect(screen.getByText('Mostrando 101–120 de 120')).toBeInTheDocument()
  })

  it('não renderiza nada com total 0', () => {
    setup({ total: 0 })
    expect(screen.queryByRole('navigation', { name: 'Paginação' })).not.toBeInTheDocument()
  })

  it('com uma única página mostra só total e tamanho, sem números', () => {
    setup({ total: 8 })
    expect(screen.getByText('Mostrando 1–8 de 8')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Itens por página' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Próxima página' })).not.toBeInTheDocument()
  })

  it('expõe a navegação acessível, a página atual e desabilita anterior na primeira página', async () => {
    const { onPageChange } = setup({ page: 1 })
    const nav = screen.getByRole('navigation', { name: 'Paginação' })
    expect(within(nav).getByRole('button', { name: 'Ir para a página 1' })).toHaveAttribute('aria-current', 'page')
    const previous = within(nav).getByRole('button', { name: 'Página anterior' })
    expect(previous).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(previous)
    expect(onPageChange).not.toHaveBeenCalled()
    expect(within(nav).getByRole('button', { name: 'Próxima página' })).toHaveAttribute('aria-disabled', 'false')
  })

  it('desabilita próxima na última página', async () => {
    const { onPageChange } = setup({ page: 5 })
    const next = screen.getByRole('button', { name: 'Próxima página' })
    expect(next).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(next)
    expect(onPageChange).not.toHaveBeenCalled()
  })

  it('navega por anterior, próxima e número de página, também pelo teclado', async () => {
    const user = userEvent.setup()
    const { onPageChange } = setup({ page: 3 })
    await user.click(screen.getByRole('button', { name: 'Página anterior' }))
    expect(onPageChange).toHaveBeenLastCalledWith(2)
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(onPageChange).toHaveBeenLastCalledWith(4)
    screen.getByRole('button', { name: 'Ir para a página 5' }).focus()
    await user.keyboard('{Enter}')
    expect(onPageChange).toHaveBeenLastCalledWith(5)
  })

  it('troca o tamanho entre 10, 25 e 50', async () => {
    const user = userEvent.setup()
    const { onSizeChange } = setup()
    await chooseOption(user, 'Itens por página', '50')
    expect(onSizeChange).toHaveBeenCalledWith(50)
  })

  it('usa reticências quando há muitas páginas', () => {
    expect(pageItems(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageItems(1, 20)).toEqual([1, 2, 3, 4, 5, 'gap-end', 20])
    expect(pageItems(10, 20)).toEqual([1, 'gap-start', 9, 10, 11, 'gap-end', 20])
    expect(pageItems(20, 20)).toEqual([1, 'gap-start', 16, 17, 18, 19, 20])
    setup({ page: 10, total: 500, size: 25 })
    expect(screen.getAllByText('…')).toHaveLength(2)
  })

  it('anuncia o intervalo numa região viva e usa só tokens de cor', () => {
    setup()
    expect(screen.getByText('Mostrando 1–25 de 120')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('navigation').innerHTML).not.toMatch(/#[0-9a-f]{3,6}|border-white|bg-white/i)
  })
})
