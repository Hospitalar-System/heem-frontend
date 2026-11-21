import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DataTable, type DataColumn } from '../DataTable'

type Row = { id: string; nome: string; modelo: string; serie: string }
const rows: Row[] = [{ id: '1', nome: 'Monitor', modelo: 'MX450', serie: 'SN-1' }]
const columns: DataColumn<Row>[] = [
  { key: 'nome', header: 'Nome', essential: true, cell: (row) => row.nome },
  { key: 'modelo', header: 'Modelo', cell: (row) => row.modelo },
  { key: 'serie', header: 'Nº série', defaultHidden: true, cell: (row) => row.serie },
  { key: 'acoes', header: '', srHeader: 'Ações', cell: () => <button type="button">Abrir</button> },
]

const renderTable = (storageKey: string | null = 'teste') => render(<DataTable label="Itens" columns={columns} rows={rows} getRowId={(row) => row.id} storageKey={storageKey ?? undefined} />)
const headers = () => within(screen.getByRole('table', { name: 'Itens' })).getAllByRole('columnheader').map((header) => header.textContent)

describe('DataTable: menu Colunas', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('sem storageKey não mostra o menu e exibe todas as colunas', () => {
    renderTable(null)
    expect(screen.queryByRole('button', { name: /Colunas/ })).not.toBeInTheDocument()
    expect(headers()).toEqual(['Nome', 'Modelo', 'Nº série', 'Ações'])
  })

  it('respeita o padrão (coluna escondida de início) e lista só as colunas opcionais, nunca as essenciais nem as ações', async () => {
    const user = userEvent.setup()
    renderTable()
    expect(headers()).toEqual(['Nome', 'Modelo', 'Ações'])
    await user.click(screen.getByRole('button', { name: /Colunas/ }))
    const menu = within(screen.getByRole('dialog', { name: 'Escolher colunas' }))
    expect(menu.getAllByRole('checkbox').map((box) => box.parentElement?.textContent)).toEqual(['Modelo', 'Nº série'])
    expect(menu.getByRole('checkbox', { name: 'Modelo' })).toBeChecked()
    expect(menu.getByRole('checkbox', { name: 'Nº série' })).not.toBeChecked()
    expect(menu.getByRole('checkbox', { name: 'Modelo' })).toHaveFocus()
  })

  it('liga e desliga colunas, lembra a escolha por tabela e restaura o padrão', async () => {
    const user = userEvent.setup()
    const { unmount } = renderTable()
    await user.click(screen.getByRole('button', { name: /Colunas/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Nº série' }))
    await user.click(screen.getByRole('checkbox', { name: 'Modelo' }))
    expect(headers()).toEqual(['Nome', 'Nº série', 'Ações'])
    expect(JSON.parse(window.localStorage.getItem('heem:colunas:teste') ?? 'null')).toEqual(['modelo'])
    unmount()

    renderTable() // outra visita: a escolha volta
    expect(headers()).toEqual(['Nome', 'Nº série', 'Ações'])
    renderTable('outra-tabela')
    expect(screen.getAllByRole('table', { name: 'Itens' })[1]).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /Colunas/ })[0])
    await user.click(screen.getByRole('button', { name: 'Restaurar padrão' }))
    expect(window.localStorage.getItem('heem:colunas:teste')).toBeNull()
    expect(within(screen.getAllByRole('table', { name: 'Itens' })[0]).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Nome', 'Modelo', 'Ações'])
  })

  it('o botão avisa quantas colunas estão ocultas e Restaurar padrão fica inativo (aria-disabled) no padrão', async () => {
    const user = userEvent.setup()
    renderTable()
    expect(screen.getByRole('button', { name: 'Colunas · 1 oculta' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Colunas/ }))
    expect(screen.getByRole('button', { name: 'Restaurar padrão' })).toHaveAttribute('aria-disabled', 'true')
    await user.click(screen.getByRole('checkbox', { name: 'Modelo' }))
    expect(screen.getByRole('button', { name: 'Colunas · 2 ocultas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restaurar padrão' })).not.toHaveAttribute('aria-disabled')
  })

  it('leva o botão Colunas para o elemento da página indicado (ao lado da busca)', () => {
    render(<><div data-testid="slot" id="slot-colunas" /><DataTable label="Itens" columns={columns} rows={rows} getRowId={(row) => row.id} storageKey="teste" columnsMenuContainerId="slot-colunas" /></>)
    expect(within(screen.getByTestId('slot')).getByRole('button', { name: /Colunas/ })).toBeInTheDocument()
  })

  it('Esc fecha o menu e devolve o foco ao botão', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('button', { name: /Colunas/ }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Colunas/ })).toHaveFocus()
  })

  it('funciona sem localStorage (lança erro): a escolha vale na sessão da tela', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    const user = userEvent.setup()
    renderTable()
    expect(headers()).toEqual(['Nome', 'Modelo', 'Ações'])
    await user.click(screen.getByRole('button', { name: /Colunas/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Nº série' }))
    expect(headers()).toEqual(['Nome', 'Modelo', 'Nº série', 'Ações'])
  })

  it('ignora no armazenamento chaves de colunas essenciais ou que não existem mais', () => {
    window.localStorage.setItem('heem:colunas:teste', JSON.stringify(['nome', 'acoes', 'antiga']))
    renderTable()
    expect(headers()).toEqual(['Nome', 'Modelo', 'Nº série', 'Ações'])
  })
})
