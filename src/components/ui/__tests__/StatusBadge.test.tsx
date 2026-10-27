import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge, type StatusTone } from '../StatusBadge'

describe('StatusBadge', () => {
  it.each<StatusTone>(['neutral', 'success', 'warning', 'danger', 'info'])('mostra sempre o texto e a variante %s', (tone) => {
    render(<StatusBadge tone={tone}>Situação</StatusBadge>)
    expect(screen.getByText('Situação')).toHaveClass(`badge-${tone}`)
  })

  it('usa o tom neutro por padrão', () => {
    render(<StatusBadge>Padrão</StatusBadge>)
    expect(screen.getByText('Padrão')).toHaveClass('badge-neutral')
  })
})
