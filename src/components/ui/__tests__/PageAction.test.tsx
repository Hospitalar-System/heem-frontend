import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Wrench } from 'lucide-react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { PageAction } from '../PageAction'

describe('PageAction', () => {
  it('renderiza um botão primário com ícone à esquerda e dispara onClick', async () => {
    const onClick = vi.fn()
    render(<PageAction onClick={onClick}>Novo plano</PageAction>)

    const button = screen.getByRole('button', { name: 'Novo plano' })
    expect(button).toHaveClass('bg-primary', 'h-9')
    await userEvent.setup().click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renderiza como link quando recebe `to` e mantém o nome acessível', () => {
    render(<MemoryRouter><PageAction to="/assets/new" icon={Wrench}>Novo equipamento</PageAction></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Novo equipamento' })).toHaveAttribute('href', '/assets/new')
  })

  it('aplica a variante secundária e a largura total no mobile', () => {
    render(<PageAction variant="secondary" fullWidthMobile onClick={() => undefined}>Importar</PageAction>)
    const button = screen.getByRole('button', { name: 'Importar' })
    expect(button).toHaveClass('border', 'max-sm:w-full')
    expect(button).not.toHaveClass('bg-primary')
  })

  it('no cabeçalho esconde só o texto no mobile, preservando o nome acessível', () => {
    render(<PageAction collapseLabelOnMobile onClick={() => undefined}>Nova OT</PageAction>)
    expect(screen.getByRole('button', { name: 'Nova OT' })).toHaveClass('max-sm:w-9')
    expect(screen.getByText('Nova OT')).toHaveClass('max-sm:sr-only')
  })

  it('desabilitado não navega nem dispara a ação', async () => {
    const onClick = vi.fn()
    render(<PageAction disabled onClick={onClick}>Novo</PageAction>)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Novo' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
