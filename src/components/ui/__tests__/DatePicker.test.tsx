import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ComponentProps, type FormEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chooseDate } from '@/test/date-helpers'
import { formatBr, parseDate } from '../civil-date'
import { DatePicker } from '../DatePicker'

function Harness({ initial = '', onChange, ...rest }: { initial?: string; onChange?: (value: string) => void } & Partial<ComponentProps<typeof DatePicker>>) {
  const [value, setValue] = useState(initial)
  return <div>
    <label htmlFor="dt">Data de teste</label>
    <DatePicker id="dt" value={value} onChange={(next) => { setValue(next); onChange?.(next) }} {...rest} />
    <button type="button">fora</button>
  </div>
}

describe('DatePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 15, 23, 30))
  })
  afterEach(() => vi.useRealTimers())

  it('formata dd/mm/aaaa sem deslocar o dia por fuso', () => {
    expect(formatBr(parseDate('2026-03-01')!)).toBe('01/03/2026')
    expect(parseDate('2026-02-30')).toBeNull()
    render(<Harness initial="2026-12-31" />)
    expect(screen.getByRole('button', { name: 'Data de teste' })).toHaveTextContent('31/12/2026')
  })

  it('mostra placeholder, abre, destaca hoje e o dia selecionado e fecha', async () => {
    const user = userEvent.setup()
    render(<Harness initial="2026-10-20" />)
    const trigger = screen.getByRole('button', { name: 'Data de teste' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('dialog', { name: 'Escolher data' })).toBeInTheDocument()
    expect(screen.getByTestId('datepicker-title')).toHaveTextContent('outubro de 2026')
    expect(screen.getByRole('button', { name: '15 de outubro de 2026' })).toHaveAttribute('aria-current', 'date')
    expect(within(screen.getByRole('gridcell', { selected: true })).getByRole('button')).toHaveAccessibleName('20 de outubro de 2026')
    await user.click(trigger)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('seleciona por clique, navega entre meses e devolve o foco', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await chooseDate(user, 'Data de teste', '2026-12-05')
    expect(onChange).toHaveBeenCalledWith('2026-12-05')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const trigger = screen.getByRole('button', { name: 'Data de teste' })
    expect(trigger).toHaveTextContent('05/12/2026')
    expect(trigger).toHaveFocus()
  })

  it('navega pelo teclado: setas, Home/End, PageUp/PageDown e Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Data de teste' }))
    expect(screen.getByRole('button', { name: '15 de outubro de 2026' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: '16 de outubro de 2026' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: '23 de outubro de 2026' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('button', { name: '18 de outubro de 2026' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('button', { name: '24 de outubro de 2026' })).toHaveFocus()
    await user.keyboard('{PageDown}')
    expect(screen.getByTestId('datepicker-title')).toHaveTextContent('novembro de 2026')
    expect(screen.getByRole('button', { name: '24 de novembro de 2026' })).toHaveFocus()
    await user.keyboard('{PageUp}{PageUp}')
    expect(screen.getByTestId('datepicker-title')).toHaveTextContent('setembro de 2026')
    await user.keyboard('{ArrowUp}{Enter}')
    expect(onChange).toHaveBeenCalledWith('2026-09-17')
  })

  it('Esc fecha sem alterar, devolve o foco e não propaga', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onDocumentKey = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Data de teste' }))
    document.addEventListener('keydown', onDocumentKey)
    await user.keyboard('{Escape}')
    document.removeEventListener('keydown', onDocumentKey)
    expect(onDocumentKey).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Data de teste' })).toHaveFocus()
  })

  it('clicar fora fecha', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Data de teste' }))
    await user.click(screen.getByRole('button', { name: 'fora' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('respeita min e max: dias fora ficam desabilitados e não são selecionáveis', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} min="2026-10-10" max="2026-10-20" />)
    await user.click(screen.getByRole('button', { name: 'Data de teste' }))
    expect(screen.getByRole('button', { name: '9 de outubro de 2026' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: '21 de outubro de 2026' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: '10 de outubro de 2026' })).not.toHaveAttribute('aria-disabled')
    await user.click(screen.getByRole('button', { name: '21 de outubro de 2026' }))
    expect(onChange).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '20 de outubro de 2026' }))
    expect(onChange).toHaveBeenCalledWith('2026-10-20')
  })

  it('Hoje seleciona a data atual e Limpar zera o valor', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} initial="2026-01-02" />)
    await user.click(screen.getByRole('button', { name: 'Data de teste' }))
    await user.click(screen.getByRole('button', { name: 'Hoje' }))
    expect(onChange).toHaveBeenLastCalledWith('2026-10-15')
    await user.click(screen.getByRole('button', { name: 'Data de teste' }))
    await user.click(screen.getByRole('button', { name: 'Limpar' }))
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(screen.getByRole('button', { name: 'Data de teste' })).toHaveTextContent('dd/mm/aaaa')
  })

  it('required esconde Limpar e bloqueia o envio nativo enquanto vazio', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())
    render(<form onSubmit={onSubmit}><Harness required /><button type="submit">Enviar</button></form>)
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(onSubmit).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Data de teste' }))
    expect(screen.queryByRole('button', { name: 'Limpar' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '15 de outubro de 2026' }))
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('desabilitado não abre e aria-invalid é exposto', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness disabled />)
    await user.click(screen.getByRole('button', { name: 'Data de teste' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(<Harness aria-invalid />)
    expect(screen.getByRole('button', { name: 'Data de teste' })).toHaveAttribute('aria-invalid', 'true')
  })
})
