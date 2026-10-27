import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { DashboardSidebar } from '../components/DashboardSidebar'

vi.mock('@/features/auth/api/logout', () => ({ logout: vi.fn() }))

describe('DashboardSidebar — estrutura', () => {
  it('mantém logo e rodapé fixos e rola só o miolo do menu', () => {
    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    const aside = screen.getByRole('complementary', { name: 'Navegação principal' })
    expect(aside.className).toMatch(/max-h-dvh/)
    expect(aside.className).toMatch(/overflow-hidden/)
    const menu = screen.getByTestId('sidebar-menu')
    expect(menu.className).toMatch(/min-h-0/)
    expect(menu.className).toMatch(/flex-1/)
    expect(menu.className).toMatch(/overflow-y-auto/)
    expect(aside.firstElementChild?.className).toMatch(/shrink-0/)
    expect(aside.lastElementChild?.className).toMatch(/shrink-0/)
    expect(menu.contains(screen.getByRole('navigation'))).toBe(true)
  })

  it('não lista Setores: ficam dentro do hospital', () => {
    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Hospitais' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Setores' })).not.toBeInTheDocument()
  })
})
