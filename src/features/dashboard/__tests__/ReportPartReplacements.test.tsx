import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ReportPartReplacements } from '../components/ReportPartReplacements'

const wrap = (ui: React.ReactNode) => <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>

/** Story 25.2: indicador "Trocas de peça por equipamento" na tela de Relatórios. */
describe('ReportPartReplacements', () => {
  it('lists equipment by number of replacements and links to the equipment', () => {
    render(wrap(<ReportPartReplacements items={[
      { equipamentoId: 'eq-2', codigo: 'EQ-2', nome: 'Monitor', trocas: 1, pecas: 1, chamados: 1 },
      { equipamentoId: 'eq-1', codigo: 'EQ-1', nome: 'Bomba de infusão', trocas: 3, pecas: 5, chamados: 2 },
    ]} />))
    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByRole('link')).toHaveAttribute('href', '/assets/eq-1')
    expect(within(rows[0]).getByText('5')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Monitor')).toBeInTheDocument()
  })

  it('shows the empty state for the period', () => {
    render(wrap(<ReportPartReplacements items={[]} />))
    expect(screen.getByText('Nenhuma peça trocada no período para os filtros selecionados.')).toBeInTheDocument()
  })
})
