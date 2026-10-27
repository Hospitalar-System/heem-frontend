import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FilterBar, FilterRange, FilterWide } from '../FilterBar'

describe('FilterBar', () => {
  it('expõe a região de filtros com grade responsiva e campos que não estouram', () => {
    render(<FilterBar label="Filtros de teste"><FilterWide><input aria-label="Buscar" data-testid="wide" /></FilterWide><select aria-label="Status" /></FilterBar>)
    const region = screen.getByRole('region', { name: 'Filtros de teste' })
    expect(region.className).toContain('grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))]')
    expect(region).toContainElement(screen.getByTestId('wide'))
    expect(screen.getByLabelText('Buscar')).toBeInTheDocument()
  })

  it('agrupa o período em linha própria que quebra em telas estreitas', () => {
    render(<FilterBar label="Filtros"><FilterRange from={<input aria-label="Data inicial" />} to={<input aria-label="Data final" />} /></FilterBar>)
    const group = screen.getByRole('group', { name: 'Período' })
    expect(group).toHaveClass('col-span-full', 'flex-wrap')
    expect(group).toContainElement(screen.getByLabelText('Data inicial'))
    expect(group).toContainElement(screen.getByLabelText('Data final'))
    expect(screen.getByText('até')).toBeInTheDocument()
  })
})
