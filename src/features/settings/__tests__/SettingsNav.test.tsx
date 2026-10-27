import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { DashboardSidebar } from '@/features/dashboard/components/DashboardSidebar'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import type { UserRole } from '@/features/auth/types'
import { WorkOrdersTabs } from '@/features/maintenance/components/WorkOrdersTabs'
import { SettingsNav } from '../components/SettingsNav'

function login(roles: UserRole[]) {
  clearAuthSession()
  setAuthSession('token', { id: 'user-1', name: 'Teste', roles, tenantId: 'tenant-1' })
}

afterEach(() => clearAuthSession())

describe('SettingsNav', () => {
  it('admin_cliente vê as quatro seções e a ativa tem aria-current', () => {
    login(['admin_cliente'])
    render(<MemoryRouter initialEntries={['/settings/sla-policy']}><SettingsNav /></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: 'Configurações' })
    expect(within(nav).getAllByRole('link')).toHaveLength(4)
    expect(screen.getByRole('link', { name: 'Política de SLA' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Categorias' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Usuários e papéis' })).toHaveAttribute('href', '/settings/users')
  })

  it('super_admin vê só Usuários e papéis', () => {
    login(['super_admin'])
    render(<MemoryRouter initialEntries={['/settings/users']}><SettingsNav /></MemoryRouter>)
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Usuários e papéis'])
  })

  it.each([['tecnico'], ['interno_hospital']] as [UserRole][])('%s não vê nada', (role) => {
    login([role])
    render(<MemoryRouter><SettingsNav /></MemoryRouter>)
    expect(screen.queryByRole('navigation', { name: 'Configurações' })).not.toBeInTheDocument()
  })
})

describe('menu lateral', () => {
  it.each([['admin_cliente'], ['super_admin']] as [UserRole][])('%s vê Configurações', (role) => {
    login([role])
    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Configurações' })).toHaveAttribute('href', '/settings')
  })

  it.each([['tecnico'], ['interno_hospital']] as [UserRole][])('%s não vê Configurações', (role) => {
    login([role])
    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'Configurações' })).not.toBeInTheDocument()
  })

  it('não lista mais os itens movidos', () => {
    login(['admin_cliente'])
    render(<MemoryRouter><DashboardSidebar /></MemoryRouter>)
    for (const name of ['Categorias', 'Política de SLA', 'Importação em lote', 'Usuários & Papéis', 'Planos preventivos', 'Campanha de preventiva']) {
      expect(screen.queryByRole('link', { name })).not.toBeInTheDocument()
    }
  })

  it('Ordens de Trabalho fica ativo nas três abas', () => {
    login(['admin_cliente'])
    for (const path of ['/work-orders', '/work-orders/rotinas', '/work-orders/campanhas/camp-1']) {
      const view = render(<MemoryRouter initialEntries={[path]}><DashboardSidebar /></MemoryRouter>)
      expect(screen.getByRole('link', { name: 'Ordens de Trabalho' })).toHaveAttribute('aria-current', 'page')
      view.unmount()
    }
  })
})

describe('WorkOrdersTabs', () => {
  it.each([
    ['/work-orders', 'OTs'],
    ['/work-orders/rotinas', 'Rotinas'],
    ['/work-orders/campanhas', 'Campanhas'],
  ])('em %s a aba ativa é %s', (path, active) => {
    render(<MemoryRouter initialEntries={[path]}><WorkOrdersTabs /></MemoryRouter>)
    const links = screen.getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual(['OTs', 'Rotinas', 'Campanhas'])
    expect(links.filter((a) => a.getAttribute('aria-current') === 'page').map((a) => a.textContent)).toEqual([active])
  })
})
