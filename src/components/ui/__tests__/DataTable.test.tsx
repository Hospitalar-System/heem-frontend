import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type DataColumn } from '../DataTable'

type Row = { id: string; nome: string; tipo: string }
const rows: Row[] = [{ id: '1', nome: 'Bomba', tipo: 'A' }, { id: '2', nome: 'Monitor', tipo: 'B' }]
const columns: DataColumn<Row>[] = [
  { key: 'nome', header: 'Nome', cell: (row) => row.nome },
  { key: 'tipo', header: 'Tipo', hideBelow: 'md', cell: (row) => row.tipo },
]

function setup(props: Partial<ComponentProps<typeof DataTable<Row>>> = {}) {
  render(<MemoryRouter><DataTable columns={columns} rows={rows} getRowId={(row) => row.id} label="Equipamentos" {...props} /></MemoryRouter>)
}

describe('DataTable', () => {
  it('renderiza colunas configuráveis com cabeçalhos scope=col', () => {
    setup()
    const headers = screen.getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent)).toEqual(['Nome', 'Tipo'])
    headers.forEach((header) => expect(header).toHaveAttribute('scope', 'col'))
    expect(screen.getByRole('table', { name: 'Equipamentos' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Monitor' })).toBeInTheDocument()
  })

  it('esconde a coluna abaixo do breakpoint com classe responsiva', () => {
    setup()
    expect(screen.getByRole('columnheader', { name: 'Tipo' })).toHaveClass('hidden', 'md:table-cell')
    expect(screen.getByRole('columnheader', { name: 'Nome' })).not.toHaveClass('hidden')
  })

  it('linha clicável responde a clique, Enter e Espaço', async () => {
    const onRowClick = vi.fn()
    const user = userEvent.setup()
    setup({ onRowClick })
    const row = screen.getAllByRole('row')[1]
    await user.click(row)
    row.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onRowClick).toHaveBeenCalledTimes(3)
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('clique em botão dentro da linha não dispara onRowClick', async () => {
    const onRowClick = vi.fn()
    const inner = vi.fn()
    const user = userEvent.setup()
    setup({ onRowClick, columns: [{ key: 'a', header: 'A', cell: () => <button type="button" onClick={inner}>Interno</button> }] })
    await user.click(screen.getAllByRole('button', { name: 'Interno' })[0])
    expect(inner).toHaveBeenCalled()
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('ações por linha abrem o menu de três pontos', async () => {
    const onEdit = vi.fn()
    const user = userEvent.setup()
    setup({ rowLabel: (row) => row.nome, rowActions: () => [{ label: 'Editar', onSelect: onEdit }] })
    expect(screen.getByRole('columnheader', { name: 'Ações' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ações de Bomba' }))
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }))
    expect(onEdit).toHaveBeenCalled()
  })

  it('não mostra o menu quando a linha não tem ações', () => {
    setup({ rowLabel: (row) => row.nome, rowActions: (row) => (row.id === '1' ? [{ label: 'Editar' }] : []) })
    expect(screen.getByRole('button', { name: 'Ações de Bomba' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ações de Monitor' })).not.toBeInTheDocument()
  })

  it('marca a linha selecionada', () => {
    setup({ selection: { selectedId: '2' } })
    const [, first, second] = screen.getAllByRole('row')
    expect(second).toHaveAttribute('aria-current', 'true')
    expect(second).toHaveClass('row-selected')
    expect(first).not.toHaveAttribute('aria-current')
  })

  it('carregando mostra skeleton com o mesmo número de colunas', () => {
    setup({ isLoading: true, loadingRows: 3, rowActions: () => [] })
    expect(screen.getByLabelText('Carregando equipamentos')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getAllByRole('row', { hidden: true })).toHaveLength(4)
    expect(screen.getAllByRole('cell', { hidden: true })).toHaveLength(9)
  })

  it('vazio mostra título, descrição e ação', () => {
    setup({ rows: [], empty: { title: 'Nada aqui', description: 'Crie o primeiro', action: <button type="button">Criar</button> } })
    expect(screen.getByRole('heading', { name: 'Nada aqui' })).toBeInTheDocument()
    expect(screen.getByText('Crie o primeiro')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('erro mostra alerta e tenta novamente', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    setup({ error: { message: 'Falhou', onRetry } })
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou')
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('ordenação controlada de fora com aria-sort', async () => {
    const onSortChange = vi.fn()
    const user = userEvent.setup()
    setup({ columns: [{ ...columns[0], sortable: true }, columns[1]], sort: { key: 'nome', direction: 'asc' }, onSortChange })
    const header = screen.getByRole('columnheader', { name: /Nome/ })
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    await user.click(within(header).getByRole('button'))
    expect(onSortChange).toHaveBeenCalledWith('nome')
  })

  it('rodapé de paginação integrado', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    setup({ pagination: { page: 1, size: 10, total: 30, onPageChange, onSizeChange: vi.fn() } })
    expect(screen.getByText('Mostrando 1–10 de 30')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
