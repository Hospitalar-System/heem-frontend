import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge, type BadgeVariant } from '../Badge'

describe('Badge', () => {
  it.each<[BadgeVariant, string]>([
    ['neutral', 'badge-neutral'],
    ['success', 'badge-success'],
    ['warning', 'badge-warning'],
    ['danger', 'badge-danger'],
    ['info', 'badge-info'],
  ])('aplica a variante %s', (variant, cls) => {
    render(<Badge variant={variant}>Selo</Badge>)
    expect(screen.getByText('Selo')).toHaveClass(cls)
  })

  it('usa neutro por padrão, sem borda, com tamanho e raio únicos', () => {
    render(<Badge className="extra">Selo</Badge>)
    const badge = screen.getByText('Selo')
    expect(badge).toHaveClass('badge-neutral', 'rounded-md', 'text-[11px]', 'extra')
    expect(badge.className).not.toMatch(/\bborder/)
  })
})

describe('Badge com ícone', () => {
  it('renderiza o ícone decorativo e repassa atributos', () => {
    render(<Badge icon={<svg data-testid="ic" />} title="Ajuda">Selo</Badge>)
    expect(screen.getByText('Selo')).toContainElement(screen.getByTestId('ic'))
    expect(screen.getByTitle('Ajuda')).toBeInTheDocument()
  })
})
