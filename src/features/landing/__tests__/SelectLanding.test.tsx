/* data-open/data-up e ids de aria-controls só são acessíveis por consulta direta ao DOM. */
/* eslint-disable testing-library/no-node-access, testing-library/no-container */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SelectLanding } from '../components/SelectLanding'

const css = readFileSync(path.resolve(__dirname, '../landing.css'), 'utf8')

const OPCOES = [
  { valor: 'a', rotulo: 'Engenharia clínica' },
  { valor: 'b', rotulo: 'Gestão hospitalar' },
  { valor: 'c', rotulo: 'Manutenção' },
  { valor: 'd', rotulo: 'TI / Sistemas' },
  { valor: 'e', rotulo: 'Outro' },
]

function Exemplo({ inicial = '', onValor = vi.fn(), onBlur }: { inicial?: string; onValor?: (v: string) => void; onBlur?: () => void }) {
  const [valor, setValor] = useState(inicial)
  return (
    <div>
      <label id="cargo-rotulo" htmlFor="cargo">Cargo</label>
      <SelectLanding id="cargo" rotuloId="cargo-rotulo" opcoes={OPCOES} valor={valor} onBlur={onBlur} onChange={(v) => { setValor(v); onValor(v) }} />
      <button type="button">depois</button>
    </div>
  )
}

const combo = () => screen.getByRole('combobox', { name: 'Cargo' })
const ativo = () => document.getElementById(screen.getByRole('combobox').getAttribute('aria-activedescendant') ?? '')

afterEach(() => vi.restoreAllMocks())

describe('SelectLanding - aparência e ARIA', () => {
  it('mostra o placeholder em cor muted e a lista fechada', () => {
    render(<Exemplo />)
    expect(combo()).toHaveTextContent('Selecione')
    expect(combo()).toHaveClass('empty')
    expect(combo()).toHaveAttribute('aria-expanded', 'false')
    expect(combo()).toHaveAttribute('aria-haspopup', 'listbox')
    expect(combo()).not.toHaveAttribute('aria-activedescendant')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('expõe combobox/listbox/option com aria-controls, aria-selected e aria-activedescendant', async () => {
    const user = userEvent.setup()
    render(<Exemplo inicial="c" />)
    expect(combo()).toHaveTextContent('Manutenção')
    expect(combo()).not.toHaveClass('empty')
    await user.click(combo())
    const lista = screen.getByRole('listbox', { name: 'Cargo' })
    expect(combo()).toHaveAttribute('aria-expanded', 'true')
    expect(combo()).toHaveAttribute('aria-controls', lista.id)
    expect(screen.getAllByRole('option')).toHaveLength(5)
    expect(screen.getByRole('option', { name: 'Manutenção' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Outro' })).toHaveAttribute('aria-selected', 'false')
    expect(combo()).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Manutenção' }).id)
    expect(combo()).toHaveFocus()
  })

  it('o rótulo do campo nomeia o controle, clicar nele abre a lista e o CSS reproduz a referência', async () => {
    const user = userEvent.setup()
    render(<Exemplo />)
    expect(combo()).toHaveAccessibleName('Cargo')
    await user.click(screen.getByText('Cargo'))
    expect(combo()).toHaveAttribute('aria-expanded', 'true')
    expect(css).toMatch(/\.landing-dd-list\s*\{[^}]*max-height: 236px;[^}]*overflow: auto/)
    expect(css).toMatch(/\.landing-dd-list\s*\{[^}]*border-radius: 16px/)
    expect(css).toMatch(/\.landing-dd-list::-webkit-scrollbar\s*\{\s*display: none/)
    expect(css).toMatch(/\.landing-dd-list li\s*\{[^}]*font-size: 15px/)
    expect(css).toMatch(/\.landing-sel\[data-open='true'\]::after\s*\{[^}]*rotate\(225deg\)/)
    expect(css).toMatch(/\.landing-sel\[data-up='true'\] \.landing-dd-list\s*\{[^}]*bottom: calc/)
    expect(css).toMatch(/li\[aria-selected='true'\]::after/)
  })
})

describe('SelectLanding - mouse', () => {
  it('abre e fecha pelo botão, seleciona uma opção, fecha e devolve o foco', async () => {
    const user = userEvent.setup()
    const onValor = vi.fn()
    render(<Exemplo onValor={onValor} />)
    await user.click(combo())
    expect(screen.getByRole('listbox')).toBeVisible()
    await user.click(combo())
    expect(screen.queryByRole('listbox')).toBeNull()
    await user.click(combo())
    await user.click(screen.getByRole('option', { name: 'Gestão hospitalar' }))
    expect(onValor).toHaveBeenCalledWith('b')
    expect(combo()).toHaveTextContent('Gestão hospitalar')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(combo()).toHaveFocus()
  })

  it('fecha ao clicar fora, sem alterar o valor', async () => {
    const user = userEvent.setup()
    const onValor = vi.fn()
    render(<Exemplo onValor={onValor} />)
    await user.click(combo())
    await user.click(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onValor).not.toHaveBeenCalled()
    expect(combo()).toHaveTextContent('Selecione')
  })
})

describe('SelectLanding - teclado', () => {
  it.each(['{Enter}', ' ', '{ArrowDown}', '{ArrowUp}'])('"%s" abre a lista', async (tecla) => {
    const user = userEvent.setup()
    render(<Exemplo />)
    combo().focus()
    await user.keyboard(tecla)
    expect(combo()).toHaveAttribute('aria-expanded', 'true')
  })

  it('setas navegam (com volta), Home/End saltam e Enter seleciona', async () => {
    const user = userEvent.setup()
    const onValor = vi.fn()
    render(<Exemplo onValor={onValor} />)
    combo().focus()
    await user.keyboard('{ArrowDown}')
    expect(ativo()).toHaveTextContent('Engenharia clínica')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(ativo()).toHaveTextContent('Manutenção')
    await user.keyboard('{ArrowUp}')
    expect(ativo()).toHaveTextContent('Gestão hospitalar')
    await user.keyboard('{End}')
    expect(ativo()).toHaveTextContent('Outro')
    await user.keyboard('{ArrowDown}')
    expect(ativo()).toHaveTextContent('Engenharia clínica')
    await user.keyboard('{ArrowUp}')
    expect(ativo()).toHaveTextContent('Outro')
    await user.keyboard('{Home}')
    expect(ativo()).toHaveTextContent('Engenharia clínica')
    await user.keyboard('{End}{Enter}')
    expect(onValor).toHaveBeenCalledWith('e')
    expect(combo()).toHaveTextContent('Outro')
    expect(combo()).toHaveAttribute('aria-expanded', 'false')
  })

  it('Espaço também seleciona a opção ativa', async () => {
    const user = userEvent.setup()
    const onValor = vi.fn()
    render(<Exemplo onValor={onValor} />)
    combo().focus()
    await user.keyboard('{ArrowDown}{ArrowDown} ')
    expect(onValor).toHaveBeenCalledWith('b')
  })

  it('Esc fecha, devolve o foco e não repassa o Esc (não fecha o diálogo)', async () => {
    const user = userEvent.setup()
    const noDocumento = vi.fn()
    document.addEventListener('keydown', noDocumento)
    render(<Exemplo />)
    combo().focus()
    await user.keyboard('{ArrowDown}')
    noDocumento.mockClear()
    await user.keyboard('{Escape}')
    document.removeEventListener('keydown', noDocumento)
    expect(combo()).toHaveAttribute('aria-expanded', 'false')
    expect(combo()).toHaveFocus()
    expect(noDocumento).not.toHaveBeenCalled()
  })

  it('Tab fecha sem alterar o valor e segue para o próximo controle', async () => {
    const user = userEvent.setup()
    const onValor = vi.fn()
    const onBlur = vi.fn()
    render(<Exemplo onValor={onValor} onBlur={onBlur} />)
    combo().focus()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    await user.tab()
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onValor).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'depois' })).toHaveFocus()
    expect(onBlur).toHaveBeenCalled()
  })

  it('digitar a inicial salta ao item; letras seguidas refinam; a mesma letra percorre', async () => {
    const user = userEvent.setup()
    render(<Exemplo />)
    combo().focus()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('t')
    expect(ativo()).toHaveTextContent('TI / Sistemas')
    await user.keyboard('{Escape}{ArrowDown}')
    await new Promise((resolve) => setTimeout(resolve, 700))
    await user.keyboard('o')
    expect(ativo()).toHaveTextContent('Outro')
  })

  it('type-ahead com a lista fechada abre já no item encontrado', async () => {
    const user = userEvent.setup()
    render(<Exemplo />)
    combo().focus()
    await user.keyboard('m')
    expect(combo()).toHaveAttribute('aria-expanded', 'true')
    expect(ativo()).toHaveTextContent('Manutenção')
  })

  it('letras repetidas percorrem os itens com a mesma inicial', async () => {
    const user = userEvent.setup()
    render(
      <SelectLanding id="x" rotuloId="r" opcoes={[{ valor: '1', rotulo: 'Alfa' }, { valor: '2', rotulo: 'Beta' }, { valor: '3', rotulo: 'Bravo' }]} valor="" onChange={() => {}} />,
    )
    screen.getByRole('combobox').focus()
    await user.keyboard('{ArrowDown}b')
    expect(ativo()).toHaveTextContent('Beta')
    await user.keyboard('b')
    expect(ativo()).toHaveTextContent('Bravo')
  })
})

describe('SelectLanding - posição', () => {
  const rect = (parcial: Partial<DOMRect>) => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}), ...parcial }) as DOMRect

  it('abre para baixo quando há espaço', async () => {
    const user = userEvent.setup()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect({ top: 100, bottom: 148 }))
    const { container } = render(<Exemplo />)
    await user.click(combo())
    expect(container.querySelector('.landing-sel')).toHaveAttribute('data-up', 'false')
  })

  it('abre para cima quando falta espaço abaixo', async () => {
    const user = userEvent.setup()
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect({ top: 700, bottom: 748 }))
    const { container } = render(<Exemplo />)
    await user.click(combo())
    expect(container.querySelector('.landing-sel')).toHaveAttribute('data-up', 'true')
    expect(screen.getByRole('listbox')).toHaveStyle({ maxHeight: '236px' })
  })

  it('limita a altura ao espaço disponível, com mínimo de 120 px', async () => {
    const user = userEvent.setup()
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 200 })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect({ top: 80, bottom: 128 }))
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(500)
    render(<Exemplo />)
    await user.click(combo())
    expect(screen.getByRole('listbox')).toHaveStyle({ maxHeight: '120px' })
  })
})
