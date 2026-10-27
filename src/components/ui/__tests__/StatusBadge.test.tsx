import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge, type StatusTone } from '../StatusBadge'

describe('StatusBadge', () => {
  it.each<StatusTone>(['neutral', 'success', 'warning', 'danger', 'info'])('mostra sempre o texto no tom %s', (tone) => {
    render(<StatusBadge tone={tone}>Situação</StatusBadge>)
    expect(screen.getByText('Situação')).toHaveAttribute('data-variant', tone)
  })

  it('usa o tom neutro por padrão e o tamanho pequeno quando pedido', () => {
    render(<><StatusBadge>Padrão</StatusBadge><StatusBadge size="sm">Pequeno</StatusBadge></>)
    expect(screen.getByText('Padrão')).toHaveAttribute('data-variant', 'neutral')
    expect(screen.getByText('Padrão')).toHaveClass('text-[11px]')
    expect(screen.getByText('Pequeno')).toHaveClass('text-[10px]')
  })
})
