import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ComponentProps, type FormEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { chooseOption } from '@/test/select-helpers'
import { Select, type SelectOption } from '../Select'

const options: SelectOption[] = [
  { value: '', label: 'Todos' },
  { value: 'a', label: 'Alfa' },
  { value: 'b', label: 'Beta', disabled: true },
  { value: 'c', label: 'Charlie' },
  { value: 'd', label: 'Delta' },
]

function Harness({ initial = '', onChange, ...rest }: { initial?: string; onChange?: (value: string) => void } & Partial<ComponentProps<typeof Select>>) {
  const [value, setValue] = useState(initial)
  return <div>
    <label htmlFor="sel">Letra</label>
    <Select id="sel" value={value} onChange={(next) => { setValue(next); onChange?.(next) }} options={options} {...rest} />
    <button type="button">fora</button>
  </div>
}

describe('Select', () => {
  it('expõe o padrão ARIA de combobox com nome acessível pelo label', async () => {
    render(<Harness />)
    const combobox = screen.getByRole('combobox', { name: 'Letra' })
    expect(combobox).toHaveAttribute('aria-haspopup', 'listbox')
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByLabelText('Letra')).toBe(combobox)
    await userEvent.setup().click(combobox)
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    const listbox = screen.getByRole('listbox')
    expect(combobox).toHaveAttribute('aria-controls', listbox.id)
    expect(within(listbox).getAllByRole('option')).toHaveLength(5)
    expect(within(listbox).getByRole('option', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true')
  })

  it('abre e fecha pelo clique e mostra o placeholder sem valor correspondente', async () => {
    const user = userEvent.setup()
    render(<Harness initial="zzz" placeholder="Escolha uma letra" />)
    const combobox = screen.getByRole('combobox', { name: 'Letra' })
    expect(combobox).toHaveTextContent('Escolha uma letra')
    await user.click(combobox)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.click(combobox)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('seleciona por clique, fecha a lista e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await chooseOption(user, 'Letra', 'Charlie')
    expect(onChange).toHaveBeenCalledWith('c')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    const combobox = screen.getByRole('combobox', { name: 'Letra' })
    expect(combobox).toHaveTextContent('Charlie')
    expect(combobox).toHaveFocus()
  })

  it('não seleciona opção desabilitada', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('combobox', { name: 'Letra' }))
    await user.click(screen.getByRole('option', { name: 'Beta' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('navega pelo teclado: setas, Home, End, Enter, pulando opções desabilitadas', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const combobox = screen.getByRole('combobox', { name: 'Letra' })
    combobox.focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(combobox).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Todos' }).id)
    await user.keyboard('{ArrowDown}')
    expect(combobox).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Alfa' }).id)
    await user.keyboard('{ArrowDown}')
    expect(combobox).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Charlie' }).id)
    await user.keyboard('{End}')
    expect(combobox).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Delta' }).id)
    await user.keyboard('{Home}')
    expect(combobox).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Todos' }).id)
    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledWith('a')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(combobox).toHaveFocus()
  })

  it('Espaço abre e seleciona; Esc fecha sem alterar e devolve o foco', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} initial="a" />)
    const combobox = screen.getByRole('combobox', { name: 'Letra' })
    combobox.focus()
    await user.keyboard(' ')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{ArrowDown}{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    expect(combobox).toHaveFocus()
    await user.keyboard(' ')
    await user.keyboard('{ArrowDown}')
    await user.keyboard(' ')
    expect(onChange).toHaveBeenCalledWith('c')
  })

  it('Esc com a lista aberta não propaga (não fecha o modal ao redor)', async () => {
    const user = userEvent.setup()
    const onDocumentKey = vi.fn()
    render(<Harness />)
    screen.getByRole('combobox', { name: 'Letra' }).focus()
    await user.keyboard('{ArrowDown}')
    document.addEventListener('keydown', onDocumentKey)
    await user.keyboard('{Escape}')
    document.removeEventListener('keydown', onDocumentKey)
    expect(onDocumentKey).not.toHaveBeenCalled()
  })

  it('digitar letras salta para a opção correspondente, aberto ou fechado', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const combobox = screen.getByRole('combobox', { name: 'Letra' })
    combobox.focus()
    await user.keyboard('d')
    expect(onChange).toHaveBeenLastCalledWith('d')
    await user.keyboard('{ArrowDown}')
    await new Promise((resolve) => setTimeout(resolve, 700))
    await user.keyboard('c')
    expect(combobox).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Charlie' }).id)
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('c')
  })

  it('Tab fecha a lista e clicar fora também', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const combobox = screen.getByRole('combobox', { name: 'Letra' })
    await user.click(combobox)
    await user.tab()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    await user.click(combobox)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'fora' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('desabilitado não abre e erro marca aria-invalid', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness disabled />)
    const combobox = screen.getByRole('combobox', { name: 'Letra' })
    expect(combobox).toBeDisabled()
    await user.click(combobox)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    rerender(<Harness aria-invalid />)
    expect(screen.getByRole('combobox', { name: 'Letra' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('aria-label dá o nome acessível e name gera input oculto com o valor', () => {
    render(<Select aria-label="Filtrar" name="filtro" value="a" onChange={() => {}} options={options} />)
    expect(screen.getByRole('combobox', { name: 'Filtrar' })).toHaveTextContent('Alfa')
    expect(screen.getByDisplayValue('a')).toHaveAttribute('name', 'filtro')
  })

  it('required impede o envio nativo enquanto vazio', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault())
    render(<form onSubmit={onSubmit}><Harness required /><button type="submit">Enviar</button></form>)
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(onSubmit).not.toHaveBeenCalled()
    await chooseOption(user, 'Letra', 'Alfa')
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
