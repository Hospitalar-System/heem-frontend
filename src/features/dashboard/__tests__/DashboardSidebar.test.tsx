import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
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

  describe('rodapé do usuário', () => {
    const uuid = '344425e3-260b-4406-a6c1-111111111111'
    function login(name: string, email?: string) {
      act(() => setAuthSession('token', { id: uuid, name, email, roles: ['admin_cliente'], tenantId: null }))
      render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    }
    afterEach(() => act(() => clearAuthSession()))

    it('mostra nome, iniciais e papel, com o e-mail no title', () => {
      login('Administrador Demo', 'admin@heem.dev')
      expect(screen.getByText('Administrador Demo')).toHaveAttribute('title', 'admin@heem.dev')
      expect(screen.getByText('AD')).toBeInTheDocument()
      expect(screen.getByText('Admin do Cliente')).toBeInTheDocument()
      expect(screen.queryByText(new RegExp(uuid.slice(0, 8)))).not.toBeInTheDocument()
    })

    it('sem nome usa o e-mail e nunca o UUID', () => {
      login('', 'maria.silva@heem.dev')
      expect(screen.getByText('maria.silva@heem.dev')).toBeInTheDocument()
      expect(screen.getByText('MS')).toBeInTheDocument()
      expect(screen.queryByText(new RegExp(uuid.slice(0, 8)))).not.toBeInTheDocument()
    })

    it('sem nome e sem e-mail mostra só o papel', () => {
      login('')
      expect(screen.getAllByText('Admin do Cliente')).toHaveLength(1)
      expect(screen.queryByText(new RegExp(uuid.slice(0, 8)))).not.toBeInTheDocument()
    })
  })
})
